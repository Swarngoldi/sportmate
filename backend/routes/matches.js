const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Match = require('../models/Match');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { enqueueMatchNotifications, processDueJobs } = require('../services/notificationQueue');

const populateMatchForResponse = (match) => match.populate([
  { path: 'players', select: 'name location sports skillLevel' },
  { path: 'court' }
]);

// POST /api/matches - create a match request
router.post('/', auth, async (req, res) => {
  try {
    let { sport, playerCount, playerIds, courtId, availability, courtPlace } = req.body;
    const ids = Array.isArray(playerIds)
      ? playerIds
      : String(playerIds || '').split(',').filter(Boolean);

    if (!courtId && !courtPlace) {
      return res.status(400).json({ message: 'Court is required' });
    }

    if (!courtId) {
      if (!courtPlace?.name || !courtPlace?.address || !courtPlace?.location?.lat || !courtPlace?.location?.lng) {
        return res.status(400).json({ message: 'Court place data is incomplete' });
      }
      const Court = require('../models/Court');
      const createdCourt = await Court.create({
        name: courtPlace.name,
        address: courtPlace.address,
        lat: courtPlace.location.lat,
        lng: courtPlace.location.lng,
        sports: sport ? [sport] : [],
        pricePerHour: courtPlace.pricePerHour || 0,
        rating: courtPlace.rating || 4.0,
        totalCourts: courtPlace.totalCourts || 1,
        phone: courtPlace.phone || '',
        openTime: courtPlace.openTime || '6:00 AM',
        closeTime: courtPlace.closeTime || '10:00 PM'
      });
      courtId = createdCourt._id;
    }

    if (ids.some((id) => id === String(req.user._id))) {
      return res.status(400).json({ message: 'Invalid player selection' });
    }

    const players = await User.find({ _id: { $in: ids } });
    if (players.length !== ids.length) {
      return res.status(404).json({ message: 'One or more selected players were not found' });
    }

    const Court = require('../models/Court');
    const court = await Court.findById(courtId);
    if (!court) return res.status(404).json({ message: 'Court not found' });

    const isSoloMatch = ids.length === 0;
    const match = await Match.create({
      sport,
      playerCount: playerCount !== undefined ? playerCount : ids.length,
      players: [req.user._id, ...ids],
      initiator: req.user._id,
      court: courtId,
      availability: availability || 'Now',
      status: isSoloMatch ? 'confirmed' : 'pending'
    });

    if (!isSoloMatch) {
      await enqueueMatchNotifications({
        type: 'match_request',
        recipients: ids,
        sender: req.user._id,
        match: match._id
      });
      await processDueJobs();
    }

    await populateMatchForResponse(match);
    res.status(201).json(match);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/matches - my matches
router.get('/', auth, async (req, res) => {
  try {
    const matches = await Match.find({ players: req.user._id })
      .populate('players', 'name location sports skillLevel')
      .populate('court')
      .sort({ createdAt: -1 });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/matches/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('players', 'name location sports skillLevel trustScore')
      .populate('court');
    if (!match) return res.status(404).json({ message: 'Match not found' });
    if (!match.players.some(p => String(p._id) === String(req.user._id))) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(match);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/matches/:id/accept - invited player accepts the request
router.put('/:id/accept', auth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    const isPlayer = match.players.some(p => String(p) === String(req.user._id));
    if (!isPlayer) return res.status(403).json({ message: 'Access denied' });
    if (String(match.initiator) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot accept your own request' });
    }
    if (match.status === 'confirmed') {
      await Notification.updateMany(
        { recipient: req.user._id, match: match._id, type: 'match_request' },
        { read: true }
      );
      await populateMatchForResponse(match);
      return res.json(match);
    }
    if (match.status !== 'pending') {
      return res.status(400).json({ message: `Match is already ${match.status}` });
    }

    match.status = 'confirmed';
    await match.save();

    await Notification.updateMany(
      { recipient: req.user._id, match: match._id, type: 'match_request' },
      { read: true }
    );

    await enqueueMatchNotifications({
      type: 'match_accepted',
      recipients: [match.initiator],
      sender: req.user._id,
      match: match._id
    });
    await processDueJobs();

    await populateMatchForResponse(match);
    res.json(match);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/matches/:id/decline - invited player declines the request
router.put('/:id/decline', auth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    const isPlayer = match.players.some(p => String(p) === String(req.user._id));
    if (!isPlayer) return res.status(403).json({ message: 'Access denied' });
    if (String(match.initiator) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot decline your own request' });
    }
    if (match.status !== 'pending') {
      return res.status(400).json({ message: `Match is already ${match.status}` });
    }

    match.status = 'cancelled';
    await match.save();

    await Notification.updateMany(
      { recipient: req.user._id, match: match._id, type: 'match_request' },
      { read: true }
    );

    await enqueueMatchNotifications({
      type: 'match_declined',
      recipients: [match.initiator],
      sender: req.user._id,
      match: match._id
    });
    await processDueJobs();

    await populateMatchForResponse(match);
    res.json(match);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/matches/:id/confirm
router.put('/:id/confirm', auth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: 'Match not found' });
    if (!match.players.some(p => String(p) === String(req.user._id))) {
      return res.status(403).json({ message: 'Access denied' });
    }
    match.status = 'confirmed';
    await match.save();

    if (String(match.initiator) !== String(req.user._id)) {
      await enqueueMatchNotifications({
        type: 'match_accepted',
        recipients: [match.initiator],
        sender: req.user._id,
        match: match._id
      });
      await processDueJobs();
    }

    await populateMatchForResponse(match);
    res.json(match);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/matches/:id/cancel
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: 'Match not found' });
    if (!match.players.some(p => String(p) === String(req.user._id))) {
      return res.status(403).json({ message: 'Access denied' });
    }
    match.status = 'cancelled';
    await match.save();

    const recipients = match.players
      .filter((playerId) => String(playerId) !== String(req.user._id))
      .map((playerId) => playerId);

    if (recipients.length) {
      await enqueueMatchNotifications({
        type: 'match_cancelled',
        recipients,
        sender: req.user._id,
        match: match._id
      });
      await processDueJobs();
    }

    res.json(match);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
