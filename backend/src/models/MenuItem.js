const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  name: { type: String, required: true, trim: true },
  image: { type: String, default: '' },
  description: { type: String, default: '', trim: true },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, default: 'Khác', trim: true },
  available: { type: Boolean, default: true },
}, {
  timestamps: true,
});

module.exports = mongoose.model('MenuItem', menuItemSchema);