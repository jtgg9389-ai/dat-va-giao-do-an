const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: String, required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  title: { type: String, required: true },
  readAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ user: 1, eventId: 1 }, { unique: true });
schema.index({ user: 1, createdAt: -1 });
module.exports = mongoose.model('Notification', schema);
