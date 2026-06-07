const Travel = require('../models/Travel');
const Character = require('../models/Character');
const Location = require('../models/Location');

const DANGER_DURATION = { safe: 15, low: 30, medium: 60, high: 120, deadly: 240 };

const startTravel = async (req, res) => {
  try {
    const { toLocationId } = req.body;
    if (!toLocationId) return res.status(400).json({ success: false, error: 'Destination required' });

    const character = await Character.findOne({ owner: req.userId, isSetup: true, isDead: false });
    if (!character) return res.status(400).json({ success: false, error: 'No active character' });

    const existing = await Travel.findOne({ character: character._id, status: 'traveling' });
    if (existing) return res.status(400).json({ success: false, error: 'Already traveling' });

    const destination = await Location.findById(toLocationId);
    if (!destination) return res.status(404).json({ success: false, error: 'Location not found' });

    // Use character's current location stored in Character model, else find starting village
    let fromLocation;
    if (character.currentLocation) {
      fromLocation = await Location.findById(character.currentLocation);
    } else {
      fromLocation = await Location.findOne({ isStartingLocation: true });
    }

    if (!fromLocation) return res.status(400).json({ success: false, error: 'Current location not found' });
    if (fromLocation._id.equals(destination._id)) {
      return res.status(400).json({ success: false, error: 'Already at destination' });
    }

    const isConnected = fromLocation.connectedTo.some(id => id.equals(destination._id));
    if (!isConnected) {
      return res.status(400).json({ success: false, error: 'No route to that location' });
    }

    const durationMinutes = DANGER_DURATION[destination.dangerLevel] || 30;
    const arrivalTime = new Date(Date.now() + durationMinutes * 60 * 1000);

    const travel = await Travel.create({
      character: character._id,
      user: req.userId,
      from: fromLocation._id,
      to: destination._id,
      durationMinutes,
      arrivalTime,
    });

    const populated = await travel.populate([
      { path: 'from', select: 'name icon' },
      { path: 'to', select: 'name icon' },
    ]);

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getActiveTravel = async (req, res) => {
  try {
    const character = await Character.findOne({ owner: req.userId, isSetup: true });
    if (!character) return res.status(404).json({ success: false, error: 'No character' });

    const travel = await Travel.findOne({ character: character._id, status: 'traveling' })
      .populate('from', 'name icon')
      .populate('to', 'name icon');

    if (!travel) return res.json({ success: true, data: null });

    // Auto-arrive if time passed
    if (new Date() >= travel.arrivalTime) {
      travel.status = 'arrived';
      await travel.save();
      await Character.findByIdAndUpdate(character._id, { currentLocation: travel.to });
    }

    res.json({ success: true, data: travel });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const cancelTravel = async (req, res) => {
  try {
    const character = await Character.findOne({ owner: req.userId });
    const travel = await Travel.findOne({ character: character._id, status: 'traveling' });
    if (!travel) return res.status(404).json({ success: false, error: 'No active travel' });

    travel.status = 'cancelled';
    await travel.save();
    res.json({ success: true, data: travel });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getTravelHistory = async (req, res) => {
  try {
    const history = await Travel.find({ user: req.userId })
      .populate('from', 'name icon')
      .populate('to', 'name icon')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { startTravel, getActiveTravel, cancelTravel, getTravelHistory };
