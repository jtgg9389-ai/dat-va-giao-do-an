const mongoose = require('mongoose');

const CATEGORIES = ['order', 'payment', 'restaurant', 'driver', 'app', 'other'];

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, required: true },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
});

const complaintSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: String, enum: CATEGORIES, default: 'other' },
  subject: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 1000 },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
  // Giữ mã nhập tay để tương thích hồ sơ hỗ trợ cũ.
  orderCode: { type: String, default: '', trim: true, maxlength: 30 },
  status: { type: String, enum: ['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'], default: 'OPEN', index: true },
  assignedAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolution: { type: String, default: '' },
  resolvedAt: { type: Date, default: null },
  messages: { type: [messageSchema], default: [] },
}, {
  timestamps: true,
});

const Complaint = mongoose.model('Complaint', complaintSchema);
Complaint.CATEGORIES = CATEGORIES;

module.exports = Complaint;