const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');
const NotificationJob = require('../models/NotificationJob');
const { processDueJobs } = require('../services/notificationQueue');
const { emitUnreadCount } = require('../services/realtime');

const populateNotification = [
  { path: 'sender', select: 'name location sports skillLevel' },
  {
    path: 'match',
    populate: [
      { path: 'players', select: 'name location sports skillLevel' },
      { path: 'court' }
    ]
  }
];

// GET /api/notifications - notifications for the signed-in user
router.get('/', auth, async (req, res) => {
  try {
    await processDueJobs();

    const notifications = await Notification.find({ recipient: req.user._id })
      .populate(populateNotification)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', auth, async (req, res) => {
  try {
    await processDueJobs();

    const count = await Notification.countDocuments({
      recipient: req.user._id,
      read: false
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/notifications/delivery-status - queue status for my notification jobs
router.get('/delivery-status', auth, async (req, res) => {
  try {
    await processDueJobs();

    const jobs = await NotificationJob.find({ recipient: req.user._id })
      .select('channel type status attempts maxAttempts nextAttemptAt lastError deadLetterReason createdAt deliveredAt')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/notifications/mark-all-read
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );

    await emitUnreadCount(req.user._id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true },
      { new: true }
    ).populate(populateNotification);

    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    await emitUnreadCount(req.user._id);
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
