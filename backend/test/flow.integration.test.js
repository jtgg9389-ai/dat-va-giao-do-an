const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { WebSocket } = require('ws');
const User = require('../src/models/User');
const Restaurant = require('../src/models/Restaurant');
const MenuItem = require('../src/models/MenuItem');
const Order = require('../src/models/Order');
const Driver = require('../src/models/DriverProfile');
const Review = require('../src/models/Review');
const Notification = require('../src/models/Notification');
const flow = require('../src/services/orderFlow');
const { attachRealtime } = require('../src/services/realtime');
const app = require('../src/app');
let server, wss, base, owner, customer, outsider, admin, driver, driver2, restaurant, item;
const gps = { latitude: 10.77, longitude: 106.69 };
async function request(path, user, method = 'GET', body, key) {
  const response = await fetch(base + '/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: 'Bearer ' + jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' }) } : {}), ...(key ? { 'Idempotency-Key': key } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}
function body(extra = {}) { return { restaurantId: restaurant.id, items: [{ menuItem: item.id, quantity: 1 }], address: '123 Địa chỉ thử', phone: '0901234567', deliveryLocation: { latitude: 10.771, longitude: 106.691 }, ...extra }; }
async function create(extra) { const r = await request('/orders', customer, 'POST', body(extra), crypto.randomUUID()); assert.equal(r.status, 201, JSON.stringify(r.data)); return r.data.order; }
async function restaurantState(o, status) { return request(`/restaurants/mine/orders/${o._id}/status`, owner, 'PATCH', { status, reason: 'Hết nguyên liệu' }); }
async function prepare(o) { assert.equal((await restaurantState(o, 'CONFIRMED')).status, 200); assert.equal((await restaurantState(o, 'PREPARING')).status, 200); assert.equal((await restaurantState(o, 'READY_FOR_PICKUP')).status, 200); return Order.findById(o._id); }
before(async () => {
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  await mongoose.connect(process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017', { dbName: 'flow_test_' + crypto.randomBytes(8).toString('hex') });
  await Promise.all([Order.init(), Driver.init(), Review.init(), Notification.init()]);
  [owner, customer, outsider, admin, driver, driver2] = await User.create(['restaurant','customer','customer','admin','driver','driver'].map((role, i) => ({ name: 'Test ' + i, email: i + '@flow.test', password: 'unused', role })));
  restaurant = await Restaurant.create({ owner: owner._id, name: 'Quán thử', address: '123 Địa chỉ quán', approvalStatus: 'approved', location: gps, cuisine: 'Cơm' });
  item = await MenuItem.create({ restaurant: restaurant._id, name: 'Cơm thử', price: 100000 });
  for (const user of [driver, driver2]) await Driver.create({ user: user._id, approvalStatus: 'approved', online: true, location: { type: 'Point', coordinates: [106.69,10.77] }, locationAt: new Date() });
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  wss = attachRealtime(server); base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { if (wss) { wss.clients.forEach(s => s.terminate()); await new Promise(resolve => wss.close(resolve)); } if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } if (mongoose.connection.name?.startsWith('flow_test_')) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
test('public registration cannot create admin, missing login JSON returns validation error', async () => {
  assert.equal((await request('/auth/register', null, 'POST', { name: 'Test Admin', email: 'hack@flow.test', password: 'validpassword', role: 'admin' })).status, 400);
  assert.equal((await request('/auth/login', null, 'POST', {})).status, 400);
});
test('delivery pricing, payload idempotency and ownership are enforced', async () => {
  const key = crypto.randomUUID(); let r = await request('/orders', customer, 'POST', body(), key);
  assert.equal(r.status, 201); assert.equal(r.data.order.deliveryFee, 15000); assert.equal(r.data.order.totalAmount, 115000);
  assert.equal((await request('/orders', customer, 'POST', body({ note: 'changed' }), key)).status, 409);
  assert.equal((await request('/orders/' + r.data.order._id, outsider)).status, 404);
  assert.equal((await request('/orders', customer, 'POST', body({ expectedSubtotal: 1 }), crypto.randomUUID())).status, 409);
  assert.equal((await request('/orders', customer, 'POST', body({ deliveryLocation: { latitude: 0, longitude: 0 } }), crypto.randomUUID())).status, 409);
});
test('mock payment is idempotent, owner-only, and paid cancellation/rejection refunds atomically', async () => {
  const o = await create({ paymentMethod: 'MOCK_PREPAID' }); assert.equal(o.status, 'PENDING_PAYMENT');
  assert.equal((await restaurantState(o, 'CONFIRMED')).status, 409);
  assert.equal((await request(`/orders/${o._id}/mock-payment`, outsider, 'POST', { outcome: 'success' })).status, 404);
  let r = await request(`/orders/${o._id}/mock-payment`, customer, 'POST', { outcome: 'fail' }); assert.equal(r.data.order.paymentState, 'UNPAID');
  r = await request(`/orders/${o._id}/mock-payment`, customer, 'POST', { outcome: 'success' }); assert.equal(r.data.order.paymentState, 'PAID');
  r = await request(`/orders/${o._id}/mock-payment`, customer, 'POST', { outcome: 'success' }); assert.equal(r.status, 200); assert.equal(r.data.order.history.length, 2);
  r = await request(`/orders/${o._id}/cancel`, customer, 'POST', { reason: 'Không còn nhu cầu' }); assert.equal(r.status, 200); assert.equal(r.data.order.paymentState, 'REFUNDED');
  const rejected = await create({ paymentMethod: 'MOCK_PREPAID' }); await request(`/orders/${rejected._id}/mock-payment`, customer, 'POST', { outcome: 'success' });
  r = await restaurantState(rejected, 'REJECTED'); assert.equal(r.data.order.paymentState, 'REFUNDED');
});
test('cancel and restaurant acceptance race has one winner', async () => {
  const o = await create(); const results = await Promise.all([request(`/orders/${o._id}/cancel`, customer, 'POST', { reason: 'Khách đổi ý' }), restaurantState(o, 'CONFIRMED')]);
  assert.deepEqual(results.map(r => r.status).sort(), [200,409]);
});
test('nearest-driver offers hide contact data and acceptance prevents two active jobs', async () => {
  // Exclude leftovers from unrelated tests from active-job checks.
  await Order.updateMany({ status: { $in: flow.ACTIVE } }, { status: 'CANCELLED' });
  const o1 = await create(), o2 = await create(); await prepare(o1); await prepare(o2);
  await flow.dispatch(await Order.findById(o1._id)); await flow.dispatch(await Order.findById(o2._id));
  const first = await Order.findById(o1._id); const offeredDriver = String(first.offers.at(-1).driver) === driver.id ? driver : driver2;
  const second = await Order.findById(o2._id); assert.equal(String(second.offers.at(-1).driver), offeredDriver.id);
  const view = await request('/driver/profile', offeredDriver); assert.ok(view.data.offers.some(o => o._id === o1._id)); assert.ok(view.data.offers.every(o => !o.phone && !o.address));
  const race = await Promise.all([request(`/driver/offers/${o1._id}`, offeredDriver, 'POST', { action: 'accept' }), request(`/driver/offers/${o2._id}`, offeredDriver, 'POST', { action: 'accept' })]);
  assert.deepEqual(race.map(r => r.status).sort(), [200,409]);
  assert.equal(await Order.countDocuments({ driver: offeredDriver._id, status: { $in: flow.ACTIVE } }), 1);
  await Order.updateMany({ _id: { $in: [o1._id,o2._id] } }, { status: 'CANCELLED' });
});
test('COD delivery → review → finalization → signed transfers is repeatable and scoped', async () => {
  const o = await create(); await prepare(o);
  await Order.updateOne({ _id: o._id }, { $set: { driver: driver._id, dispatchStatus: 'ASSIGNED' } });
  assert.equal((await request(`/driver/jobs/${o._id}/status`, driver2, 'PATCH', { status: 'PICKED_UP' })).status, 404);
  assert.equal((await request(`/driver/jobs/${o._id}/status`, driver, 'PATCH', { status: 'COMPLETED', codCollectedAmount: 115000 })).status, 409);
  assert.equal((await request(`/driver/jobs/${o._id}/status`, driver, 'PATCH', { status: 'PICKED_UP' })).status, 200);
  assert.equal((await request(`/driver/jobs/${o._id}/status`, driver, 'PATCH', { status: 'DELIVERING' })).status, 200);
  assert.equal((await request(`/driver/jobs/${o._id}/status`, driver, 'PATCH', { status: 'COMPLETED', codCollectedAmount: 1 })).status, 409);
  let r = await request(`/driver/jobs/${o._id}/status`, driver, 'PATCH', { status: 'COMPLETED', codCollectedAmount: 115000 }); assert.equal(r.status, 200); assert.equal(r.data.order.codConfirmed, true);
  assert.equal((await request(`/orders/${o._id}/review`, customer, 'POST', { restaurantRating: 5, driverRating: 4, comment: 'Ngon và nhanh' })).status, 201);
  assert.equal((await request(`/orders/${o._id}/review`, customer, 'POST', { restaurantRating: 5 })).status, 409);
  const listed = await request('/restaurants', customer); assert.equal(listed.data.restaurants.find(x => x._id === restaurant.id).rating, 5);
  const from = new Date(Date.now() - 86400000), to = new Date(Date.now() + 86400000);
  await flow.settleCompleted(from, to); const settled = await Order.findById(o._id); assert.ok(settled.settlement.reference); assert.equal(settled.driverSettlement.amount, -100000);
  await flow.settleCompleted(from, to); assert.equal((await Order.findById(o._id)).settlement.finalizedAt.getTime(), settled.settlement.finalizedAt.getTime());
  assert.equal((await request(`/admin/settlements/${o._id}/transfer`, customer, 'POST', { party: 'restaurant', amount: 90000 })).status, 403);
  assert.equal((await request(`/admin/settlements/${o._id}/transfer`, admin, 'POST', { party: 'restaurant', amount: 1 })).status, 409);
  r = await request(`/admin/settlements/${o._id}/transfer`, admin, 'POST', { party: 'restaurant', amount: 90000 }); assert.equal(r.status, 200); assert.ok(r.data.order.settlement.paidAt);
  const paidAt = r.data.order.settlement.paidAt;
  r = await request(`/admin/settlements/${o._id}/transfer`, admin, 'POST', { party: 'restaurant', amount: 90000 }); assert.equal(r.data.order.settlement.paidAt, paidAt);
  r = await request(`/admin/settlements/${o._id}/transfer`, admin, 'POST', { party: 'driver', amount: -100000 }); assert.equal(r.status, 200);
  const own = await request('/settlements', driver2); assert.ok(own.data.orders.every(x => x.driver === driver2.id));
});
test('stale/expired offers, GPS sequence, approval, incident holds and failed-delivery refunds', async () => {
  const o = await create({ paymentMethod: 'MOCK_PREPAID' }); await request(`/orders/${o._id}/mock-payment`, customer, 'POST', { outcome: 'success' }); await prepare(o);
  await Order.updateOne({ _id: o._id }, { $push: { offers: { driver: driver2._id, status: 'PENDING', expiresAt: new Date(Date.now() - 1000) } } });
  assert.equal((await request(`/driver/offers/${o._id}`, driver2, 'POST', { action: 'accept' })).status, 409);
  assert.equal((await request('/driver/location', driver2, 'POST', { ...gps, sequence: 10 })).status, 200);
  assert.equal((await request('/driver/location', driver2, 'POST', { ...gps, sequence: 9 })).status, 409);
  await Order.updateOne({ _id: o._id }, { $set: { driver: driver2._id } });
  await request(`/driver/jobs/${o._id}/status`, driver2, 'PATCH', { status: 'PICKED_UP' });
  assert.equal((await request(`/driver/jobs/${o._id}/issue`, driver2, 'POST', { description: 'Khách không nhận hàng' })).status, 200);
  assert.equal((await request(`/driver/jobs/${o._id}/status`, driver2, 'PATCH', { status: 'DELIVERING' })).status, 409);
  const result = await request(`/admin/orders/${o._id}/action`, admin, 'POST', { action: 'fail', reason: 'Xác nhận không thể giao hàng' }); assert.equal(result.status, 200); assert.equal(result.data.order.status, 'DELIVERY_FAILED'); assert.equal(result.data.order.paymentState, 'REFUNDED');
  await flow.settleCompleted(new Date(0), new Date(Date.now()+86400000)); assert.ok(!(await Order.findById(o._id)).settlement?.reference);
});
test('outbox retries create one notification per recipient; websocket authenticates and publishes live changes', async () => {
  const o = await create(); const socket = new WebSocket(base.replace('http:','ws:') + '/api/ws');
  try {
    await new Promise((resolve,reject) => { socket.once('open',resolve); socket.once('error',reject); });
    const connected = new Promise(resolve => socket.once('message', raw => resolve(JSON.parse(raw))));
    socket.send(JSON.stringify({ token: jwt.sign({ id: customer.id }, process.env.JWT_SECRET, { expiresIn: '1h' }) })); assert.equal((await connected).type, 'connected');
    const notified = new Promise((resolve,reject) => { const timer=setTimeout(()=>reject(Error('No websocket notification')),3000); socket.once('message',raw=>{clearTimeout(timer);resolve(JSON.parse(raw));}); });
    const doc = await Order.findById(o._id); await flow.deliverOutbox(doc); assert.equal((await notified).orderId,o._id);
    const count = await Notification.countDocuments({ order:o._id }); await flow.deliverOutbox(doc); assert.equal(await Notification.countDocuments({ order:o._id }),count);
    assert.ok((await request('/notifications',customer)).data.notifications.some(n=>n.order===o._id));
    assert.ok(!(await request('/notifications',outsider)).data.notifications.some(n=>n.order===o._id));
  } finally { socket.terminate(); }
});
test('financial complaints link to owned orders, hold finalization and closing releases the hold', async () => {
  const o = await create();
  await Order.updateOne({ _id: o._id }, { status: 'COMPLETED', completedAt: new Date(), codConfirmed: true, paymentState: 'PAID', driver: driver._id });
  const content = { category: 'payment', subject: 'Sai lệch tiền COD', description: 'Cần kiểm tra lại số tiền thu hộ', orderId: o._id };
  assert.equal((await request('/complaints', outsider, 'POST', content)).status, 404);
  const complaint = await request('/complaints', customer, 'POST', content); assert.equal(complaint.status, 201); assert.equal(complaint.data.complaint.order, o._id);
  await flow.settleCompleted(new Date(0), new Date(Date.now()+86400000)); assert.ok(!(await Order.findById(o._id)).settlement?.reference);
  assert.equal((await request('/admin/complaints/' + complaint.data.complaint._id, admin, 'PATCH', { status: 'RESOLVED', resolution: 'Đã xác minh đầy đủ tiền thu COD' })).status, 200);
  assert.equal((await Order.findById(o._id)).settlementHold, false);
  await flow.settleCompleted(new Date(0), new Date(Date.now()+86400000)); assert.ok((await Order.findById(o._id)).settlement.reference);
  const adjustment = { party: 'restaurant', amount: 5000, reference: 'complaint-adjustment-01', reason: 'Bổ sung khoản được hưởng sau xác minh' };
  let result = await request(`/admin/settlements/${o._id}/adjustments`, admin, 'POST', adjustment); assert.equal(result.status, 201);
  const a = result.data.adjustment;
  result = await request(`/admin/settlements/${o._id}/adjustments`, admin, 'POST', adjustment); assert.equal(result.status, 200); assert.equal(result.data.adjustment._id, a._id);
  assert.equal((await request(`/admin/settlements/${o._id}/adjustments`, admin, 'POST', { ...adjustment, amount: 6000 })).status, 409);
  assert.equal((await request(`/admin/adjustments/${a._id}/transfer`, admin, 'POST', { amount: 5000 })).status, 200);
  const own = await request('/settlements', owner); assert.ok(own.data.adjustments.some(x => x._id === a._id));
  assert.ok(!(await request('/settlements', driver2)).data.adjustments.some(x => x._id === a._id));
});
test('worker times out unpaid orders and recovers lost drivers without falsely completing orders', async () => {
  await Order.updateMany({ status: { $in: flow.ACTIVE } }, { status: 'CANCELLED' });
  const unpaid = await create({ paymentMethod: 'MOCK_PREPAID' });
  await Order.collection.updateOne({ _id: new mongoose.Types.ObjectId(unpaid._id) }, { $set: { createdAt: new Date(Date.now() - 16 * 60000) } });
  const pickup = await create(); await prepare(pickup); await Order.updateOne({ _id: pickup._id }, { driver: driver._id });
  await Driver.updateOne({ user: driver._id }, { locationAt: new Date(Date.now() - 180000) });
  await flow.tick();
  assert.equal((await Order.findById(unpaid._id)).status, 'CANCELLED');
  assert.ok(!(await Order.findById(pickup._id)).driver);
  await Order.updateOne({ _id: pickup._id }, { status: 'PICKED_UP', driver: driver._id });
  await flow.tick(); const held = await Order.findById(pickup._id); assert.equal(held.status,'PICKED_UP'); assert.equal(held.financialHold,true);
  await Order.updateOne({ _id: pickup._id }, { status:'DELIVERY_FAILED' });
  await Driver.updateOne({ user: driver._id }, { locationAt:new Date() });
});

test('first-time driver profile can be created without GPS and cannot go online before approval', async () => {
  const user = await User.create({ name: 'New driver', email: 'new-driver@flow.test', password: 'unused', role: 'driver' });
  let result = await request('/driver/profile', user); assert.equal(result.status, 200); assert.equal(result.data.profile.approvalStatus, 'pending'); assert.equal(result.data.profile.location, undefined);
  assert.equal((await request('/driver/availability', user, 'PUT', { online: true })).status, 403);
  assert.equal((await request('/driver/location', user, 'POST', { ...gps, sequence: 1 })).status, 200);
  assert.equal((await request(`/admin/drivers/${user.id}/review`, admin, 'PATCH', { status: 'approved', reason: 'Hồ sơ đã kiểm tra hợp lệ' })).status, 200);
  assert.equal((await request('/driver/availability', user, 'PUT', { online: true })).status, 200);
});
test('one identity switches modes while approvals and records persist; stale tokens/admin escalation are rejected', async () => {
  const user = await User.create({ name: 'Multi role', email: 'multi@flow.test', password: 'unused', role: 'driver' });
  await Driver.create({ user: user._id, approvalStatus: 'approved', online: true, location: { type:'Point', coordinates:[106.69,10.77] }, locationAt:new Date() });
  let result = await request('/auth/switch-role', user, 'POST', { role: 'customer' }); assert.equal(result.status,200); assert.equal(result.data.user.id,user.id); assert.equal(result.data.user.role,'customer'); assert.equal(result.data.user.accountRole,'driver');
  assert.equal((await Driver.findOne({user:user._id})).approvalStatus,'approved'); assert.equal((await Driver.findOne({user:user._id})).online,false);
  assert.equal((await request('/driver/profile',user)).status,401);
  let bearer=result.data.token;
  async function scoped(path, method='GET', body) { const r=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+bearer},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()}; }
  assert.equal((await scoped('/restaurants')).status,200); assert.equal((await scoped('/driver/profile')).status,403); assert.equal((await scoped('/admin/drivers')).status,403);
  assert.equal((await scoped('/auth/switch-role','POST',{role:'admin'})).status,400);
  result=await scoped('/auth/switch-role','POST',{role:'restaurant'});assert.equal(result.status,200);bearer=result.data.token;
  result=await scoped('/restaurants/mine','PUT',{name:'Quán đa vai trò',address:'123 Địa chỉ thử',location:gps});assert.equal(result.status,200);assert.equal(result.data.restaurant.approvalStatus,'pending');
  const restaurantId=result.data.restaurant._id;
  result=await scoped('/auth/switch-role','POST',{role:'driver'});assert.equal(result.status,200);bearer=result.data.token;
  result=await scoped('/driver/profile');assert.equal(result.status,200);assert.equal(result.data.profile.approvalStatus,'approved');
  assert.equal((await User.findById(user._id)).role,'driver');assert.ok(await Restaurant.exists({_id:restaurantId,owner:user._id}));
  assert.equal((await request('/auth/switch-role',admin,'POST',{role:'customer'})).status,403);
});
test('drivers cannot leave an active delivery; admin role revocation invalidates partner approval',async()=>{
  const user=await User.create({name:'Busy role',email:'busy-role@flow.test',password:'unused',role:'driver'});
  await Driver.create({user:user._id,approvalStatus:'approved',online:true,location:{type:'Point',coordinates:[106.69,10.77]},locationAt:new Date()});
  const o=await create();await prepare(o);await Order.updateOne({_id:o._id},{driver:user._id});
  assert.equal((await request('/auth/switch-role',user,'POST',{role:'customer'})).status,409);
  assert.equal((await User.findById(user._id)).activeRole,undefined);
  assert.equal((await request(`/admin/users/${user.id}/role`,admin,'PATCH',{role:'customer',reason:'Thu hồi quyền đối tác để kiểm tra'})).status,200);
  assert.equal((await Driver.findOne({user:user._id})).approvalStatus,'pending');
  assert.equal((await request('/driver/profile',user)).status,403);
  const oldToken=jwt.sign({id:user.id,activeRole:'driver'},process.env.JWT_SECRET,{expiresIn:'1h'});
  assert.equal((await fetch(base+'/api/driver/profile',{headers:{Authorization:'Bearer '+oldToken}})).status,401);
  await Order.updateOne({_id:o._id},{status:'CANCELLED'});
});
test('racing mode switch and offer acceptance never leaves a customer session assigned to a job',async()=>{
  for(let i=0;i<4;i++){
    const user=await User.create({name:'Race role',email:`role-race-${i}@flow.test`,password:'unused',role:'driver'});
    await Driver.create({user:user._id,approvalStatus:'approved',online:true,location:{type:'Point',coordinates:[106.69,10.77]},locationAt:new Date()});
    const o=await create();await prepare(o);await Order.updateOne({_id:o._id},{$push:{offers:{driver:user._id,status:'PENDING',expiresAt:new Date(Date.now()+30000)}}});
    const results=await Promise.all([request('/auth/switch-role',user,'POST',{role:'customer'}),request(`/driver/offers/${o._id}`,user,'POST',{action:'accept'})]);
    const account=await User.findById(user._id),order=await Order.findById(o._id);
    assert.ok(results.every(r=>[200,401,409].includes(r.status)),JSON.stringify(results));
    if(account.activeRole==='customer')assert.ok(!order.driver,'Customer mode must not retain an accepted driver assignment');
    await Order.updateOne({_id:o._id},{status:'CANCELLED'});
  }
});
