const mongoose = require('mongoose');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const Driver = require('../models/DriverProfile');
const Review = require('../models/Review');
const Adjustment = require('../models/FinancialAdjustment');
const Notification = require('../models/Notification');
const { logAudit } = require('../utils/audit');
const flow = require('../services/orderFlow');
const { publish } = require('../services/realtime');
const fail = (res, status, message) => res.status(status).json({ message });
const clean = (text, min = 1, max = 500) => typeof text === 'string' && text.trim().length >= min && text.length <= max;
const dayRange = query => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(query.from || '') || !/^\d{4}-\d{2}-\d{2}$/.test(query.to || '') || query.from > query.to) return null;
  const a = new Date(query.from + 'T00:00:00+07:00'), b = new Date(query.to + 'T00:00:00+07:00');
  if (!Number.isFinite(a.getTime()) || !Number.isFinite(b.getTime()) || new Date(query.from + 'T00:00:00Z').toISOString().slice(0,10) !== query.from || new Date(query.to + 'T00:00:00Z').toISOString().slice(0,10) !== query.to) return null;
  return { $gte: a, $lt: new Date(b.getTime() + 86400000) };
};
async function visibleOrder(req) {
  const o = await Order.findById(req.params.id);
  if (!o) return null;
  if (req.user.role === 'admin' || String(o.customer) === req.user.id || String(o.driver) === req.user.id) return o;
  if (req.user.role === 'restaurant' && await Restaurant.exists({ _id: o.restaurant, owner: req.user.id })) return o;
  return null;
}
function safeOrder(o) { const data = o.toObject ? o.toObject() : o; delete data.outbox; delete data.requestHash; delete data.offers; return data; }
exports.myOrders = async (req, res) => { const orders = await Order.find({ customer: req.user.id }).sort({ createdAt: -1 }).limit(200); res.json({ orders: orders.map(safeOrder) }); };
exports.orderDetail = async (req, res) => {
  const o = await visibleOrder(req); if (!o) return fail(res, 404, 'Không tìm thấy đơn');
  const restaurant = await Restaurant.findById(o.restaurant).select('name phone address location');
  const driver = o.driver ? await User.findById(o.driver).select('name phone') : null;
  let location = null;
  if (o.driver && o.status === 'DELIVERING') { const profile = await Driver.findOne({ user: o.driver }); if (profile?.location?.coordinates?.length === 2) location = { longitude: profile.location.coordinates[0], latitude: profile.location.coordinates[1], at: profile.locationAt }; }
  const review = await Review.findOne({ order: o._id });
  res.json({ order: safeOrder(o), restaurant, driver, location, review });
};
exports.cancel = async (req, res) => {
  if (!clean(req.body?.reason)) return fail(res, 400, 'Vui lòng nhập lý do hủy');
  const order = await Order.findOne({ _id: req.params.id, customer: req.user.id });
  if (!order) return fail(res, 404, 'Không tìm thấy đơn');
  if (order.status === 'CANCELLED') return res.json({ order: safeOrder(order) });
  if (!['PENDING_PAYMENT', 'PENDING_CONFIRMATION'].includes(order.status)) return fail(res, 409, 'Chỉ được tự hủy trước khi nhà hàng xác nhận');
  const updated = await flow.transition({ _id: order._id, customer: req.user.id, status: order.status }, 'CANCELLED', req.user.id, req.body.reason.trim(), order.paymentState === 'PAID' ? { paymentState: 'REFUNDED' } : {});
  if (!updated) return fail(res, 409, 'Chỉ được tự hủy trước khi nhà hàng xác nhận');
  res.json({ order: safeOrder(updated) });
};
exports.mockPayment = async (req, res) => {
  if (!['success', 'fail'].includes(req.body?.outcome)) return fail(res, 400, 'Kết quả giả lập không hợp lệ');
  const order = await Order.findOne({ _id: req.params.id, customer: req.user.id, paymentMethod: 'MOCK_PREPAID' });
  if (!order) return fail(res, 404, 'Không tìm thấy giao dịch giả lập của bạn');
  if (order.status === 'PENDING_CONFIRMATION' && order.paymentState === 'PAID') return res.json({ order: safeOrder(order), simulated: true });
  if (order.status !== 'PENDING_PAYMENT') return fail(res, 409, 'Đơn không còn chờ thanh toán');
  if (req.body.outcome === 'fail') return res.json({ order: safeOrder(order), simulated: true, message: 'Thanh toán giả lập thất bại; có thể thử lại trước khi hết hạn' });
  const updated = await flow.transition({ _id: order._id, status: 'PENDING_PAYMENT', paymentState: 'UNPAID' }, 'PENDING_CONFIRMATION', req.user.id, 'Thanh toán giả lập thành công', { paymentState: 'PAID' });
  if (!updated) return fail(res, 409, 'Giao dịch vừa được xử lý');
  res.json({ order: safeOrder(updated), simulated: true });
};
exports.review = async (req, res) => {
  const { restaurantRating, driverRating, comment = '' } = req.body || {};
  if (!Number.isInteger(restaurantRating) || restaurantRating < 1 || restaurantRating > 5 || (driverRating !== undefined && (!Number.isInteger(driverRating) || driverRating < 1 || driverRating > 5)) || typeof comment !== 'string' || comment.length > 1000) return fail(res, 400, 'Điểm phải từ 1 đến 5, nhận xét tối đa 1000 ký tự');
  const order = await Order.findOne({ _id: req.params.id, customer: req.user.id, status: 'COMPLETED' });
  if (!order) return fail(res, 409, 'Chỉ đánh giá đơn đã giao thành công của mình');
  try { const review = await Review.create({ order: order._id, customer: req.user.id, restaurant: order.restaurant, driver: order.driver, restaurantRating, driverRating, comment: comment.trim() }); res.status(201).json({ review }); }
  catch (e) { if (e.code === 11000) return fail(res, 409, 'Đơn đã được đánh giá'); throw e; }
};
exports.restaurantReviews = async (req, res) => { const reviews = await Review.find({ restaurant: req.params.id }).select('-customer').sort({ createdAt: -1 }).limit(100); res.json({ reviews }); };
exports.notifications = async (req, res) => res.json({ notifications: await Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(100) });
exports.readNotification = async (req, res) => { const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { $set: { readAt: new Date() } }, { new: true }); if (!n) return fail(res, 404, 'Không tìm thấy thông báo'); res.json({ notification: n }); };
exports.driverProfile = async (req, res) => {
  const profile = await Driver.findOneAndUpdate({ user: req.user.id }, { $setOnInsert: { online: false } }, { new: true, upsert: true });
  const jobs = await Order.find({ driver: req.user.id }).sort({ createdAt: -1 }).limit(100);
  const offers = await Order.find({ driver: { $exists: false }, status: { $in: ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'] }, offers: { $elemMatch: { driver: req.user.id, status: 'PENDING', expiresAt: { $gt: new Date() } } } }).select('restaurant restaurantLocation deliveryLocation deliveryFee totalAmount paymentMethod offers createdAt');
  // Offers deliberately omit customer address/phone until accepted.
  res.json({ profile, jobs: jobs.map(safeOrder), offers: offers.map(o => ({ _id: o._id, restaurant: o.restaurant, restaurantLocation: o.restaurantLocation, deliveryFee: o.deliveryFee, paymentMethod: o.paymentMethod, expiresAt: o.offers.find(x => String(x.driver) === req.user.id && x.status === 'PENDING')?.expiresAt })) });
};
exports.availability = async (req, res) => {
  if (typeof req.body?.online !== 'boolean') return fail(res, 400, 'online phải là true hoặc false');
  const profile = await Driver.findOne({ user: req.user.id });
  if (!profile || profile.approvalStatus !== 'approved') return fail(res, 403, 'Tài xế cần được admin duyệt');
  if (req.body.online && (!profile.locationAt || profile.locationAt < new Date(Date.now() - 60000))) return fail(res, 409, 'Cần cập nhật GPS trong vòng 60 giây để online');
  profile.online = req.body.online; await profile.save(); res.json({ profile });
};
exports.location = async (req, res) => {
  if (!flow.coordinates(req.body) || !Number.isSafeInteger(req.body.sequence) || req.body.sequence < 1) return fail(res, 400, 'Tọa độ hoặc sequence không hợp lệ');
  const profile = await Driver.findOneAndUpdate({ user: req.user.id, locationSequence: { $lt: req.body.sequence } }, { $set: { location: { type: 'Point', coordinates: [req.body.longitude, req.body.latitude] }, locationAt: new Date(), locationSequence: req.body.sequence } }, { new: true });
  if (!profile) return fail(res, 409, 'Hãy mở hồ sơ tài xế và gửi vị trí có sequence mới hơn');
  const order = await Order.findOne({ driver: req.user.id, status: 'DELIVERING' });
  if (order) publish(order.customer.toString(), { type: 'driver.location', orderId: order.id, latitude: req.body.latitude, longitude: req.body.longitude, at: profile.locationAt });
  res.json({ locationAt: profile.locationAt, sequence: profile.locationSequence });
};
exports.offer = async (req, res) => {
  const profile = await Driver.findOne({ user: req.user.id, approvalStatus: 'approved', online: true, locationAt: { $gt: new Date(Date.now() - 60000) } });
  if (!profile) return fail(res, 409, 'Cần được duyệt, online và có GPS mới để nhận/từ chối cuốc');
  const filter = { _id: req.params.id, driver: { $exists: false }, status: { $in: ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'] }, offers: { $elemMatch: { driver: req.user.id, status: 'PENDING', expiresAt: { $gt: new Date() } } } };
  const accept = req.body?.action === 'accept';
  if (!['accept', 'reject'].includes(req.body?.action)) return fail(res, 400, 'Hành động không hợp lệ');
  try {
    const order = await Order.findOneAndUpdate(filter, { $set: { 'offers.$.status': accept ? 'ACCEPTED' : 'REJECTED', ...(accept ? { driver: req.user.id, dispatchStatus: 'ASSIGNED' } : { nextDispatchAt: new Date() }) }, $push: { outbox: flow.outbox(accept ? 'Tài xế đã nhận giao đơn' : 'Tài xế từ chối cuốc, đang tìm người khác') } }, { new: true });
    if (!order) { const retry = accept ? await Order.findOne({ _id: req.params.id, driver: req.user.id, status: { $in: flow.ACTIVE } }) : null; if (retry) return res.json({ order: safeOrder(retry) }); return fail(res, 409, 'Cuốc đã hết hạn hoặc đã có người nhận'); }
    res.json(accept ? { order: safeOrder(order) } : { message: 'Đã từ chối cuốc' });
  } catch (e) { if (e.code === 11000) return fail(res, 409, 'Bạn đang có đơn khác chưa giao xong'); throw e; }
};
exports.driverStatus = async (req, res) => {
  if (!await Driver.exists({ user: req.user.id, approvalStatus: 'approved' })) return fail(res, 403, 'Tài xế chưa được duyệt hoặc đã bị thu hồi duyệt');
  const map = { PICKED_UP: 'READY_FOR_PICKUP', DELIVERING: 'PICKED_UP', COMPLETED: 'DELIVERING' };
  const target = req.body?.status;
  if (!Object.hasOwn(map, target)) return fail(res, 400, 'Trạng thái không hợp lệ');
  const current = await Order.findOne({ _id: req.params.id, driver: req.user.id });
  if (!current) return fail(res, 404, 'Không tìm thấy cuốc của bạn');
  if (current.status === target) return res.json({ order: safeOrder(current) });
  const extra = target === 'COMPLETED' ? { completedAt: new Date(), ...(current.paymentMethod === 'COD' ? { codConfirmed: true, paymentState: 'PAID' } : {}) } : {};
  if (target === 'COMPLETED' && current.paymentMethod === 'COD' && req.body.codCollectedAmount !== current.totalAmount) return fail(res, 409, 'Số tiền COD thu phải đúng tổng tiền đơn; báo sự cố nếu sai lệch');
  const order = await flow.transition({ _id: current._id, driver: req.user.id, status: map[target], financialHold: { $ne: true } }, target, req.user.id, '', extra);
  if (!order) return fail(res, 409, 'Sai bước giao hàng hoặc đơn đang có sự cố cần xử lý');
  res.json({ order: safeOrder(order) });
};
exports.issue = async (req, res) => {
  if (!clean(req.body?.description, 5)) return fail(res, 400, 'Mô tả sự cố từ 5 đến 500 ký tự');
  const order = await Order.findOneAndUpdate({ _id: req.params.id, driver: req.user.id, status: { $in: flow.ACTIVE }, 'settlement.reference': { $exists: false } }, { $set: { incident: { description: req.body.description.trim(), reportedAt: new Date() }, financialHold: true }, $push: { outbox: flow.outbox('Tài xế báo sự cố; đơn đang tạm giữ để admin xử lý') } }, { new: true });
  if (!order) return fail(res, 409, 'Không thể báo sự cố ở trạng thái này');
  res.json({ order: safeOrder(order) });
};
exports.earnings = async (req, res) => {
  const range = dayRange(req.query); if (!range) return fail(res, 400, 'Khoảng ngày không hợp lệ');
  const orders = await Order.find({ driver: req.user.id, status: 'COMPLETED', completedAt: range }).sort({ completedAt: -1 });
  const totals = orders.reduce((s, o) => ({ count: s.count + 1, earning: s.earning + o.deliveryFee, codCollected: s.codCollected + (o.paymentMethod === 'COD' ? o.totalAmount : 0) }), { count: 0, earning: 0, codCollected: 0 });
  totals.netPayable = totals.earning - totals.codCollected;
  res.json({ totals, orders: orders.map(safeOrder) });
};
exports.drivers = async (req, res) => {
  const profiles = await Driver.find().populate('user', 'name email phone status').sort({ createdAt: -1 }).limit(200); res.json({ drivers: profiles });
};
exports.reviewDriver = async (req, res) => {
  if (!['approved', 'rejected'].includes(req.body?.status) || !clean(req.body?.reason, 5, 300)) return fail(res, 400, 'Cần quyết định duyệt/từ chối và lý do 5–300 ký tự');
  const profile = await Driver.findOneAndUpdate({ user: req.params.id }, { $set: { approvalStatus: req.body.status, reviewReason: req.body.reason, ...(req.body.status === 'rejected' ? { online: false } : {}) } }, { new: true });
  if (!profile) return fail(res, 404, 'Tài xế chưa tạo hồ sơ');
  await logAudit({ actor: req.user.id, action: 'DRIVER_REVIEW', entityType: 'user', entityId: req.params.id, after: req.body.status, reason: req.body.reason }); res.json({ profile });
};
exports.adminOrders = async (req, res) => {
  const filter = {}; if (req.query.status) filter.status = req.query.status;
  res.json({ orders: (await Order.find(filter).sort({ createdAt: -1 }).limit(200)).map(safeOrder) });
};
exports.adminAction = async (req, res) => {
  const { action, reason } = req.body || {};
  if (!clean(reason, 5, 300)) return fail(res, 400, 'Lý do từ 5 đến 300 ký tự');
  let order = await Order.findById(req.params.id); if (!order) return fail(res, 404, 'Không tìm thấy đơn');
  if (action === 'redispatch') {
    if (!['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(order.status)) return fail(res, 409, 'Chỉ gán lại trước khi lấy hàng');
    order = await Order.findOneAndUpdate({ _id: order._id, status: { $in: ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'] } }, { $unset: { driver: 1 }, $set: { dispatchStatus: 'WAITING', offers: [], nextDispatchAt: new Date() }, $push: { outbox: flow.outbox('Admin yêu cầu tìm lại tài xế: ' + reason) } }, { new: true });
  } else if (action === 'resolve') {
    order = await Order.findOneAndUpdate({ _id: order._id, financialHold: true, 'settlement.reference': { $exists: false } }, { $set: { financialHold: false, 'incident.resolvedAt': new Date(), 'incident.resolution': reason }, $push: { outbox: flow.outbox('Sự cố được xử lý: ' + reason) } }, { new: true });
  } else if (action === 'cancel' || action === 'fail') {
    const allowed = action === 'cancel' ? ['PENDING_PAYMENT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'] : ['PICKED_UP', 'DELIVERING'];
    order = await flow.transition({ _id: order._id, status: { $in: allowed } }, action === 'cancel' ? 'CANCELLED' : 'DELIVERY_FAILED', req.user.id, reason, { financialHold: false, ...(order.paymentState === 'PAID' ? { paymentState: 'REFUNDED' } : {}) });
  } else return fail(res, 400, 'Hành động không hợp lệ');
  if (!order) return fail(res, 409, 'Đơn vừa đổi trạng thái hoặc không đủ điều kiện');
  await logAudit({ actor: req.user.id, action: 'ORDER_' + action.toUpperCase(), entityType: 'order', entityId: order._id, reason });
  res.json({ order: safeOrder(order) });
};
exports.settlements = async (req, res) => {
  const filter = { status: 'COMPLETED', 'settlement.reference': { $exists: true } };
  if (req.user.role === 'restaurant') { const r = await Restaurant.findOne({ owner: req.user.id }); if (!r) return fail(res, 404, 'Chưa có quán'); filter.restaurant = r._id; }
  if (req.user.role === 'driver') filter.driver = req.user.id;
  const orders = await Order.find(filter).sort({ completedAt: -1 }).limit(500);
  const adjustments = await Adjustment.find(req.user.role === 'admin' ? {} : { user: req.user.id }).sort({ createdAt: -1 }).limit(200);
  res.json({ orders: orders.map(safeOrder), adjustments, simulated: true });
};
exports.finalize = async (req, res) => {
  const range = dayRange(req.body || {}); if (!range) return fail(res, 400, 'Khoảng ngày không hợp lệ');
  await flow.settleCompleted(range.$gte, range.$lt);
  await logAudit({ actor: req.user.id, action: 'SETTLEMENT_FINALIZE', entityType: 'user', entityId: req.user.id, reason: `${req.body.from} → ${req.body.to}` });
  res.json({ message: 'Đã chốt các đơn đủ điều kiện; mỗi đơn chỉ tính một lần. Chưa ghi nhận thu/chi.' });
};
exports.transfer = async (req, res) => {
  const { party, amount } = req.body || {};
  if (!['restaurant', 'driver'].includes(party) || !Number.isSafeInteger(amount)) return fail(res, 400, 'Bên và số tiền không hợp lệ');
  const key = party === 'restaurant' ? 'settlement' : 'driverSettlement';
  const order = await Order.findById(req.params.id); if (!order) return fail(res, 404, 'Không tìm thấy khoản đối soát');
  const expected = party === 'restaurant' ? order.restaurantNetAmount : order.driverSettlement?.amount;
  if (!order[key]?.reference || expected !== amount || order.financialHold) return fail(res, 409, 'Chỉ ghi nhận đúng toàn bộ khoản đã chốt, không bị giữ lại');
  const updated = await Order.findOneAndUpdate({ _id: order._id, [`${key}.reference`]: order[key].reference, [`${key}.paidAt`]: { $exists: false }, financialHold: { $ne: true } }, { $set: { [`${key}.paidAt`]: new Date() }, $push: { outbox: flow.outbox(`Ghi nhận ${party === 'driver' && amount < 0 ? 'thu' : 'chi'} đối soát giả lập cho ${party}`) } }, { new: true });
  await logAudit({ actor: req.user.id, action: 'SETTLEMENT_TRANSFER_SIMULATED', entityType: 'order', entityId: order._id, reason: `${party}: ${amount}` });
  res.json({ order: safeOrder(updated || order), simulated: true });
};
exports.adminReport = async (req, res) => {
  const range = dayRange(req.query); if (!range) return fail(res, 400, 'Khoảng ngày không hợp lệ');
  const orders = await Order.find({ createdAt: range });
  const completed = await Order.find({ status: 'COMPLETED', completedAt: range });
  const byStatus = {}; for (const o of orders) byStatus[o.status] = (byStatus[o.status] || 0) + 1;
  const drivers = {};
  for (const o of completed) { const id = String(o.driver); if (!drivers[id]) drivers[id] = { driverId: id, completed: 0, earning: 0 }; drivers[id].completed++; drivers[id].earning += o.deliveryFee; }
  res.json({ totalOrders: orders.length, completed: completed.length, revenue: completed.reduce((s, o) => s + o.subtotal, 0), commission: completed.reduce((s, o) => s + o.commissionAmount, 0), deliveryFees: completed.reduce((s, o) => s + o.deliveryFee, 0), byStatus, drivers: Object.values(drivers), noDriver: orders.filter(o => o.dispatchStatus === 'NO_DRIVER' && flow.ACTIVE.includes(o.status)).length });
};
exports.adjust = async (req, res) => {
  const { party, amount, reference, reason } = req.body || {};
  if (!['restaurant','driver'].includes(party) || !Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount) > 100000000 || !clean(reference, 5, 100) || !clean(reason, 5, 500)) return fail(res, 400, 'Khoản điều chỉnh cần bên, số tiền nguyên khác 0, mã tham chiếu và lý do hợp lệ');
  const order = await Order.findById(req.params.id);
  if (!order?.settlement?.reference) return fail(res, 409, 'Chỉ tạo điều chỉnh riêng cho đơn đã chốt, không sửa số kỳ cũ');
  const restaurant = await Restaurant.findById(order.restaurant).select('owner');
  const user = party === 'restaurant' ? restaurant?.owner : order.driver;
  if (!user) return fail(res, 409, 'Đơn chưa có đối tác tương ứng');
  const existing = await Adjustment.findOne({ reference, party });
  if (existing) {
    if (String(existing.order) !== order.id || existing.amount !== amount || existing.reason !== reason) return fail(res, 409, 'Mã tham chiếu đã dùng với nội dung khác');
    return res.json({ adjustment: existing });
  }
  try { const adjustment = await Adjustment.create({ order: order._id, user, actor: req.user.id, party, amount, reference, reason }); res.status(201).json({ adjustment }); }
  catch (e) { if (e.code === 11000) return fail(res, 409, 'Khoản điều chỉnh đã được tạo'); throw e; }
};
exports.payAdjustment = async (req, res) => {
  const adjustment = await Adjustment.findById(req.params.id);
  if (!adjustment) return fail(res, 404, 'Không tìm thấy khoản điều chỉnh');
  if (req.body?.amount !== adjustment.amount) return fail(res, 409, 'Chỉ ghi nhận toàn bộ số tiền điều chỉnh');
  const updated = await Adjustment.findOneAndUpdate({ _id: adjustment._id, paidAt: { $exists: false } }, { $set: { paidAt: new Date() } }, { new: true });
  res.json({ adjustment: updated || adjustment, simulated: true });
};
exports.dayRange = dayRange;
