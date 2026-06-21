const mongoose = require('mongoose');

const notificationJobSchema = new mongoose.Schema({
  idempotencyKey: { type: String, required: true, unique: true },
  channel: { type: String, enum: ['in_app', 'email'], required: true },
  type: {
    type: String,
    enum: ['welcome_email', 'password_reset', 'match_request', 'match_accepted', 'match_declined', 'match_cancelled'],
    required: true
  },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: {
    type: String,
    enum: ['queued', 'processing', 'delivered', 'retrying', 'dead'],
    default: 'queued'
  },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  nextAttemptAt: { type: Date, default: Date.now },
  lastError: { type: String, default: '' },
  deadLetterReason: { type: String, default: '' },
  lockedAt: { type: Date },
  deliveredAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

notificationJobSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });
notificationJobSchema.index({ recipient: 1, status: 1, createdAt: -1 });

notificationJobSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('NotificationJob', notificationJobSchema);
