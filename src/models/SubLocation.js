const mongoose = require('mongoose');

const subLocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        // districts / area containers
        'district', 'quarter', 'square', 'park', 'bridge', 'gate', 'wilds', 'venue',
        // classic named venues
        'tavern', 'blacksmith', 'temple', 'guard', 'prison', 'market',
        'library', 'arena', 'docks', 'palace', 'guild', 'dungeon', 'residence',
      ],
      default: 'venue',
    },
    // The owning city (Location). Denormalized on EVERY venue regardless of nesting
    // depth so visibility ("am I in this city?") is a single direct comparison.
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
    // Self-reference for arbitrary-depth nesting. null = direct child of the city;
    // set = nested inside another venue (e.g. "Spavaći deo" inside "Kafana Griffin").
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'SubLocation', default: null },
    description: { type: String, default: '' },
    lore: { type: String, default: '' },
    image: { type: String, default: null },
    icon: { type: String, default: '🏠' },
    order: { type: Number, default: 0 },
    isAccessible: { type: Boolean, default: true },
    npcName: { type: String, default: null },
    npcRole: { type: String, default: null },
  },
  { timestamps: true }
);

// Fast lookups: children of a city, and children of a venue.
subLocationSchema.index({ city: 1, parent: 1, order: 1 });

module.exports = mongoose.model('SubLocation', subLocationSchema);
