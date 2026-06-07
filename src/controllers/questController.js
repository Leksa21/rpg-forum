const Quest = require('../models/Quest');
const Character = require('../models/Character');

const getQuests = async (req, res) => {
  try {
    const { type, status = 'open', location } = req.query;
    const filter = { status };
    if (type) filter.type = type;
    if (location) filter.location = location;

    const quests = await Quest.find(filter)
      .populate('location', 'name icon')
      .populate('createdBy', 'username')
      .sort({ isFeatured: -1, createdAt: -1 });

    res.json({ success: true, data: quests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getQuest = async (req, res) => {
  try {
    const quest = await Quest.findById(req.params.id)
      .populate('location', 'name icon type')
      .populate('createdBy', 'username')
      .populate('participants.character', 'name avatar class race level');

    if (!quest) return res.status(404).json({ success: false, error: 'Quest not found' });
    res.json({ success: true, data: quest });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const createQuest = async (req, res) => {
  try {
    const quest = await Quest.create({ ...req.body, createdBy: req.userId });
    res.status(201).json({ success: true, data: quest });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const applyQuest = async (req, res) => {
  try {
    const quest = await Quest.findById(req.params.id);
    if (!quest) return res.status(404).json({ success: false, error: 'Quest not found' });
    if (quest.status !== 'open') return res.status(400).json({ success: false, error: 'Quest is not open' });

    const character = await Character.findOne({ owner: req.userId, isSetup: true, isDead: false });
    if (!character) return res.status(400).json({ success: false, error: 'No active character' });

    if (character.level < quest.requirements.minLevel) {
      return res.status(400).json({ success: false, error: `Requires level ${quest.requirements.minLevel}` });
    }

    const alreadyIn = quest.participants.some(p => p.user.toString() === req.userId);
    if (alreadyIn) return res.status(400).json({ success: false, error: 'Already participating' });

    if (quest.participants.filter(p => p.status === 'active').length >= quest.requirements.maxPlayers) {
      return res.status(400).json({ success: false, error: 'Quest is full' });
    }

    quest.participants.push({ character: character._id, user: req.userId });
    if (quest.status === 'open' && quest.participants.length > 0) quest.status = 'in_progress';

    await quest.save();
    res.json({ success: true, data: quest });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const abandonQuest = async (req, res) => {
  try {
    const quest = await Quest.findById(req.params.id);
    if (!quest) return res.status(404).json({ success: false, error: 'Quest not found' });

    const participant = quest.participants.find(p => p.user.toString() === req.userId);
    if (!participant) return res.status(400).json({ success: false, error: 'Not participating' });

    participant.status = 'abandoned';
    await quest.save();
    res.json({ success: true, data: quest });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const completeQuest = async (req, res) => {
  try {
    const quest = await Quest.findById(req.params.id)
      .populate('participants.character');

    if (!quest) return res.status(404).json({ success: false, error: 'Quest not found' });

    const activeParticipants = quest.participants.filter(p => p.status === 'active');

    await Promise.all(activeParticipants.map(async (p) => {
      p.status = 'completed';
      const char = await Character.findById(p.character._id);
      if (char) {
        char.experience += quest.reward.xp || 0;
        await char.save();
      }
    }));

    quest.status = 'completed';
    await quest.save();

    res.json({ success: true, data: quest });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getMyQuests = async (req, res) => {
  try {
    const quests = await Quest.find({ 'participants.user': req.userId })
      .populate('location', 'name icon')
      .sort({ updatedAt: -1 });
    res.json({ success: true, data: quests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getQuests, getQuest, createQuest, applyQuest, abandonQuest, completeQuest, getMyQuests };
