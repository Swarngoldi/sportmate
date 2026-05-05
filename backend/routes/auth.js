const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const makeToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, address, lat, lng, sports, preferredMatchType, skillLevel, availability } = req.body;
    if (!name || !email || !password || !address) {
      return res.status(400).json({ message: 'Name, email, password and address are required' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({
      name, email, password,
      location: { address, lat: lat || 21.1458, lng: lng || 79.0882 },
      sports: sports || [],
      preferredMatchType: preferredMatchType || 'Singles',
      skillLevel: skillLevel || 'Intermediate',
      availability: availability || 'Now'
    });

    res.status(201).json({
      token: makeToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        location: user.location,
        sports: user.sports,
        preferredMatchType: user.preferredMatchType,
        skillLevel: user.skillLevel,
        availability: user.availability,
        trustScore: user.trustScore
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    user.isOnline = true;
    await user.save();
    res.json({
      token: makeToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        location: user.location,
        sports: user.sports,
        preferredMatchType: user.preferredMatchType,
        skillLevel: user.skillLevel,
        availability: user.availability,
        trustScore: user.trustScore
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
