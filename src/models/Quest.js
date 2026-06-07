const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema(
  {
    xp:    { type: Number, default: 0 },
    gold:  { type: Number, default: 0 },
    items: [{ type: String }],
  },
  { _id: false }
);

const participantSchema = new mongoose.Schema(
  {
    character: { type: mongoose.Schema.Types.ObjectId, ref: 'Character', required: true },
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt:  { type: Date, default: Date.now },
    status:    { type: String, enum: ['active', 'completed', 'abandoned'], default: 'active' },
  },
  { _id: false }
);

const questSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ['automatic', 'admin', 'player', 'npc'],
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'completed', 'cancelled'],
      default: 'open',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    location:  { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
    npcGiver:  { type: String, default: null },

    requirements: {
      minLevel:    { type: Number, default: 1 },
      maxPlayers:  { type: Number, default: 5 },
      classFilter: [{ type: String }],
    },
    reward: { type: rewardSchema, default: () => ({}) },
    participants: [participantSchema],

    trigger:   { type: String, default: null },
    expiresAt: { type: Date, default: null },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

questSchema.index({ status: 1, type: 1 });
questSchema.index({ location: 1 });

module.exports = mongoose.model('Quest', questSchema);
