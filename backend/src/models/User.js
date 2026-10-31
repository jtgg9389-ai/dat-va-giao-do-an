const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
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
  roles: { type: [String], enum: ['customer', 'driver', 'restaurant'], default: undefined },
  activeRole: { type: String, enum: ['customer', 'driver', 'restaurant', 'admin'] },
  status: { type: String, enum: ['active', 'locked'], default: 'active' },
  lockReason: { type: String, default: '' },
  lockedAt: { type: Date, default: null },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, {
  timestamps: true,
});

module.exports = mongoose.model('User', userSchema);