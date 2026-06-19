const Character = require('../models/Character');
const Location = require('../models/Location');

// The city (Location id) a user's active character currently occupies, used for
// presence-based forum visibility. A character with no explicit currentLocation
// is treated as standing in the starting city. Returns null for anonymous
// requests or users without an active character.
async function resolveCurrentCityId(userId) {
  if (!userId) return null;

  const character = await Character.findOne({
    owner: userId,
    isSetup: true,
    isDead: false,
  }).select('currentLocation');
  if (!character) return null;

  if (character.currentLocation) return character.currentLocation;

  const start = await Location.findOne({ isStartingLocation: true }).select('_id');
  return start?._id || null;
}

module.exports = { resolveCurrentCityId };
