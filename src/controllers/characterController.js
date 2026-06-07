const Character = require('../models/Character');

const getMyCharacter = async (req, res) => {
  try {
    const character = await Character.findOne({ owner: req.userId, isDead: false });
    if (!character) {
      return res.status(404).json({ success: false, error: 'No character found' });
    }
    res.json({ success: true, data: character });
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

module.exports = { getMyCharacter, getAllMyCharacters, createCharacter, setupCharacter, updateBackstory };
