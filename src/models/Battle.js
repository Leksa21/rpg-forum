const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema(
  { q: { type: Number, required: true }, r: { type: Number, required: true } },
  { _id: false }
);

const unitSchema = new mongoose.Schema(
  {
    character:    { type: mongoose.Schema.Types.ObjectId, ref: 'Character', required: true },
    user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User',      required: true },
    side:         { type: String, enum: ['attacker', 'defender'], required: true },
    name:         { type: String, required: true },
    avatar:       { type: String, default: null },
    position:     { type: positionSchema, required: true },
    hp:           { type: Number, required: true },
    maxHp:        { type: Number, required: true },
    ap:           { type: Number, default: 6 },
    mana:         { type: Number, default: 0 },
    maxMana:      { type: Number, default: 0 },
    energy:       { type: Number, default: 20 },
    maxEnergy:    { type: Number, default: 20 },
    knownSpells:  { type: [String], default: [] },
    pendingApMod: { type: Number, default: 0 },
  },
  { _id: false }
);

const zoneSchema = new mongoose.Schema(
  {
    spellId:        { type: String, required: true },
    ownerCharacter: { type: mongoose.Schema.Types.ObjectId, ref: 'Character', required: true },
    hexes:          { type: [positionSchema], default: [] },
    damage:         { type: Number, default: 0 },
    turnsLeft:      { type: Number, required: true },
    name:           { type: String, default: '' },
    icon:           { type: String, default: '' },
    color:          { type: String, default: '' },
  },
  { _id: false }
);

const turnActionSchema = new mongoose.Schema(
  {
    type:       { type: String, enum: ['move', 'attack', 'cast', 'zone_tick'], required: true },
    from:       { type: positionSchema, default: null },
    to:         { type: positionSchema, default: null },
    damage:     { type: Number, default: null },
    message:    { type: String, default: '' },
    spellId:    { type: String, default: null },
    target:     { type: positionSchema, default: null },
    spellKind:  { type: String, default: null },
    heal:       { type: Number, default: null },
    hexes:      { type: [positionSchema], default: undefined },
    isReaction: { type: Boolean, default: false },
  },
  { _id: false }
);

const logEntrySchema = new mongoose.Schema(
  {
    turn:      { type: Number, required: true },
    actor:     { type: mongoose.Schema.Types.ObjectId, ref: 'Character' },
    action: {
      type: String,
      enum: ['move', 'attack', 'cast', 'zone_tick', 'end_turn', 'surrender', 'timeout_forfeit', 'battle_start'],
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

const deathRollSchema = new mongoose.Schema(
  {
    roll:     { type: Number, required: true },
    modifier: { type: Number, required: true },
    dc:       { type: Number, required: true },
    total:    { type: Number, required: true },
    survived: { type: Boolean, required: true },
  },
  { _id: false }
);

const rewardsSchema = new mongoose.Schema(
  {
    settled:            { type: Boolean, default: false },
    winnerXp:           { type: Number, default: 0 },
    loserXp:            { type: Number, default: 0 },
    winnerLevelsGained: { type: Number, default: 0 },
    winnerNewLevel:     { type: Number, default: null },
    loserActiveWounds:  { type: Number, default: 0 },
    loserDied:          { type: Boolean, default: false },
    deathRoll:          { type: deathRollSchema, default: null },
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
      enum: ['challenge', 'travel', 'encounter'],
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
    lastTurnActions:   { type: [turnActionSchema], default: [] },
    lastTurnActor:     { type: mongoose.Schema.Types.ObjectId, ref: 'Character', default: null },
    activeZones:       { type: [zoneSchema], default: [] },
    rewards:           { type: rewardsSchema, default: null },
  },
  { timestamps: true, optimisticConcurrency: true }
);

battleSchema.index({ 'units.user': 1, status: 1 });
battleSchema.index({ 'units.character': 1, status: 1 });

module.exports = mongoose.model('Battle', battleSchema);
