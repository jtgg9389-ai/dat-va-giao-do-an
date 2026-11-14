const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Restaurant = require('../src/models/Restaurant');
const MenuItem = require('../src/models/MenuItem');
const Order = require('../src/models/Order');
const app = require('../src/app');
let server, base, owner, otherOwner, customer, restaurant, otherRestaurant, item;
const token = user => jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
async function request(path, user, method = 'GET', body, key) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}), ...(key ? { 'Idempotency-Key': key } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}
const orderBody = () => ({ restaurantId: restaurant.id, items: [{ menuItem: item.id, quantity: 2 }], address: '123 Duong Thu Nghiem', phone: '0901234567', deliveryLocation: { latitude: 10.771, longitude: 106.691 } });
async function createOrder() { const result = await request('/api/orders', customer, 'POST', orderBody(), crypto.randomUUID()); assert.equal(result.status, 201); return result.data.order; }
before(async () => {
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  // Unique test database; never drop the application's development database.
  const dbName = 'restaurant_test_' + crypto.randomBytes(8).toString('hex');
  await mongoose.connect(process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017', { dbName });
  await Order.init();
  [owner, otherOwner, customer] = await User.create([
    { name: 'Quán A', email: 'owner@test.invalid', password: 'unused', role: 'restaurant' },
    { name: 'Quán B', email: 'other@test.invalid', password: 'unused', role: 'restaurant' },
    { name: 'Khách', email: 'customer@test.invalid', password: 'unused', role: 'customer' },
  ]);
  restaurant = await Restaurant.create({ owner: owner._id, name: 'Quán A', address: 'Dia chi quan A', approvalStatus: 'approved', location: { latitude: 10.77, longitude: 106.69 } });
  otherRestaurant = await Restaurant.create({ owner: otherOwner._id, name: 'Quán B', address: 'Dia chi quan B', approvalStatus: 'approved', location: { latitude: 10.77, longitude: 106.69 } });
  item = await MenuItem.create({ restaurant: restaurant._id, name: 'Cơm gà', price: 35000 });
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } if (mongoose.connection.name?.startsWith('restaurant_test_')) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

test('menu CRUD and availability are scoped to the restaurant owner', async () => {
  let result = await request('/api/restaurants/mine', owner); assert.equal(result.status, 200); assert.ok(result.data.menu.length);
  result = await request('/api/restaurants/mine/menu', owner, 'POST', { name: 'Trà đá', price: 5000 }); assert.equal(result.status, 201); const id = result.data.item._id;
  assert.equal((await request(`/api/restaurants/mine/menu/${id}`, otherOwner, 'PUT', { price: 1 })).status, 404);
  assert.equal((await request(`/api/restaurants/mine/menu/${id}`, owner, 'PUT', { available: 'false' })).status, 400);
  result = await request(`/api/restaurants/mine/menu/${id}`, owner, 'PUT', { available: false, price: 6000 }); assert.equal(result.data.item.available, false); assert.equal(result.data.item.price, 6000);
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aR9sAAAAASUVORK5CYII=';
  result = await request(`/api/restaurants/mine/menu/${id}`, owner, 'PUT', { image });
  assert.equal(result.status, 200); assert.equal(result.data.item.image, image);
  assert.equal((await request(`/api/restaurants/mine/menu/${id}`, otherOwner, 'PUT', { image: '' })).status, 404);
  assert.equal((await request(`/api/restaurants/mine/menu/${id}`, owner, 'PUT', { image: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' })).status, 400);
  assert.equal((await request(`/api/restaurants/mine/menu/${id}`, owner, 'PUT', { image: 'data:image/png;base64,SGVsbG8=' })).status, 400);
  assert.equal((await request(`/api/restaurants/mine/menu/${id}`, owner, 'PUT', { image: 'data:image/png;base64,' + Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64') })).status, 400);
  result = await request('/api/restaurants/mine', owner);
  assert.equal(result.data.menu.find(m => m._id === id).image, image);
  result = await request(`/api/restaurants/${restaurant.id}`, customer);
  assert.equal(result.data.menu.find(m => m._id === id).image, image);
  result = await request(`/api/restaurants/mine/menu/${id}`, owner, 'PUT', { image: '' });
  assert.equal(result.data.item.image, '');
  assert.equal((await request(`/api/restaurants/mine/menu/${id}`, otherOwner, 'DELETE')).status, 404);
  assert.equal((await request(`/api/restaurants/mine/menu/${id}`, owner, 'DELETE')).status, 200);
});
test('order creation calculates price snapshots and deduplicates concurrent retries', async () => {
  const key = crypto.randomUUID(); const body = { ...orderBody(), subtotal: 1, commissionAmount: 0 };
  const results = await Promise.all([request('/api/orders', customer, 'POST', body, key), request('/api/orders', customer, 'POST', body, key)]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 201]);
  assert.equal(results[0].data.order._id, results[1].data.order._id);
  assert.equal(results[0].data.order.subtotal, 70000); assert.equal(results[0].data.order.restaurantNetAmount, 63000);
  await MenuItem.updateOne({ _id: item._id }, { price: 40000 });
  assert.equal((await Order.findById(results[0].data.order._id)).items[0].unitPrice, 35000);
  await MenuItem.updateOne({ _id: item._id }, { price: 35000 });
});
test('rejects unauthenticated, wrong role, closed/unapproved restaurants and unavailable/foreign items', async () => {
  assert.equal((await request('/api/restaurants/mine/orders', null)).status, 401);
  assert.equal((await request('/api/restaurants/mine/orders', customer)).status, 403);
  assert.equal((await request('/api/orders', owner, 'POST', orderBody(), crypto.randomUUID())).status, 403);
  for (const update of [{ isOpen: false }, { isOpen: true, approvalStatus: 'pending' }]) {
    await Restaurant.updateOne({ _id: restaurant._id }, update);
    assert.equal((await request('/api/orders', customer, 'POST', orderBody(), crypto.randomUUID())).status, 409);
  }
  await Restaurant.updateOne({ _id: restaurant._id }, { isOpen: true, approvalStatus: 'approved', location: { latitude: 10.77, longitude: 106.69 } });
  await MenuItem.updateOne({ _id: item._id }, { available: false });
  assert.equal((await request('/api/orders', customer, 'POST', orderBody(), crypto.randomUUID())).status, 409);
  await MenuItem.updateOne({ _id: item._id }, { available: true });
  const foreign = await MenuItem.create({ restaurant: otherRestaurant._id, name: 'Món khác', price: 1000 });
  assert.equal((await request('/api/orders', customer, 'POST', { ...orderBody(), items: [{ menuItem: foreign.id, quantity: 1 }] }, crypto.randomUUID())).status, 409);
  assert.equal((await request('/api/orders', customer, 'POST', { ...orderBody(), items: [{ menuItem: item.id, quantity: 1.5 }] }, crypto.randomUUID())).status, 400);
});
test('state machine is atomic, prevents skipped steps and preserves reasons/history', async () => {
  const order = await createOrder(); const path = `/api/restaurants/mine/orders/${order._id}/status`;
  assert.equal((await request(path, otherOwner, 'PATCH', { status: 'CONFIRMED' })).status, 409);
  assert.equal((await request(path, owner, 'PATCH', { status: 'READY_FOR_PICKUP' })).status, 409);
  const race = await Promise.all([request(path, owner, 'PATCH', { status: 'CONFIRMED' }), request(path, owner, 'PATCH', { status: 'REJECTED', reason: 'Hết nguyên liệu' })]);
  assert.deepEqual(race.map(r => r.status).sort(), [200, 409]);
  const winner = race.find(r => r.status === 200).data.order;
  assert.equal(winner.history.length, 2);
  if (winner.status === 'CONFIRMED') {
    assert.equal((await request(path, owner, 'PATCH', { status: 'PREPARING' })).status, 200);
    assert.equal((await request(path, owner, 'PATCH', { status: 'READY_FOR_PICKUP' })).status, 200);
    assert.equal((await request(path, owner, 'PATCH', { status: 'COMPLETED' })).status, 400);
  }
  const rejected = await createOrder(); const rejectPath = `/api/restaurants/mine/orders/${rejected._id}/status`;
  assert.equal((await request(rejectPath, owner, 'PATCH', { status: 'REJECTED', reason: ' ' })).status, 400);
  const result = await request(rejectPath, owner, 'PATCH', { status: 'REJECTED', reason: 'Hết nguyên liệu' });
  assert.equal(result.status, 200); assert.equal(result.data.order.history[1].reason, 'Hết nguyên liệu');
  assert.equal((await request(rejectPath, owner, 'PATCH', { status: 'CONFIRMED' })).status, 409);
  assert.ok((await request('/api/restaurants/mine/orders', otherOwner)).data.orders.every(o => o.restaurant === otherRestaurant.id));
});
test('SSE delivers initial state and a new persisted order, and disconnects a locked owner', async () => {
  const controller = new AbortController();
  const response = await fetch(base + '/api/restaurants/mine/orders/stream', { headers: { Authorization: `Bearer ${token(owner)}` }, signal: controller.signal });
  assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /text\/event-stream/);
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
  async function nextData() { const timeout = AbortSignal.timeout(8000); while (!timeout.aborted) { const chunk = await Promise.race([reader.read(), new Promise((_, reject) => timeout.addEventListener('abort', () => reject(Error('SSE timeout')), { once: true }))]); if (chunk.done) return null; buffer += decoder.decode(chunk.value, { stream: true }); let end; while ((end = buffer.indexOf('\n\n')) !== -1) { const event = buffer.slice(0, end); buffer = buffer.slice(end + 2); if (event.startsWith('data: ')) return JSON.parse(event.slice(6)); } } }
  try { assert.ok(Array.isArray((await nextData()).orders)); const order = await createOrder(); assert.ok((await nextData()).orders.some(o => o._id === order._id)); await User.updateOne({ _id: owner._id }, { status: 'locked' }); assert.equal(await nextData(), null); }
  finally { controller.abort(); await User.updateOne({ _id: owner._id }, { status: 'active' }); }
});
test('revenue excludes unfinished orders, respects Vietnam day boundaries, and isolates settlement history', async () => {
  const first = await createOrder(), second = await createOrder(), outside = await createOrder();
  await Order.updateOne({ _id: first._id }, { status: 'COMPLETED', completedAt: new Date('2026-10-01T17:00:00Z'), codConfirmed: true, settlement: { reference: 'TEST-2026-10', finalizedAt: new Date('2026-10-04T00:00:00Z') } });
  await Order.updateOne({ _id: second._id }, { status: 'COMPLETED', completedAt: new Date('2026-10-02T16:59:59Z') });
  await Order.updateOne({ _id: outside._id }, { status: 'COMPLETED', completedAt: new Date('2026-10-02T17:00:00Z') });
  let result = await request('/api/restaurants/mine/report?from=2026-10-02&to=2026-10-02', owner);
  assert.equal(result.status, 200); assert.equal(result.data.totals.count, 2); assert.equal(result.data.totals.subtotal, 140000); assert.equal(result.data.totals.commissionAmount, 14000); assert.equal(result.data.totals.restaurantNetAmount, 126000); assert.equal(result.data.settlements.length, 0);
  result = await request('/api/restaurants/mine/report?from=2026-10-04&to=2026-10-04', owner);
  assert.equal(result.data.totals.count, 0); assert.equal(result.data.settlements[0].amount, 63000); assert.equal(result.data.settlements[0].orders[0].paidAt, null);
  result = await request('/api/restaurants/mine/report?from=2026-10-01&to=2026-10-31', otherOwner); assert.equal(result.data.totals.count, 0); assert.deepEqual(result.data.settlements, []);
  for (const dates of ['from=2026-02-30&to=2026-03-01', 'from=2026-10-31&to=2026-10-01', 'from=bad&to=bad']) assert.equal((await request('/api/restaurants/mine/report?' + dates, owner)).status, 400);
});
