const mongoose = require('mongoose');

const statsSchema = new mongoose.Schema(
  {
    strength: { type: Number, default: 10, min: 1, max: 100 },
    dexterity: { type: Number, default: 10, min: 1, max: 100 },
    intelligence: { type: Number, default: 10, min: 1, max: 100 },
    endurance: { type: Number, default: 10, min: 1, max: 100 },
    charisma: { type: Number, default: 10, min: 1, max: 100 },
    wisdom: { type: Number, default: 10, min: 1, max: 100 },
  },
  { _id: false }
);

const characterSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Character must belong to a user'],
    },
    name: {
      type: String,
      required: [true, 'Character name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    class: {
      type: String,
      default: null,
      enum: [null, 'Warrior', 'Mage', 'Rogue', 'Paladin', 'Ranger', 'Necromancer', 'Druid', 'Bard'],
    },
    race: {
      type: String,
      default: null,
      enum: [null, 'Human', 'Elf', 'Dwarf', 'Orc', 'Halfling', 'Tiefling', 'Dragonborn', 'Gnome'],
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
      max: 100,
    },
    experience: {
      type: Number,
      default: 0,
      min: 0,
    },
    stats: {
      type: statsSchema,
      default: () => ({}),
    },
    backstory: {
      type: String,
      maxlength: [2000, 'Backstory cannot exceed 2000 characters'],
      default: '',
    },
    avatar: {
      type: String,
      default: null,
    },
    isDead: {
      type: Boolean,
      default: false,
    },
    isSetup: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    currentLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Character', characterSchema);
