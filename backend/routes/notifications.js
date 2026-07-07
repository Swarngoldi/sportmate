const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');
const NotificationJob = require('../models/NotificationJob');
const { processDueJobs, retryNotificationJob } = require('../services/notificationQueue');
const { emitUnreadCount } = require('../services/realtime');

const populateNotification = [
  { path: 'sender', select: 'name email location sports skillLevel' },
  {
    path: 'match',
    populate: [
      { path: 'players', select: 'name email location sports skillLevel' },
      { path: 'initiator', select: 'name email' },
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

// GET /api/notifications/delivery-dashboard - delivery health for my notification jobs
router.get('/delivery-dashboard', auth, async (req, res) => {
  try {
    await processDueJobs();

    const [statusCounts, channelCounts, recentJobs, deadLetterJobs] = await Promise.all([
      NotificationJob.aggregate([
        { $match: { recipient: req.user._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      NotificationJob.aggregate([
        { $match: { recipient: req.user._id } },
        { $group: { _id: '$channel', count: { $sum: 1 } } }
      ]),
      NotificationJob.find({ recipient: req.user._id })
        .select('channel type status attempts maxAttempts nextAttemptAt lastError deadLetterReason createdAt deliveredAt updatedAt')
        .sort({ createdAt: -1 })
        .limit(25),
      NotificationJob.find({ recipient: req.user._id, status: 'dead' })
        .select('channel type status attempts maxAttempts lastError deadLetterReason createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .limit(10)
    ]);

    const toCountMap = (items) => items.reduce((acc, item) => {
      acc[item._id || 'unknown'] = item.count;
      return acc;
    }, {});

    res.json({
      queueMode: process.env.REDIS_URL ? 'bullmq-ready' : 'mongo',
      summary: {
        byStatus: toCountMap(statusCounts),
        byChannel: toCountMap(channelCounts)
      },
      recentJobs,
      deadLetterJobs
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/notifications/jobs/:id/retry - retry my failed delivery job
router.put('/jobs/:id/retry', auth, async (req, res) => {
  try {
    const job = await retryNotificationJob({ jobId: req.params.id, recipient: req.user._id });
    if (!job) return res.status(404).json({ message: 'Notification job not found' });

    await processDueJobs();
    res.json({
      _id: job._id,
      channel: job.channel,
      type: job.type,
      status: job.status,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      nextAttemptAt: job.nextAttemptAt,
      lastError: job.lastError,
      deadLetterReason: job.deadLetterReason,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    });
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
