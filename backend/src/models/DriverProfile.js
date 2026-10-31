const mongoose = require('mongoose');
const pointSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point', required: true },
  coordinates: { type: [Number], required: true, validate: value => value.length === 2 },
}, { _id: false });
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewReason: { type: String, default: '' },
  online: { type: Boolean, default: false },
  location: { type: pointSchema, default: undefined },
  locationAt: Date,
  locationSequence: { type: Number, default: 0 },
}, { timestamps: true });
schema.index({ location: '2dsphere' });
module.exports = mongoose.model('DriverProfile', schema);
