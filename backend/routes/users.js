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
    if (lat !== undefined) updates['location.lat'] = lat;
    if (lng !== undefined) updates['location.lng'] = lng;
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

    if (!myLat || !myLng) {
      return res.status(400).json({ message: 'Set your location before finding nearby players' });
    }

    const filter = {
      _id: { $ne: req.user._id },
      'location.lat': { $exists: true, $ne: null },
      'location.lng': { $exists: true, $ne: null }
    };
    if (matchType) filter.preferredMatchType = matchType;

    const users = await User.find(filter).select('-password');

    const withDistance = users
      .map(u => {
        const dist = User.getDistance(myLat, myLng, u.location.lat, u.location.lng);
        const exactAvailability = !availability || u.availability === availability;
        const sportMatch = sport ? (u.sports || []).includes(sport) : true;
        return {
          ...u.toObject(),
          distance: Math.round(dist * 10) / 10,
          exactAvailability,
          sportMatch,
          sportFit: sportMatch ? 'selected_sport' : 'other_interest',
          matchQuality: exactAvailability && dist <= 10
            ? 'best'
            : exactAvailability
              ? 'nearby'
              : 'alternate_time'
        };
      })
      .filter(u => u.distance <= 50)
      .sort((a, b) => {
        const qualityOrder = { best: 0, nearby: 1, alternate_time: 2 };
        return Number(b.sportMatch) - Number(a.sportMatch)
          || qualityOrder[a.matchQuality] - qualityOrder[b.matchQuality]
          || a.distance - b.distance;
      });

    const exactNearby = withDistance.filter(u => u.matchQuality === 'best');
    const exactWider = withDistance.filter(u => u.matchQuality === 'nearby');
    const alternateTime = withDistance.filter(u => u.matchQuality === 'alternate_time');
    const results = [...exactNearby, ...exactWider, ...alternateTime].slice(0, 20);

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
