const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Court = require('../models/Court');
const User = require('../models/User');

// GET /api/courts/nearby?playerIds=1,2,3&sport=Badminton
// Finds courts near the midpoint between you and the selected players,
// while keeping courts close to the requester ranked well as a fallback.
router.get('/nearby', auth, async (req, res) => {
  try {
    const { playerIds, sport } = req.query;
    const me = req.user;

    const ids = playerIds ? String(playerIds).split(',').filter(Boolean) : [];
    const myCoord = me?.location?.lat && me.location?.lng
      ? { lat: me.location.lat, lng: me.location.lng }
      : null;

    if (!myCoord) {
      return res.status(400).json({ message: 'Set your location before finding courts' });
    }

    let coords = myCoord ? [myCoord] : [];

    if (ids.length > 0) {
      const players = await User.find({ _id: { $in: ids } });
      const playerCoords = players
        .filter(p => p.location?.lat && p.location?.lng)
        .map(p => ({ lat: p.location.lat, lng: p.location.lng }));
      coords = [...coords, ...playerCoords];
    }

    if (coords.length === 0) {
      return res.status(400).json({ message: 'Unable to determine search location' });
    }

    const midLat = coords.reduce((sum, coord) => sum + coord.lat, 0) / coords.length;
    const midLng = coords.reduce((sum, coord) => sum + coord.lng, 0) / coords.length;

    const filter = {};
    if (sport) {
      filter.sports = { $in: [sport] };
    }

    const courts = await Court.find(filter);

    const withDistance = courts
      .map(c => {
        const distanceFromMidpoint = User.getDistance(midLat, midLng, c.lat, c.lng);
        const distanceFromYou = myCoord
          ? User.getDistance(myCoord.lat, myCoord.lng, c.lat, c.lng)
          : distanceFromMidpoint;
        const participantDistances = coords.map((coord) => User.getDistance(coord.lat, coord.lng, c.lat, c.lng));
        const distanceFromFarthestPlayer = Math.max(...participantDistances);
        const averageParticipantDistance = participantDistances.reduce((sum, dist) => sum + dist, 0) / participantDistances.length;

        // Prefer mutual courts, but if no good mutual option exists, keep requester-near courts above random far options.
        const rankingScore = (distanceFromFarthestPlayer * 0.55) + (distanceFromMidpoint * 0.25) + (distanceFromYou * 0.20);

        return {
          ...c.toObject(),
          distanceFromMidpoint: Math.round(distanceFromMidpoint * 10) / 10,
          distanceFromYou: Math.round(distanceFromYou * 10) / 10,
          distanceFromFarthestPlayer: Math.round(distanceFromFarthestPlayer * 10) / 10,
          averageParticipantDistance: Math.round(averageParticipantDistance * 10) / 10,
          rankingScore: Math.round(rankingScore * 10) / 10
        };
      })
      .sort((a, b) => a.rankingScore - b.rankingScore || a.distanceFromYou - b.distanceFromYou)
      .slice(0, 8);

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
