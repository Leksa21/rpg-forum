const mongoose = require('mongoose');

// One scripted NPC per venue. `persona` is flavor now and becomes the AI
// context when we later swap clickable topics for a live model — the rest of
// the shape stays the same.
const npcTopicSchema = new mongoose.Schema(
  { label: { type: String, default: '' }, response: { type: String, default: '' } },
  { _id: false }
);
const npcSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    name: { type: String, default: '' },
    role: { type: String, default: '' },
    avatar: { type: String, default: '🧑' },
    persona: { type: String, default: '' },
    greeting: { type: String, default: '' },
    topics: { type: [npcTopicSchema], default: [] },
  },
  { _id: false }
);

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
    // When false (default), only staff may open threads here; players reply only.
    // When true, present players may also open new threads (the "button" case).
    allowPlayerThreads: { type: Boolean, default: false },
    isAccessible: { type: Boolean, default: true },
    npcName: { type: String, default: null },
    npcRole: { type: String, default: null },
    // Interactive NPC (one per venue). Drives the "Speak with…" panel.
    npc: { type: npcSchema, default: () => ({}) },
  },
  { timestamps: true }
);

// Fast lookups: children of a city, and children of a venue.
subLocationSchema.index({ city: 1, parent: 1, order: 1 });

module.exports = mongoose.model('SubLocation', subLocationSchema);
