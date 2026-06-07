const mongoose = require('mongoose');

const subLocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['tavern', 'blacksmith', 'temple', 'guard', 'prison', 'market', 'library', 'arena', 'docks', 'palace', 'guild', 'dungeon'],
      required: true,
    },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '🏠' },
    isAccessible: { type: Boolean, default: true },
    npcName: { type: String, default: null },
    npcRole: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SubLocation', subLocationSchema);
