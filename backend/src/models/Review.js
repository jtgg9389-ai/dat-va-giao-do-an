const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  restaurantRating: { type: Number, min: 1, max: 5, required: true },
  driverRating: { type: Number, min: 1, max: 5 },
  comment: { type: String, maxlength: 1000, default: '' },
}, { timestamps: true });
module.exports = mongoose.model('Review', schema);
