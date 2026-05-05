const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Court = require('../models/Court');
const User = require('../models/User');

// GET /api/courts/nearby?playerIds=1,2,3&sport=Badminton
// Finds courts near the midpoint between you and the selected players
router.get('/nearby', auth, async (req, res) => {
  try {
    const { playerIds, sport } = req.query;
    const me = req.user;

    const ids = playerIds ? String(playerIds).split(',').filter(Boolean) : [];
    let coords = [];

    if (ids.length > 0) {
      const players = await User.find({ _id: { $in: ids } });
      coords = players
        .filter(p => p.location?.lat && p.location?.lng)
        .map(p => [p.location.lat, p.location.lng]);
    }

    if (coords.length === 0 && me?.location?.lat && me.location?.lng) {
      coords = [[me.location.lat, me.location.lng]];
    }

    if (coords.length === 0) {
      return res.status(400).json({ message: 'Unable to determine search location' });
    }

    const midLat = coords.reduce((sum, [lat]) => sum + lat, 0) / coords.length;
    const midLng = coords.reduce((sum, [, lng]) => sum + lng, 0) / coords.length;

    const filter = {};
    if (sport) {
      filter.sports = { $in: [sport] };
    }

    const courts = await Court.find(filter);

    const withDistance = courts
      .map(c => {
        const dist = User.getDistance(midLat, midLng, c.lat, c.lng);
        return { ...c.toObject(), distanceFromMidpoint: Math.round(dist * 10) / 10 };
      })
      .sort((a, b) => a.distanceFromMidpoint - b.distanceFromMidpoint)
      .slice(0, 5);

    res.json(withDistance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/courts - all courts
router.get('/', auth, async (req, res) => {
  try {
    const courts = await Court.find();
    res.json(courts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
