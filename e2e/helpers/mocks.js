const MOCK_TOKEN = 'e2e-test-token';

const MOCK_USER = {
  _id: 'user1',
  username: 'Testuser',
  email: 'test@test.com',
  role: 'member',
};

const MOCK_CHAR = {
  _id: 'char1',
  name: 'Aragorn',
  class: 'Warrior',
  race: 'Human',
  avatar: '⚔',
  level: 1,
  experience: 0,
  isSetup: true,
  isDead: false,
  currentLocation: null,
  discoveredLocations: [],
  stats: { strength: 12, dexterity: 10, intelligence: 8, endurance: 11, charisma: 9, wisdom: 10 },
};

// The character's starting location — "You are here" would be shown for this one
const MOCK_LOCATION_HOME = {
  _id: 'loc1',
  name: 'The Starting Village',
  description: 'A peaceful village at the crossroads of fate.',
  dangerLevel: 'safe',
  type: 'Village',
  isStartingLocation: true,
  icon: '🏘',
  mapCoords: { x: 50, y: 50 },
  region: { _id: 'reg1', name: 'Heartlands' },
  theme: { gradient: 'linear-gradient(160deg,#0a0a14,#141428)', accentColor: '#c9a84c' },
  lore: 'Where every legend begins.',
  population: 200,
  faction: null,
};

// A location the character is NOT currently at — "Travel here" button will appear
const MOCK_LOCATION_DEST = {
  _id: 'loc2',
  name: 'The Dark Forest',
  description: 'A foreboding forest where shadows move with purpose.',
  dangerLevel: 'medium',
  type: 'Wilderness',
  isStartingLocation: false,
  icon: '🌲',
  mapCoords: { x: 70, y: 30 },
  region: { _id: 'reg1', name: 'Heartlands' },
  theme: { gradient: 'linear-gradient(160deg,#0a1a0a,#142814)', accentColor: '#4caa4c' },
  lore: null,
  population: 0,
  faction: null,
};

const MOCK_TRAVEL_ACTIVE = {
  _id: 'travel1',
  from: 'loc1',
  to: { _id: 'loc2', name: 'The Dark Forest' },
  status: 'traveling',
  departureTime: new Date().toISOString(),
  arrivalTime: new Date(Date.now() + 120_000).toISOString(),
};

module.exports = {
  MOCK_TOKEN,
  MOCK_USER,
  MOCK_CHAR,
  MOCK_LOCATION_HOME,
  MOCK_LOCATION_DEST,
  MOCK_TRAVEL_ACTIVE,
};
