const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    type: {
      type: String,
      enum: ['village', 'town', 'city', 'fortress', 'dungeon', 'ruins', 'outpost'],
      default: 'town',
    },
    region: { type: mongoose.Schema.Types.ObjectId, ref: 'Region', required: true },
    description: { type: String, default: '' },
    lore: { type: String, default: '' },
    mapCoords: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    connectedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Location' }],
    dangerLevel: {
      type: String,
      enum: ['safe', 'low', 'medium', 'high', 'deadly'],
      default: 'safe',
    },
    faction: { type: String, default: 'Neutral' },
    icon: { type: String, default: '🏘️' },
    isStartingLocation: { type: Boolean, default: false },
    population: { type: Number, default: 0 },
    theme: {
      gradient:    { type: String, default: 'linear-gradient(160deg, #0a0a14 0%, #141428 100%)' },
      accentColor: { type: String, default: '#c9a84c' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Location', locationSchema);
