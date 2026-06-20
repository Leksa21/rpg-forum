const Character = require('../models/Character');

const VENUE_MOVE_SECS = 10;

const getMyCharacter = async (req, res) => {
  try {
    const character = await Character.findOneAndUpdate(
      { owner: req.userId, isDead: false },
      { lastActiveAt: new Date() },
      { new: true },
    )
      .populate('discoveredLocations', 'name icon mapCoords')
      .populate('currentLocation', 'name icon')
      .populate('currentVenue', 'name icon');
    if (!character) {
      return res.status(404).json({ success: false, error: 'No character found' });
    }
    res.json({ success: true, data: character });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getActiveCharacters = async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const characters = await Character.find({
      isDead: false,
      isSetup: true,
      lastActiveAt: { $gte: cutoff },
    })
      .select('name class race level avatar tagline lastActiveAt injuredUntil wounds')
      .sort({ lastActiveAt: -1 })
      .limit(50);
    res.json({ success: true, data: characters });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const discoverLocation = async (req, res) => {
  try {
    const { locationId } = req.body;
    if (!locationId) return res.status(400).json({ success: false, error: 'locationId required' });

    await Character.findOneAndUpdate(
      { owner: req.userId, isDead: false },
      { $addToSet: { discoveredLocations: locationId } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Move within the current city to a venue. Takes ~10s (a light walk) so players
// can't teleport-spam between rooms. Position only; forum visibility is by city.
const moveVenue = async (req, res) => {
  try {
    const { venueId } = req.body;
    const character = await Character.findOne({ owner: req.userId, isDead: false });
    if (!character) return res.status(404).json({ success: false, error: 'No character' });

    if (!venueId) {
      character.currentVenue = null;
      character.venueArrivalAt = null;
      await character.save();
      return res.json({ success: true, data: { currentVenue: null, venueArrivalAt: null } });
    }

    const SubLocation = require('../models/SubLocation');
    const Location = require('../models/Location');
    const venue = await SubLocation.findById(venueId).select('city');
    if (!venue) return res.status(404).json({ success: false, error: 'Venue not found' });

    const cityId = character.currentLocation
      || (await Location.findOne({ isStartingLocation: true }).select('_id'))?._id;
    if (!cityId || String(venue.city) !== String(cityId)) {
      return res.status(403).json({ success: false, error: 'That place is not in your city' });
    }

    character.currentVenue = venueId;
    character.venueArrivalAt = new Date(Date.now() + VENUE_MOVE_SECS * 1000);
    await character.save();

    res.json({ success: true, data: { currentVenue: venueId, venueArrivalAt: character.venueArrivalAt } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getAllMyCharacters = async (req, res) => {
  try {
    const characters = await Character.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: characters });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const createCharacter = async (req, res) => {
  try {
    const living = await Character.findOne({ owner: req.userId, isDead: false });
    if (living) {
      return res.status(400).json({ success: false, error: 'You already have a living character' });
    }

    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Character name is required' });
    }

    const character = await Character.create({
      owner: req.userId,
      name: name.trim(),
      isSetup: false,
      isDead: false,
    });

    res.status(201).json({ success: true, data: character });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const setupCharacter = async (req, res) => {
  try {
    const character = await Character.findOne({ owner: req.userId, isDead: false });
    if (!character) {
      return res.status(404).json({ success: false, error: 'No character found' });
    }

    const { class: charClass, race, avatar } = req.body;
    if (!charClass || !race) {
      return res.status(400).json({ success: false, error: 'Class and race are required' });
    }

    const validClasses = ['Warrior', 'Mage', 'Rogue', 'Paladin', 'Ranger', 'Necromancer', 'Druid', 'Bard'];
    const validRaces   = ['Human', 'Elf', 'Dwarf', 'Orc', 'Halfling', 'Tiefling', 'Dragonborn', 'Gnome'];

    if (!validClasses.includes(charClass)) return res.status(400).json({ success: false, error: 'Invalid class' });
    if (!validRaces.includes(race))        return res.status(400).json({ success: false, error: 'Invalid race' });

    character.class   = charClass;
    character.race    = race;
    character.isSetup = true;
    if (avatar) character.avatar = avatar;

    await character.save();
    res.json({ success: true, data: character });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getPublicCharacter = async (req, res) => {
  try {
    const character = await Character.findById(req.params.id)
      .select('name class race level avatar fullBodyAvatar tagline backstory isDead currentLocation createdAt wounds injuredUntil')
      .populate('currentLocation', 'name icon');

    if (!character) return res.status(404).json({ success: false, error: 'Character not found' });
    res.json({ success: true, data: character });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { avatar, tagline, fullBodyAvatar } = req.body;

    const updates = {};
    if (avatar !== undefined)        updates.avatar        = avatar?.slice(0, 10)  ?? null;
    if (tagline !== undefined)       updates.tagline       = tagline?.slice(0, 150) ?? '';
    if (fullBodyAvatar !== undefined) updates.fullBodyAvatar = fullBodyAvatar?.slice(0, 500) ?? null;

    const character = await Character.findOneAndUpdate(
      { owner: req.userId, isDead: false },
      updates,
      { new: true },
    );
    if (!character) return res.status(404).json({ success: false, error: 'No character found' });
    res.json({ success: true, data: character });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const updateBackstory = async (req, res) => {
  try {
    const { backstory } = req.body;
    const character = await Character.findOneAndUpdate(
      { owner: req.userId, isDead: false },
      { backstory: backstory?.slice(0, 2000) || '' },
      { new: true }
    );
    if (!character) return res.status(404).json({ success: false, error: 'No character found' });
    res.json({ success: true, data: character });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getMyCharacter, getAllMyCharacters, createCharacter, setupCharacter, updateBackstory, updateProfile, getPublicCharacter, getActiveCharacters, discoverLocation, moveVenue };
