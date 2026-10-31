const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  party: { type: String, enum: ['restaurant','driver'], required: true },
  reference: { type: String, required: true },
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  paidAt: Date,
}, { timestamps: true });
schema.index({ reference: 1, party: 1 }, { unique: true });
module.exports = mongoose.model('FinancialAdjustment', schema);
