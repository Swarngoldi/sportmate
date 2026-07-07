const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');
const User = require('../models/User');

let io;

const userRoom = (userId) => `user:${userId}`;

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

const getAllowedOrigins = () => {
  const configured = process.env.CORS_ORIGIN || 'http://localhost:5173';
  return configured.split(',').map((origin) => origin.trim()).filter(Boolean);
};

const initRealtime = (server) => {
  io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('No token'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id');
      if (!user) return next(new Error('User not found'));

      socket.userId = String(user._id);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    socket.join(userRoom(socket.userId));
    socket.emit('realtime:connected', { userId: socket.userId });
    await emitUnreadCount(socket.userId);
  });

  return io;
};

const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return;
  io.to(userRoom(String(userId))).emit(event, payload);
};

const emitUnreadCount = async (userId) => {
  if (!io || !userId) return;
  const count = await Notification.countDocuments({ recipient: userId, read: false });
  emitToUser(userId, 'notifications:unread-count', { count });
};

const emitNotification = async (notificationId) => {
  if (!io || !notificationId) return;
  const notification = await Notification.findById(notificationId).populate(populateNotification);
  if (!notification) return;

  emitToUser(notification.recipient, 'notification:new', { notification });
  await emitUnreadCount(notification.recipient);
};

const emitNotificationJobUpdate = async (job) => {
  if (!io || !job?.recipient) return;

  emitToUser(job.recipient, 'notification-job:update', {
    job: {
      _id: job._id,
      channel: job.channel,
      type: job.type,
      status: job.status,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      nextAttemptAt: job.nextAttemptAt,
      lastError: job.lastError,
      deadLetterReason: job.deadLetterReason,
      deliveredAt: job.deliveredAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    }
  });
};

module.exports = {
  initRealtime,
  emitUnreadCount,
  emitNotification,
  emitNotificationJobUpdate
};
