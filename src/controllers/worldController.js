const Region = require('../models/Region');
const Location = require('../models/Location');
const SubLocation = require('../models/SubLocation');
const { canViewCity, isStaffRole } = require('../utils/visibility');
const { resolveCurrentCityId } = require('../utils/presence');

const getRegions = async (req, res) => {
  try {
    const regions = await Region.find().sort('name');
    res.json({ success: true, data: regions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getLocations = async (req, res) => {
  try {
    const { region } = req.query;
    const filter = region ? { region } : {};
    const locations = await Location.find(filter)
      .populate('region', 'name')
      .populate('connectedTo', 'name type icon mapCoords')
      .sort('name');
    res.json({ success: true, data: locations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id)
      .populate('region', 'name description')
      .populate('connectedTo', 'name type icon mapCoords dangerLevel');

    if (!location) {
      return res.status(404).json({ success: false, error: 'Location not found' });
    }

    const subLocations = await SubLocation.find({ city: location._id, isAccessible: true });

    res.json({ success: true, data: { ...location.toObject(), subLocations } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getSubLocations = async (req, res) => {
  try {
    const subLocations = await SubLocation.find({ city: req.params.cityId, isAccessible: true })
      .populate('city', 'name');
    res.json({ success: true, data: subLocations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// All venues of a city (every nesting depth, each carries `parent`), so the
// client can build the venue tree. Presence-gated: you only browse a city's
// venues while you are in it. Staff bypass.
const getVenues = async (req, res) => {
  try {
    const { cityId } = req.params;

    const currentCityId = isStaffRole(req.userRole)
      ? null
      : await resolveCurrentCityId(req.userId);

    if (!canViewCity({ role: req.userRole, currentCityId, targetCityId: cityId })) {
      return res.json({ success: true, data: [], restricted: true });
    }

    const venues = await SubLocation.find({ city: cityId, isAccessible: true })
      .sort({ order: 1, name: 1 });
    res.json({ success: true, data: venues });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Admin: create location
const createLocation = async (req, res) => {
  try {
    const location = await Location.create(req.body);
    res.status(201).json({ success: true, data: location });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Admin: create sub-location
const createSubLocation = async (req, res) => {
  try {
    const sub = await SubLocation.create(req.body);
    res.status(201).json({ success: true, data: sub });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getRegions, getLocations, getLocation, getSubLocations, getVenues, createLocation, createSubLocation };
