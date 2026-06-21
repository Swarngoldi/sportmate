const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Match = require('../models/Match');

// GET /api/chat/:matchId - get messages
router.get('/:matchId', auth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId)
      .populate('messages.sender', 'name');
    if (!match) return res.status(404).json({ message: 'Match not found' });
    if (!match.players.some(p => String(p) === String(req.user._id))) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (match.status !== 'confirmed') {
      return res.status(403).json({ message: 'Chat opens after the match is confirmed' });
    }
    res.json(match.messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/chat/:matchId - send message
router.post('/:matchId', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Message cannot be empty' });

    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ message: 'Match not found' });
    if (!match.players.some(p => String(p) === String(req.user._id))) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (match.status !== 'confirmed') {
      return res.status(403).json({ message: 'Chat opens after the match is confirmed' });
    }

    match.messages.push({ sender: req.user._id, text: text.trim() });
    await match.save();
    await match.populate('messages.sender', 'name');
    const lastMessage = match.messages[match.messages.length - 1];
    res.status(201).json(lastMessage);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
