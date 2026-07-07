const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  sport: { type: String, required: true },
  playerCount: { type: Number, required: true, default: 2 },
  matchType: { type: String },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  initiator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hiddenFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  court: { type: mongoose.Schema.Types.ObjectId, ref: 'Court' },
  scheduledTime: { type: Date, default: Date.now },
  availability: { type: String, enum: ['Now', 'Evening', 'Weekend'], default: 'Now' },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  messages: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Match', matchSchema);
