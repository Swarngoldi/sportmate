const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  location: {
    address: { type: String, required: true },
    lat: { type: Number, default: 21.1458 },   // Default: Nagpur
    lng: { type: Number, default: 79.0882 }
  },
  sports: [{ type: String }],
  preferredMatchType: { type: String, enum: ['Singles', 'Doubles', 'Teams'], default: 'Singles' },
  skillLevel: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Intermediate' },
  availability: { type: String, enum: ['Now', 'Evening', 'Weekend'], default: 'Now' },
  trustScore: { type: Number, default: 100 },
  avatar: { type: String, default: '' },
  isOnline: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.password);
};

// Calculate distance between two lat/lng points (km)
userSchema.statics.getDistance = function(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

module.exports = mongoose.model('User', userSchema);
