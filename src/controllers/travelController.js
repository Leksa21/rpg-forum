const Travel = require('../models/Travel');
const Character = require('../models/Character');
const Location = require('../models/Location');

// Travel time scales with map distance (mapCoords are on a 0-100 grid)
const SECONDS_PER_MAP_UNIT = 5;
const MIN_TRAVEL_SECS      = 30;
const MAX_TRAVEL_SECS      = 600;

function travelDurationSecs(from, to) {
  const dx   = (to.mapCoords?.x ?? 50) - (from.mapCoords?.x ?? 50);
  const dy   = (to.mapCoords?.y ?? 50) - (from.mapCoords?.y ?? 50);
  const dist = Math.sqrt(dx * dx + dy * dy);
  const secs = Math.round(dist * SECONDS_PER_MAP_UNIT);
  return Math.min(MAX_TRAVEL_SECS, Math.max(MIN_TRAVEL_SECS, secs));
}

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

    // Open-world travel: any location is reachable, time scales with distance
    const durationSecs = travelDurationSecs(fromLocation, destination);
    const arrivalTime = new Date(Date.now() + durationSecs * 1000);

    const travel = await Travel.create({
      character: character._id,
      user: req.userId,
      from: fromLocation._id,
      to: destination._id,
      durationMinutes: durationSecs,
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
      // Arriving in a new city drops you at its gates — clear venue position.
      await Character.findByIdAndUpdate(character._id, {
        currentLocation: travel.to,
        currentVenue: null,
        venueArrivalAt: null,
      });
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
