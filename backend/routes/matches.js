const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Match = require('../models/Match');
const User = require('../models/User');

// POST /api/matches - create a match request
router.post('/', auth, async (req, res) => {
  try {
    const { sport, playerCount, playerIds, courtId, availability } = req.body;
    const ids = Array.isArray(playerIds)
      ? playerIds
      : String(playerIds || '').split(',').filter(Boolean);

    if (!courtId) {
      return res.status(400).json({ message: 'Court is required' });
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

    const match = await Match.create({
      sport,
      playerCount: playerCount !== undefined ? playerCount : ids.length,
      players: [req.user._id, ...ids],
      initiator: req.user._id,
      court: courtId,
      availability: availability || 'Now',
      status: 'pending'
    });
    await match.populate(['players', 'court']);
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
    await match.populate('players', 'name').populate('court');
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
    res.json(match);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
