const mongoose = require('mongoose');
const crypto = require('node:crypto');
const flow = require('../services/orderFlow');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const User = require('../models/User');

const ownRestaurant = (req) => Restaurant.findOne({ owner: req.user.id });
const transitions = { CONFIRMED: 'PENDING_CONFIRMATION', REJECTED: 'PENDING_CONFIRMATION', PREPARING: 'CONFIRMED', READY_FOR_PICKUP: 'PREPARING' };
exports.create = async (req, res) => {
  const { restaurantId, items, address, phone, note = '' } = req.body || {};
  const requestKey = req.get('Idempotency-Key');
  if (!requestKey || !/^[\w-]{8,100}$/.test(requestKey) || !mongoose.isValidObjectId(restaurantId) || !Array.isArray(items) || !items.length || items.length > 50 || typeof address !== 'string' || address.trim().length < 5 || address.length > 300 || typeof phone !== 'string' || !/^\d{9,11}$/.test(phone) || typeof note !== 'string' || note.length > 500) {
    return res.status(400).json({ message: 'Thông tin đặt món không hợp lệ (địa chỉ, điện thoại, món hoặc mã yêu cầu)' });
  }
  const requestHash = crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
  const paymentMethod = req.body.paymentMethod || 'COD';
  if (!['COD', 'MOCK_PREPAID'].includes(paymentMethod) || !flow.coordinates(req.body.deliveryLocation)) return res.status(400).json({ message: 'Thanh toán hoặc tọa độ giao không hợp lệ' });
  const previous = await Order.findOne({ customer: req.user.id, requestKey });
  if (previous) { if (previous.requestHash && previous.requestHash !== requestHash) return res.status(409).json({ message: 'Mã yêu cầu đã dùng với nội dung khác' }); return res.json({ order: previous }); }
  const restaurant = await Restaurant.findOne({ _id: restaurantId, approvalStatus: 'approved', isOpen: true });
  if (!restaurant || !(await User.exists({ _id: restaurant.owner, status: { $ne: 'locked' } }))) return res.status(409).json({ message: 'Nhà hàng hiện không nhận đơn' });
  const ids = items.map(i => i?.menuItem);
  if (new Set(ids).size !== ids.length || items.some(i => !mongoose.isValidObjectId(i?.menuItem) || !Number.isInteger(i?.quantity) || i.quantity < 1 || i.quantity > 99)) return res.status(400).json({ message: 'Món hoặc số lượng không hợp lệ' });
  const menu = await MenuItem.find({ _id: { $in: ids }, restaurant: restaurantId, available: true });
  if (menu.length !== items.length) return res.status(409).json({ message: 'Có món đã hết hoặc không thuộc nhà hàng' });
  const snapshot = items.map(i => { const m = menu.find(m => m.id === i.menuItem); return { menuItem: m._id, name: m.name, unitPrice: m.price, quantity: i.quantity }; });
  const subtotal = snapshot.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const commissionAmount = Math.round(subtotal * 0.1);
  const deliveryLocation = req.body.deliveryLocation;
  if (deliveryLocation && !flow.coordinates(restaurant.location)) return res.status(409).json({ message: 'Quán chưa thiết lập tọa độ để tính phí giao' });
  const km = deliveryLocation ? flow.distance(restaurant.location, deliveryLocation) : 0;
  if (km > 30) return res.status(409).json({ message: 'Địa chỉ giao ngoài bán kính 30 km' });
  const deliveryFee = deliveryLocation ? 15000 + Math.ceil(Math.max(0, km - 2)) * 5000 : 0;
  if (req.body.expectedSubtotal !== undefined && req.body.expectedSubtotal !== subtotal) return res.status(409).json({ message: 'Giá món đã thay đổi; tải lại thực đơn và xác nhận giá mới' });
  const status = paymentMethod === 'MOCK_PREPAID' ? 'PENDING_PAYMENT' : 'PENDING_CONFIRMATION';
  const data = { requestHash, paymentMethod, status, deliveryLocation, restaurantLocation: restaurant.location, deliveryFee, totalAmount: subtotal + deliveryFee, outbox: [flow.outbox('Đơn mới: ' + status)], restaurant: restaurantId, customer: req.user.id, requestKey, items: snapshot, address: address.trim(), phone, note: note.trim(), subtotal, commissionAmount, restaurantNetAmount: subtotal - commissionAmount, history: [{ status, actor: req.user.id, at: new Date() }] };
  try { const order = await Order.create(data); res.status(201).json({ order }); }
  catch (err) { if (err.code !== 11000) throw err; const retry = await Order.findOne({ customer: req.user.id, requestKey }); if (retry?.requestHash !== requestHash) return res.status(409).json({ message: 'Mã yêu cầu đã dùng với nội dung khác' }); res.json({ order: retry }); }
};
exports.list = async (req, res) => {
  const r = await ownRestaurant(req);
  if (!r) return res.status(404).json({ message: 'Bạn chưa có nhà hàng' });
  const orders = await Order.find({ restaurant: r._id, status: { $ne: 'PENDING_PAYMENT' } }).sort({ createdAt: -1 }).limit(200);
  res.json({ orders });
};
exports.updateStatus = async (req, res) => {
  const { status, reason } = req.body || {};
  if (!Object.hasOwn(transitions, status) || (status === 'REJECTED' && (typeof reason !== 'string' || !reason.trim() || reason.length > 500))) return res.status(400).json({ message: 'Trạng thái hoặc lý do từ chối không hợp lệ' });
  if (!mongoose.isValidObjectId(req.params.orderId)) return res.status(404).json({ message: 'Không tìm thấy đơn' });
  const r = await ownRestaurant(req);
  if (!r) return res.status(404).json({ message: 'Bạn chưa có nhà hàng' });
  const existing = await Order.findOne({ _id: req.params.orderId, restaurant: r._id });
  const extra = status === 'REJECTED' && existing?.paymentState === 'PAID' ? { paymentState: 'REFUNDED' } : {};
  const order = await flow.transition({ _id: req.params.orderId, restaurant: r._id, status: transitions[status] }, status, req.user.id, status === 'REJECTED' ? reason.trim() : '', extra);
  if (!order) return res.status(409).json({ message: 'Đơn không thuộc quán hoặc đã chuyển trạng thái. Hãy tải lại.' });
  res.json({ order });
};
// SSE snapshots also recover changes missed while a client was disconnected. Querying MongoDB
// works across API processes and does not rely on a process-local notification bus.
exports.stream = async (req, res) => {
  const r = await ownRestaurant(req);
  if (!r) return res.status(404).json({ message: 'Bạn chưa có nhà hàng' });
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  let closed = false, timer, last = '';
  res.on('close', () => { closed = true; clearTimeout(timer); });
  const send = async () => {
    try {
      // Recheck account access during long-lived connections.
      const owner = await User.findById(req.user.id).select('role status');
      if (!owner || owner.status === 'locked' || owner.role !== 'restaurant' || req.authExpiresAt <= Date.now()) return res.end();
      const orders = await Order.find({ restaurant: r._id, status: { $ne: 'PENDING_PAYMENT' } }).sort({ createdAt: -1 }).limit(200).lean();
      const payload = JSON.stringify({ orders });
      if (!closed) { if (last !== payload) { res.write(`data: ${payload}\n\n`); last = payload; } else res.write(': heartbeat\n\n'); }
    } catch { if (!closed) { res.write('event: unavailable\ndata: {}\n\n'); res.end(); } }
    if (!closed && !res.writableEnded) timer = setTimeout(send, 2000);
  };
  await send();
};
const dateRange = (query) => {
  const parse = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!parse(query.from) || !parse(query.to) || query.from > query.to) return null;
  // Date inputs refer to calendar days in Vietnam, inclusive in the UI.
  return { $gte: new Date(query.from + 'T00:00:00+07:00'), $lt: new Date(new Date(query.to + 'T00:00:00+07:00').getTime() + 86400000) };
};
exports.report = async (req, res) => {
  const range = dateRange(req.query);
  if (!range) return res.status(400).json({ message: 'Khoảng ngày không hợp lệ' });
  const r = await ownRestaurant(req);
  if (!r) return res.status(404).json({ message: 'Bạn chưa có nhà hàng' });
  const orders = await Order.find({ restaurant: r._id, status: 'COMPLETED', completedAt: range }).sort({ completedAt: -1 }).lean();
  const totals = orders.reduce((sum, o) => ({ count: sum.count + 1, subtotal: sum.subtotal + o.subtotal, commissionAmount: sum.commissionAmount + o.commissionAmount, restaurantNetAmount: sum.restaurantNetAmount + o.restaurantNetAmount }), { count: 0, subtotal: 0, commissionAmount: 0, restaurantNetAmount: 0 });
  // History is selected by finalization date, independent of the order completion range.
  const settled = await Order.find({ restaurant: r._id, status: 'COMPLETED', 'settlement.finalizedAt': range }).sort({ 'settlement.finalizedAt': -1 }).lean();
  const groups = new Map();
  for (const o of settled) { const key = o.settlement.reference; if (!groups.has(key)) groups.set(key, { reference: key, finalizedAt: o.settlement.finalizedAt, amount: 0, orders: [] }); const group = groups.get(key); group.amount += o.restaurantNetAmount; group.orders.push({ id: o._id, amount: o.restaurantNetAmount, paidAt: o.settlement.paidAt || null }); }
  res.json({ totals, orders, settlements: [...groups.values()] });
};
