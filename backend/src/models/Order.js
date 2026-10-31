const mongoose = require('mongoose');
const orderSchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestKey: { type: String, required: true },
  items: [{ menuItem: mongoose.Schema.Types.ObjectId, name: String, unitPrice: Number, quantity: Number }],
  address: { type: String, required: true },
  phone: { type: String, required: true },
  note: { type: String, default: '' },
  subtotal: { type: Number, required: true, min: 0 },
  commissionAmount: { type: Number, required: true, min: 0 },
  restaurantNetAmount: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, enum: ['COD'], default: 'COD' },
  status: { type: String, enum: ['PENDING_CONFIRMATION', 'CONFIRMED', 'REJECTED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'DELIVERING', 'COMPLETED', 'CANCELLED', 'DELIVERY_FAILED'], default: 'PENDING_CONFIRMATION' },
  history: [{ status: String, actor: mongoose.Schema.Types.ObjectId, at: Date, reason: String }],
  completedAt: Date,
  codConfirmed: { type: Boolean, default: false },
  settlement: { reference: String, finalizedAt: Date, paidAt: Date },
}, { timestamps: true });
orderSchema.index({ customer: 1, requestKey: 1 }, { unique: true });
orderSchema.index({ restaurant: 1, createdAt: -1 });
module.exports = mongoose.model('Order', orderSchema);
