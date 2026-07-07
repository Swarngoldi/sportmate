const Notification = require('../models/Notification');
const NotificationJob = require('../models/NotificationJob');
const Match = require('../models/Match');
const User = require('../models/User');
const { emitNotification, emitNotificationJobUpdate } = require('./realtime');
const {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendMatchNotificationEmail
} = require('./emailService');

let BullQueue;
let BullWorker;
let IORedis;

try {
  ({ Queue: BullQueue, Worker: BullWorker } = require('bullmq'));
  IORedis = require('ioredis');
} catch {
  BullQueue = null;
  BullWorker = null;
  IORedis = null;
}

const MATCH_TYPES = ['match_request', 'match_accepted', 'match_declined', 'match_cancelled'];
const BASE_RETRY_DELAY_MS = 1000;
const STALE_PROCESSING_MS = Number(process.env.NOTIFICATION_STALE_PROCESSING_MS || 2 * 60 * 1000);
const QUEUE_NAME = process.env.NOTIFICATION_QUEUE_NAME || 'sportmate-notifications';
const useBullQueue = () => Boolean(process.env.REDIS_URL && BullQueue && BullWorker && IORedis);
let bullConnection;
let bullQueue;
let queueMode = 'mongo';

const delayForAttempt = (attempts) => {
  const exponent = Math.max(0, attempts - 1);
  return BASE_RETRY_DELAY_MS * (2 ** exponent);
};

const getBullQueue = () => {
  if (!useBullQueue()) return null;
  if (!bullConnection) {
    bullConnection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null
    });
    bullConnection.on('error', (err) => {
      console.error('Redis notification connection error:', err.message);
    });
  }
  if (!bullQueue) {
    bullQueue = new BullQueue(QUEUE_NAME, { connection: bullConnection });
  }
  return bullQueue;
};

const enqueueBullJob = async (job) => {
  const queue = getBullQueue();
  if (!queue || !job) return;

  const delay = Math.max(0, new Date(job.nextAttemptAt || Date.now()).getTime() - Date.now());
  try {
    await queue.add(
      'deliver',
      { idempotencyKey: job.idempotencyKey },
      {
        jobId: `${job.idempotencyKey}:${job.attempts}:${new Date(job.nextAttemptAt || Date.now()).getTime()}`,
        delay,
        removeOnComplete: true,
        removeOnFail: 1000
      }
    );
  } catch (err) {
    console.error('Could not enqueue BullMQ notification job:', err.message);
  }
};

const makeJob = async ({ idempotencyKey, channel, type, recipient, sender, match, payload = {} }) => {
  const update = {
    $setOnInsert: {
      idempotencyKey,
      channel,
      type,
      recipient,
      sender,
      match,
      payload,
      status: 'queued',
      attempts: 0,
      maxAttempts: 5,
      nextAttemptAt: new Date()
    }
  };

  const job = await NotificationJob.findOneAndUpdate(
    { idempotencyKey },
    update,
    { upsert: true, new: true }
  );

  if (queueMode === 'bullmq' && ['queued', 'retrying'].includes(job.status)) {
    await enqueueBullJob(job);
  }

  if (job.status === 'queued') {
    await emitNotificationJobUpdate(job);
  }

  return job;
};

const enqueueEmailJob = (type, recipient, payload = {}) => makeJob({
  idempotencyKey: `${type}:${recipient}:${payload.resetTokenHash || Date.now()}:email`,
  channel: 'email',
  type,
  recipient,
  payload
});

const enqueueWelcomeEmail = async (userId) => {
  await makeJob({
    idempotencyKey: `welcome_email:${userId}:email`,
    channel: 'email',
    type: 'welcome_email',
    recipient: userId
  });
};

const enqueuePasswordResetEmail = async (userId, resetTokenHash, resetUrl) => {
  await enqueueEmailJob('password_reset', userId, { resetTokenHash, resetUrl });
};

const enqueueMatchNotifications = async ({ type, recipients, sender, match }) => {
  const recipientIds = Array.isArray(recipients) ? recipients : [recipients];
  const jobs = [];

  for (const recipient of recipientIds.filter(Boolean)) {
    jobs.push(makeJob({
      idempotencyKey: `${type}:${match}:${recipient}:${sender}:in_app`,
      channel: 'in_app',
      type,
      recipient,
      sender,
      match
    }));
    jobs.push(makeJob({
      idempotencyKey: `${type}:${match}:${recipient}:${sender}:email`,
      channel: 'email',
      type,
      recipient,
      sender,
      match
    }));
  }

  await Promise.all(jobs);
};

const deliverInApp = async (job) => {
  if (!MATCH_TYPES.includes(job.type)) return;

  let notification = await Notification.findOne({ deliveryKey: job.idempotencyKey });
  let created = false;

  if (!notification) {
    try {
      notification = await Notification.create({
        deliveryKey: job.idempotencyKey,
        recipient: job.recipient,
        sender: job.sender,
        match: job.match,
        type: job.type,
        read: false,
        createdAt: new Date()
      });
      created = true;
    } catch (err) {
      if (err.code !== 11000) throw err;
      notification = await Notification.findOne({ deliveryKey: job.idempotencyKey });
    }
  }

  if (created && notification?._id) {
    await emitNotification(notification._id);
  }
};

const deliverEmail = async (job) => {
  const recipient = await User.findById(job.recipient);
  if (!recipient) throw new Error('Recipient not found');
  if (job.type !== 'password_reset' && recipient.notificationPreferences?.email === false) return;

  if (job.type === 'welcome_email') {
    await sendWelcomeEmail(recipient);
    if (!recipient.welcomeEmailSentAt) {
      recipient.welcomeEmailSentAt = new Date();
      await recipient.save();
    }
    return;
  }

  if (job.type === 'password_reset') {
    await sendPasswordResetEmail(recipient, job.payload.resetUrl);
    return;
  }

  const [sender, match] = await Promise.all([
    User.findById(job.sender),
    Match.findById(job.match).populate('court')
  ]);

  if (!match) throw new Error('Match not found');
  await sendMatchNotificationEmail({ recipient, sender, match, type: job.type });
};

const deliverJob = async (job) => {
  if (job.channel === 'in_app') return deliverInApp(job);
  if (job.channel === 'email') return deliverEmail(job);
  throw new Error(`Unsupported channel ${job.channel}`);
};

const processJob = async (job) => {
  if (!job || ['delivered', 'dead'].includes(job.status)) return job;
  if (job.nextAttemptAt && job.nextAttemptAt > new Date()) return job;

  job.status = 'processing';
  job.lockedAt = new Date();
  await job.save();
  await emitNotificationJobUpdate(job);

  try {
    await deliverJob(job);
    job.status = 'delivered';
    job.deliveredAt = new Date();
    job.lastError = '';
    await job.save();
    await emitNotificationJobUpdate(job);
  } catch (err) {
    job.attempts += 1;
    job.lastError = err.message;
    job.lockedAt = undefined;

    if (job.attempts >= job.maxAttempts) {
      job.status = 'dead';
      job.deadLetterReason = err.message;
    } else {
      job.status = 'retrying';
      job.nextAttemptAt = new Date(Date.now() + delayForAttempt(job.attempts));
    }

    await job.save();
    await emitNotificationJobUpdate(job);

    if (queueMode === 'bullmq' && job.status === 'retrying') {
      await enqueueBullJob(job);
    }
  }

  return job;
};

const processJobByKey = async (idempotencyKey) => {
  const job = await NotificationJob.findOne({ idempotencyKey });
  if (!job) return null;
  return processJob(job);
};

const recoverStaleProcessingJobs = async () => {
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);
  const staleJobs = await NotificationJob.find({
    status: 'processing',
    lockedAt: { $lte: staleBefore }
  }).limit(50);

  for (const job of staleJobs) {
    job.attempts += 1;
    job.lockedAt = undefined;
    job.lastError = 'Worker stopped while processing this job';

    if (job.attempts >= job.maxAttempts) {
      job.status = 'dead';
      job.deadLetterReason = job.lastError;
    } else {
      job.status = 'retrying';
      job.nextAttemptAt = new Date(Date.now() + delayForAttempt(job.attempts));
    }

    await job.save();
    await emitNotificationJobUpdate(job);

    if (queueMode === 'bullmq' && job.status === 'retrying') {
      await enqueueBullJob(job);
    }
  }

  return staleJobs.length;
};

const processDueJobs = async ({ limit = 25 } = {}) => {
  if (queueMode === 'bullmq') return 0;

  await recoverStaleProcessingJobs();

  const baseFilter = {
    status: { $in: ['queued', 'retrying'] },
    nextAttemptAt: { $lte: new Date() }
  };

  const inAppLimit = Math.ceil(limit * 0.7);
  const inAppJobs = await NotificationJob.find({ ...baseFilter, channel: 'in_app' })
    .sort({ createdAt: 1 })
    .limit(inAppLimit);

  const remaining = Math.max(0, limit - inAppJobs.length);
  const emailJobs = remaining
    ? await NotificationJob.find({ ...baseFilter, channel: 'email' })
      .sort({ createdAt: 1 })
      .limit(remaining)
    : [];

  const jobs = [...inAppJobs, ...emailJobs];

  for (const job of jobs) {
    await processJob(job);
  }

  return jobs.length;
};

const retryNotificationJob = async ({ jobId, recipient }) => {
  const job = await NotificationJob.findOne({ _id: jobId, recipient });
  if (!job) return null;
  if (!['dead', 'retrying'].includes(job.status)) return job;

  job.status = 'queued';
  job.attempts = 0;
  job.nextAttemptAt = new Date();
  job.lastError = '';
  job.deadLetterReason = '';
  job.lockedAt = undefined;
  await job.save();
  await emitNotificationJobUpdate(job);

  if (queueMode === 'bullmq') {
    await enqueueBullJob(job);
  }

  return job;
};

const startNotificationWorker = () => {
  if (useBullQueue()) {
    try {
      getBullQueue();
      const concurrency = Number(process.env.NOTIFICATION_WORKER_CONCURRENCY || 10);
      const worker = new BullWorker(
        QUEUE_NAME,
        async (bullJob) => {
          await processJobByKey(bullJob.data.idempotencyKey);
        },
        { connection: bullConnection, concurrency }
      );

      worker.on('failed', (job, err) => {
        console.error('BullMQ notification job failed:', job?.id, err.message);
      });

      queueMode = 'bullmq';
      console.log(`Notification worker using BullMQ queue "${QUEUE_NAME}"`);
      return worker;
    } catch (err) {
      console.error('BullMQ unavailable, falling back to Mongo notification worker:', err.message);
    }
  }

  queueMode = 'mongo';
  const intervalMs = Number(process.env.NOTIFICATION_WORKER_INTERVAL_MS || 5000);
  const run = () => {
    processDueJobs().catch((err) => console.error('Notification worker error:', err.message));
  };

  run();
  console.log('Notification worker using Mongo polling fallback');
  return setInterval(run, intervalMs);
};

module.exports = {
  enqueueWelcomeEmail,
  enqueuePasswordResetEmail,
  enqueueMatchNotifications,
  processDueJobs,
  retryNotificationJob,
  startNotificationWorker
};
