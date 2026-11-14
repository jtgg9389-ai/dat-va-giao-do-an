const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // Tên đăng nhập ngắn, không bắt buộc. sparse: tài khoản chưa có username không bị tính là trùng nhau.
  username: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9_.]{3,20}$/,
  },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String },
  gender: { type: String, enum: ['', 'male', 'female', 'other'], default: '' },
  birthday: { type: Date, default: null },
  address: { type: String, default: '' },
  role: {
    type: String,
    enum: ['customer', 'restaurant', 'driver', 'admin'],
    default: 'customer',
  },
  status: { type: String, enum: ['active', 'locked'], default: 'active' },
  lockReason: { type: String, default: '' },
  lockedAt: { type: Date, default: null },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, {
  timestamps: true,
});

module.exports = mongoose.model('User', userSchema);