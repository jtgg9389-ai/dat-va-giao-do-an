const mongoose = require('mongoose');
const orderSchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestHash: String,
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dispatchAttempts: { type: Number, default: 0 },
  dispatchStatus: { type: String, enum: ['WAITING', 'OFFERED', 'ASSIGNED', 'NO_DRIVER'], default: 'WAITING' },
  offers: [{ driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, expiresAt: Date, status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'] } }],
  nextDispatchAt: Date,
  deliveryLocation: { latitude: Number, longitude: Number },
  restaurantLocation: { latitude: Number, longitude: Number },
  deliveryFee: { type: Number, default: 0 },
  totalAmount: Number,
  paymentState: { type: String, enum: ['UNPAID', 'PAID', 'REFUNDED'], default: 'UNPAID' },
  incident: { description: String, reportedAt: Date, resolvedAt: Date, resolution: String },
  settlementHold: { type: Boolean, default: false },
  financialHold: { type: Boolean, default: false },
  outbox: [{ eventId: String, title: String, publishedAt: Date }],
  driverSettlement: { reference: String, finalizedAt: Date, amount: Number, paidAt: Date },
  requestKey: { type: String, required: true },
  items: [{ menuItem: mongoose.Schema.Types.ObjectId, name: String, unitPrice: Number, quantity: Number }],
  address: { type: String, required: true },
  phone: { type: String, required: true },
  note: { type: String, default: '' },
  subtotal: { type: Number, required: true, min: 0 },
  commissionAmount: { type: Number, required: true, min: 0 },
  restaurantNetAmount: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, enum: ['COD', 'MOCK_PREPAID'], default: 'COD' },
  status: { type: String, enum: ['PENDING_PAYMENT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'REJECTED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'DELIVERING', 'COMPLETED', 'CANCELLED', 'DELIVERY_FAILED'], default: 'PENDING_CONFIRMATION' },
  history: [{ status: String, actor: mongoose.Schema.Types.ObjectId, at: Date, reason: String }],
  completedAt: Date,
  codConfirmed: { type: Boolean, default: false },
  settlement: { reference: String, finalizedAt: Date, paidAt: Date },
}, { timestamps: true });
orderSchema.index({ customer: 1, requestKey: 1 }, { unique: true });
orderSchema.index({ restaurant: 1, createdAt: -1 });
// MongoDB partial unique index prevents one driver receiving two active jobs,
// even when separate API processes race to accept different offers.
orderSchema.index({ driver: 1 }, { unique: true, partialFilterExpression: { driver: { $type: 'objectId' }, status: { $in: ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'DELIVERING'] } } });
module.exports = mongoose.model('Order', orderSchema);
