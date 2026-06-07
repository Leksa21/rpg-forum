const mongoose = require('mongoose');

const regionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: '' },
    mapCoords: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    climate: {
      type: String,
      enum: ['temperate', 'arctic', 'desert', 'tropical', 'volcanic', 'shadowlands'],
      default: 'temperate',
    },
    lore: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Region', regionSchema);
