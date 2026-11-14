const { hasRole } = require('../utils/accountRoles');
const crypto = require('node:crypto');
const Order = require('../models/Order');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Driver = require('../models/DriverProfile');
const Notification = require('../models/Notification');
const { publish } = require('./realtime');

const ACTIVE = ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'DELIVERING'];
const statusLabels = { PENDING_PAYMENT: 'Chờ thanh toán giả lập', PENDING_CONFIRMATION: 'Chờ nhà hàng xác nhận', CONFIRMED: 'Đã xác nhận', PREPARING: 'Đang làm món', READY_FOR_PICKUP: 'Sẵn sàng giao', PICKED_UP: 'Đã lấy hàng', DELIVERING: 'Đang giao', COMPLETED: 'Giao thành công', CANCELLED: 'Đã hủy', REJECTED: 'Nhà hàng từ chối', DELIVERY_FAILED: 'Giao thất bại' };
function outbox(title) { return { eventId: crypto.randomUUID(), title }; }
function transition(filter, status, actor, reason = '', extra = {}) {
  const event = outbox(`Đơn hàng: ${statusLabels[status] || status}`);
  return Order.findOneAndUpdate(filter, { $set: { status, ...extra }, $push: { history: { status, actor, at: new Date(), reason }, outbox: event } }, { new: true, runValidators: true });
}
function coordinates(value) { return value && typeof value.latitude === 'number' && typeof value.longitude === 'number' && Number.isFinite(value.latitude) && Number.isFinite(value.longitude) && Math.abs(value.latitude) <= 90 && Math.abs(value.longitude) <= 180; }
function distance(a, b) {
  const rad = d => d * Math.PI / 180;
  const p = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(p), Math.sqrt(1 - p));
}
async function recipients(order) {
  const r = await Restaurant.findById(order.restaurant).select('owner');
  return [...new Set([order.customer, order.status === 'PENDING_PAYMENT' ? null : r?.owner, order.driver].filter(Boolean).map(String))];
}
async function deliverOutbox(order) {
  const users = await recipients(order);
  if (order.financialHold || order.dispatchStatus === 'NO_DRIVER') { const admins = await User.find({ role: 'admin', status: { $ne: 'locked' } }).select('_id'); users.push(...admins.map(a => a.id)); }
  for (const e of order.outbox.filter(e => !e.publishedAt)) {
    for (const user of users) {
      await Notification.updateOne({ user, eventId: e.eventId }, { $setOnInsert: { order: order._id, title: e.title } }, { upsert: true });
      publish(user, { type: 'order.changed', orderId: order.id, status: order.status, eventId: e.eventId });
    }
    await Order.updateOne({ _id: order._id, 'outbox.eventId': e.eventId }, { $set: { 'outbox.$.publishedAt': new Date() } });
  }
}
async function dispatch(order) {
  if (!['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(order.status) || order.driver) return;
  const now = new Date();
  if (order.offers.some(o => o.status === 'PENDING' && o.expiresAt > now)) return;
  await Order.updateOne({ _id: order._id }, { $set: { 'offers.$[offer].status': 'EXPIRED' } }, { arrayFilters: [{ 'offer.status': 'PENDING', 'offer.expiresAt': { $lte: now } }] });
  const rejected = order.offers.map(o => o.driver);
  const busy = await Order.distinct('driver', { status: { $in: ACTIVE }, driver: { $exists: true } });
  const locked = await User.distinct('_id', { $or: [{ status: 'locked' }, { role: 'admin' }, { activeRole: { $exists: true, $ne: 'driver' } }] });
  const query = { approvalStatus: 'approved', online: true, user: { $nin: [order.customer, ...busy, ...locked, ...rejected] }, locationAt: { $gte: new Date(Date.now() - 60000) } };
  if (!coordinates(order.restaurantLocation)) {
    await Order.updateOne({ _id: order._id, driver: { $exists: false } }, { $set: { dispatchStatus: 'NO_DRIVER', nextDispatchAt: new Date(Date.now() + 30000) } }); return;
  }
  query.location = { $near: { $geometry: { type: 'Point', coordinates: [order.restaurantLocation.longitude, order.restaurantLocation.latitude] }, $maxDistance: Math.min(15000, 3000 + (order.dispatchAttempts || 0) * 3000) } };
  const driver = await Driver.findOne(query);
  if (!driver) {
    await Order.updateOne({ _id: order._id }, { $inc: { dispatchAttempts: 1 } });
    const updated = await Order.findOneAndUpdate({ _id: order._id, driver: { $exists: false }, dispatchStatus: { $ne: 'NO_DRIVER' } }, { $set: { dispatchStatus: 'NO_DRIVER', nextDispatchAt: new Date(Date.now() + 30000) }, $push: { outbox: outbox('Chưa tìm được tài xế phù hợp; hệ thống sẽ tìm lại.') } }, { new: true });
    if (!updated) await Order.updateOne({ _id: order._id }, { $set: { nextDispatchAt: new Date(Date.now() + 30000) } });
    return;
  }
  const offered = await Order.findOneAndUpdate({ _id: order._id, driver: { $exists: false }, status: { $in: ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'] }, offers: { $not: { $elemMatch: { status: 'PENDING', expiresAt: { $gt: now } } } } }, { $set: { dispatchStatus: 'OFFERED', nextDispatchAt: new Date(Date.now() + 30000) }, $push: { offers: { driver: driver.user, status: 'PENDING', expiresAt: new Date(Date.now() + 30000) } } }, { new: true });
  if (offered) publish(driver.user.toString(), { type: 'driver.offer', orderId: offered.id });
}
// Each order is its own atomic money ledger and settlement link. Daily reference is
// deterministic: recovery retries cannot include an order twice or move a finalized order.
async function settleCompleted(from, to) {
  const orders = await Order.find({ driver: { $type: 'objectId' }, totalAmount: { $gte: 0 }, status: 'COMPLETED', settlementHold: { $ne: true }, financialHold: { $ne: true }, completedAt: { $gte: from, $lt: to }, $or: [{ paymentMethod: 'MOCK_PREPAID', paymentState: 'PAID' }, { paymentMethod: 'COD', codConfirmed: true }] });
  for (const o of orders) {
    const day = new Date(o.completedAt.getTime() + 7 * 3600000).toISOString().slice(0, 10);
    const reference = `DAY-${day}`;
    await Order.updateOne({ _id: o._id, status: 'COMPLETED', settlementHold: { $ne: true }, financialHold: { $ne: true }, 'settlement.reference': { $exists: false } }, { $set: { settlement: { reference, finalizedAt: new Date() }, driverSettlement: { reference, finalizedAt: new Date(), amount: o.paymentMethod === 'COD' ? o.deliveryFee - o.totalAmount : o.deliveryFee } }, $push: { outbox: outbox('Đơn đã được chốt đối soát; chưa ghi nhận chuyển tiền.') } });
  }
}
let ticking = false;
async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    const expired = await Order.find({ status: { $in: ['PENDING_PAYMENT', 'PENDING_CONFIRMATION'] }, createdAt: { $lt: new Date(Date.now() - 15 * 60000) } }).limit(100);
    for (const o of expired) await transition({ _id: o._id, status: o.status }, 'CANCELLED', o.customer, 'Hết hạn thanh toán/xác nhận', o.paymentState === 'PAID' ? { paymentState: 'REFUNDED' } : {});
    const assigned = await Order.find({ status: { $in: ACTIVE }, driver: { $exists: true } }).limit(100);
    for (const o of assigned) {
      const driver = await Driver.findOne({ user: o.driver });
      const user = await User.findById(o.driver).select('role roles activeRole status');
      const stale = !driver?.locationAt || driver.locationAt < new Date(Date.now() - 120000) || user?.status === 'locked' || !hasRole(user, 'driver') || (user?.activeRole && user.activeRole !== 'driver') || driver.approvalStatus !== 'approved';
      if (!stale) continue;
      if (['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(o.status)) {
        await Order.updateOne({ _id: o._id, driver: o.driver, status: { $in: ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'] } }, { $unset: { driver: 1 }, $set: { dispatchStatus: 'WAITING', nextDispatchAt: new Date() }, $push: { outbox: outbox('Tài xế mất kết nối trước lấy hàng; đang tìm người khác') } });
      } else {
        await Order.updateOne({ _id: o._id, status: { $in: ['PICKED_UP', 'DELIVERING'] }, financialHold: false }, { $set: { financialHold: true, incident: { description: 'Tài xế mất kết nối sau lấy hàng', reportedAt: new Date() } }, $push: { outbox: outbox('Sự cố: tài xế mất kết nối sau lấy hàng, cần admin xử lý') } });
      }
    }
    const pending = await Order.find({ status: { $in: ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'] }, driver: { $exists: false }, $or: [{ nextDispatchAt: { $lte: new Date() } }, { nextDispatchAt: { $exists: false } }] }).limit(100);
    for (const order of pending) await dispatch(order);
    const undelivered = await Order.find({ outbox: { $elemMatch: { publishedAt: { $exists: false } } } }).limit(100);
    for (const order of undelivered) await deliverOutbox(order);
    const todayStart = new Date(new Date(new Date().getTime() + 7 * 3600000).toISOString().slice(0, 10) + 'T00:00:00+07:00');
    await settleCompleted(new Date(0), todayStart);
  } finally { ticking = false; }
}
function startWorker() { const timer = setInterval(() => tick().catch(e => console.error('Order worker:', e.message)), 2000); timer.unref(); return () => clearInterval(timer); }
module.exports = { ACTIVE, transition, coordinates, distance, outbox, recipients, deliverOutbox, dispatch, tick, startWorker, settleCompleted };
