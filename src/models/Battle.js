const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema(
  { q: { type: Number, required: true }, r: { type: Number, required: true } },
  { _id: false }
);

const unitSchema = new mongoose.Schema(
  {
    character: { type: mongoose.Schema.Types.ObjectId, ref: 'Character', required: true },
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',      required: true },
    side:      { type: String, enum: ['attacker', 'defender'], required: true },
    name:      { type: String, required: true },
    avatar:    { type: String, default: null },
    position:  { type: positionSchema, required: true },
    hp:        { type: Number, required: true },
    maxHp:     { type: Number, required: true },
    ap:        { type: Number, default: 6 },
  },
  { _id: false }
);

const logEntrySchema = new mongoose.Schema(
  {
    turn:      { type: Number, required: true },
    actor:     { type: mongoose.Schema.Types.ObjectId, ref: 'Character' },
    action: {
      type: String,
      enum: ['move', 'attack', 'end_turn', 'surrender', 'timeout_forfeit', 'battle_start'],
      required: true,
    },
    from:      { type: positionSchema, default: null },
    to:        { type: positionSchema, default: null },
    damage:    { type: Number, default: null },
    message:   { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const battleSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'declined'],
      default: 'pending',
    },
    triggerType: {
      type: String,
      enum: ['challenge', 'travel'],
      default: 'challenge',
    },
    gridWidth:         { type: Number, default: 30 },
    gridHeight:        { type: Number, default: 30 },
    units:             [unitSchema],
    currentTurn:       { type: mongoose.Schema.Types.ObjectId, ref: 'Character', default: null },
    turnNumber:        { type: Number, default: 1 },
    turnDeadlineHours: { type: Number, default: 24 },
    turnDeadline:      { type: Date, default: null },
    log:               [logEntrySchema],
    winner:            { type: mongoose.Schema.Types.ObjectId, ref: 'Character', default: null },
    location:          { type: mongoose.Schema.Types.ObjectId, ref: 'Location',  default: null },
  },
  { timestamps: true, optimisticConcurrency: true }
);

battleSchema.index({ 'units.user': 1, status: 1 });
battleSchema.index({ 'units.character': 1, status: 1 });

module.exports = mongoose.model('Battle', battleSchema);
