const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// GET /api/users/me
router.get('/me', auth, (req, res) => res.json(req.user));

// PUT /api/users/me - update profile
router.put('/me', auth, async (req, res) => {
  try {
    const { name, address, lat, lng, sports, preferredMatchType, skillLevel, availability } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (address) updates['location.address'] = address;
    if (lat) updates['location.lat'] = lat;
    if (lng) updates['location.lng'] = lng;
    if (sports) updates.sports = sports;
    if (preferredMatchType) updates.preferredMatchType = preferredMatchType;
    if (skillLevel) updates.skillLevel = skillLevel;
    if (availability) updates.availability = availability;

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/nearby?sport=Badminton&matchType=Singles&availability=Now
router.get('/nearby', auth, async (req, res) => {
  try {
    const { sport, availability, matchType } = req.query;
    const myLat = req.user.location.lat;
    const myLng = req.user.location.lng;

    const filter = { _id: { $ne: req.user._id } };
    if (sport) filter.sports = sport;
    if (availability) filter.availability = availability;
    if (matchType) filter.preferredMatchType = matchType;

    const users = await User.find(filter).select('-password');

    const withDistance = users
      .map(u => {
        const dist = User.getDistance(myLat, myLng, u.location.lat, u.location.lng);
        return { ...u.toObject(), distance: Math.round(dist * 10) / 10 };
      })
      .filter(u => u.distance <= 10)
      .sort((a, b) => a.distance - b.distance);

    res.json(withDistance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
