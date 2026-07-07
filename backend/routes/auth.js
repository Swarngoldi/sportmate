const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const https = require('https');
const User = require('../models/User');
const { normalizeEmail, validateEmailForSignup } = require('../utils/emailValidation');
const {
  enqueueWelcomeEmail,
  enqueuePasswordResetEmail,
  processDueJobs
} = require('../services/notificationQueue');

const makeToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const frontendUrl = () => (process.env.FRONTEND_URL || 'http://localhost:5173/index.html').replace(/\/$/, '');
const forgotPasswordAttempts = new Map();
const FORGOT_PASSWORD_WINDOW_MS = 15 * 60 * 1000;
const FORGOT_PASSWORD_MAX_ATTEMPTS = 5;

const resetTokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex');

const checkForgotPasswordRateLimit = (key) => {
  const now = Date.now();
  const current = forgotPasswordAttempts.get(key);

  if (!current || current.resetAt <= now) {
    forgotPasswordAttempts.set(key, { count: 1, resetAt: now + FORGOT_PASSWORD_WINDOW_MS });
    return true;
  }

  if (current.count >= FORGOT_PASSWORD_MAX_ATTEMPTS) return false;

  current.count += 1;
  forgotPasswordAttempts.set(key, current);
  return true;
};

const userResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  location: user.location,
  sports: user.sports,
  preferredMatchType: user.preferredMatchType,
  skillLevel: user.skillLevel,
  availability: user.availability,
  trustScore: user.trustScore,
  avatar: user.avatar,
  authProvider: user.authProvider
});

const fetchJson = (url) => new Promise((resolve, reject) => {
  https.get(url, (response) => {
    let body = '';
    response.on('data', (chunk) => { body += chunk; });
    response.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(data.error_description || data.error || 'Google sign-in could not be verified'));
          return;
        }
        resolve(data);
      } catch {
        reject(new Error('Google verification response was invalid'));
      }
    });
  }).on('error', reject);
});

const verifyGoogleCredential = async (credential) => {
  const profile = await fetchJson(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (process.env.GOOGLE_CLIENT_ID && profile.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error('Google client ID mismatch');
  }
  if (profile.email_verified !== 'true' && profile.email_verified !== true) {
    throw new Error('Google email is not verified');
  }

  return profile;
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, address, lat, lng, sports, preferredMatchType, skillLevel, availability } = req.body;
    if (!name || !email || !password || !address) {
      return res.status(400).json({ message: 'Name, email, password and address are required' });
    }

    const emailCheck = await validateEmailForSignup(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ message: emailCheck.message });
    }

    const exists = await User.findOne({ email: emailCheck.email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({
      name, email: emailCheck.email, password,
      location: { address, lat, lng },
      sports: sports || [],
      preferredMatchType: preferredMatchType || 'Singles',
      skillLevel: skillLevel || 'Intermediate',
      availability: availability || 'Now',
      authProvider: 'local'
    });

    await enqueueWelcomeEmail(user._id);
    await processDueJobs();

    res.status(201).json({
      token: makeToken(user._id),
      user: userResponse(user)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    user.isOnline = true;
    await user.save();
    res.json({
      token: makeToken(user._id),
      user: userResponse(user)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: 'Google credential is required' });

    const profile = await verifyGoogleCredential(credential);
    const email = String(profile.email || '').toLowerCase();
    if (!email) return res.status(400).json({ message: 'Google account has no email address' });

    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await User.create({
        name: profile.name || email.split('@')[0],
        email,
        authProvider: 'google',
        googleId: profile.sub,
        emailVerified: true,
        avatar: profile.picture || '',
        location: { address: '', lat: null, lng: null },
        sports: []
      });
    } else {
      user.googleId = user.googleId || profile.sub;
      user.emailVerified = true;
      user.avatar = user.avatar || profile.picture || '';
      if (!user.password) user.authProvider = 'google';
      user.isOnline = true;
      await user.save();
    }

    if (isNewUser) {
      await enqueueWelcomeEmail(user._id);
      await processDueJobs();
    }

    res.json({
      token: makeToken(user._id),
      user: userResponse(user)
    });
  } catch (err) {
    res.status(401).json({ message: err.message || 'Google sign-in failed' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const rateLimitKey = `${req.ip}:${normalizedEmail}`;

    if (!checkForgotPasswordRateLimit(rateLimitKey)) {
      return res.status(429).json({ message: 'Too many reset attempts. Please try again later.' });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = resetTokenHash(rawToken);
      user.resetPasswordTokenHash = tokenHash;
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      const resetUrl = `${frontendUrl()}#/reset-password/${rawToken}?email=${encodeURIComponent(user.email)}`;
      await enqueuePasswordResetEmail(user._id, tokenHash, resetUrl);
      await processDueJobs();
    }

    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, password } = req.body;
    if (!email || !token || !password) {
      return res.status(400).json({ message: 'Email, token and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({
      email: String(email).toLowerCase(),
      resetPasswordTokenHash: resetTokenHash(token),
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) return res.status(400).json({ message: 'Reset link is invalid or expired' });

    user.password = password;
    if (user.authProvider === 'google') user.authProvider = 'local';
    user.resetPasswordTokenHash = '';
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      token: makeToken(user._id),
      user: userResponse(user)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
