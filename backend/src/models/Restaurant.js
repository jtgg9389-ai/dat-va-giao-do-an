const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  // Mỗi tài khoản nhà hàng chỉ sở hữu 1 quán
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  address: { type: String, required: true, trim: true },
  phone: { type: String, default: '' },
  isOpen: { type: Boolean, default: true },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectReason: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Restaurant', restaurantSchema);