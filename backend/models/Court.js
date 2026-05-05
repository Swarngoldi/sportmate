const mongoose = require('mongoose');

const courtSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  sports: [{ type: String }],
  pricePerHour: { type: Number, default: 0 },
  rating: { type: Number, default: 4.0, min: 1, max: 5 },
  totalCourts: { type: Number, default: 1 },
  phone: { type: String, default: '' },
  openTime: { type: String, default: '6:00 AM' },
  closeTime: { type: String, default: '10:00 PM' }
});

module.exports = mongoose.model('Court', courtSchema);
