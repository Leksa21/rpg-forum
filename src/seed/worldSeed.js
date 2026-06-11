require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const connectDB   = require('../config/database');
const Region      = require('../models/Region');
const Location    = require('../models/Location');
const SubLocation = require('../models/SubLocation');
const Character   = require('../models/Character');
const Travel      = require('../models/Travel');
const Post        = require('../models/Post');

// The Realm of Aldermere — one coherent high-fantasy kingdom.
// All mapCoords are verified against the procedural terrain (seed 42) so every
// pin lands on its proper biome: ports on beaches, holds on mountains, etc.
const seed = async () => {
  await connectDB();

  await Promise.all([
    Region.deleteMany({}),
    Location.deleteMany({}),
    SubLocation.deleteMany({}),
    // Old location ids are about to die — clear every dangling reference
    Travel.deleteMany({}),
    Character.updateMany({}, { currentLocation: null, discoveredLocations: [] }),
    Post.updateMany({ location: { $ne: null } }, { location: null }),
  ]);

  const [
    heartlands, stormCoast, silverwood, greymoor, ironpeaks,
    mirefen, northShore, drownedReach, barrowlands,
  ] = await Region.insertMany([
    { name: 'The Heartlands',    description: 'Golden fields and old roads — the breadbasket of Aldermere.',        mapCoords: { x: 48, y: 26 }, climate: 'temperate' },
    { name: 'The Storm Coast',   description: 'Cliffs and harbors battered by the eastern sea.',                    mapCoords: { x: 88, y: 18 }, climate: 'tropical' },
    { name: 'The Silverwood',    description: 'An ancient forest where the elves keep the old pacts alive.',        mapCoords: { x: 24, y: 33 }, climate: 'temperate' },
    { name: 'The Greymoor',      description: 'Wind-scoured highlands patrolled by the King\'s border garrisons.',  mapCoords: { x: 22, y: 44 }, climate: 'temperate' },
    { name: 'The Ironpeaks',     description: 'The roof of the realm — dwarven halls and air thin as a blade.',     mapCoords: { x: 74, y: 52 }, climate: 'arctic' },
    { name: 'The Mirefen',       description: 'Drowned lowlands of reed, fog, and things best left unnamed.',       mapCoords: { x: 28, y: 84 }, climate: 'tropical' },
    { name: 'The North Shore',   description: 'Cold beaches and fishing fleets under endless gull cries.',          mapCoords: { x: 62, y: 8  }, climate: 'temperate' },
    { name: 'The Drowned Reach', description: 'A sinking isle where a dead empire refuses to stay buried.',         mapCoords: { x: 76, y: 94 }, climate: 'tropical' },
    { name: 'The Barrowlands',   description: 'Grass-swallowed burial mounds of kings no song remembers.',          mapCoords: { x: 12, y: 14 }, climate: 'shadowlands' },
  ]);

  const [
    dawnhold, millbrook, saltmere, sylvanthel, thornwatch, greymoorKeep,
    karagdur, skyreach, fenmoor, gullhaven, sunkenCrown, barrowfields,
  ] = await Location.insertMany([
    {
      name: 'Dawnhold', type: 'city', region: heartlands._id,
      description: 'The capital of Aldermere. White walls, golden banners, and every road in the realm leading home.', icon: '🏰',
      mapCoords: { x: 50, y: 24 }, dangerLevel: 'safe', isStartingLocation: true, population: 18400, faction: 'Crown of Aldermere',
      lore: 'Raised on the ruins of three older cities, Dawnhold has crowned forty-one monarchs and buried thirty-nine. The High Gate has never fallen, though it bears the scorch marks of those who tried.',
      theme: { gradient: 'linear-gradient(160deg, #14100a 0%, #241c0e 60%, #120e08 100%)', accentColor: '#d4a843' },
    },
    {
      name: 'Millbrook', type: 'village', region: heartlands._id,
      description: 'A sleepy farming village of watermills and orchards. The ale is honest and the gossip travels faster than horses.', icon: '🌾',
      mapCoords: { x: 42, y: 28 }, dangerLevel: 'safe', population: 460, faction: 'Crown of Aldermere',
      lore: 'Millbrook flour feeds half the capital. Its three mills have turned for two hundred years, and the millers\' guild quietly knows more about realm politics than most courtiers.',
      theme: { gradient: 'linear-gradient(160deg, #0e1606 0%, #1a240c 60%, #0c1205 100%)', accentColor: '#9bc24a' },
    },
    {
      name: 'Saltmere', type: 'city', region: stormCoast._id,
      description: 'The realm\'s great eastern port. Spice, silk, and secrets arrive with every tide.', icon: '⚓',
      mapCoords: { x: 90, y: 20 }, dangerLevel: 'medium', population: 9200, faction: 'Harbor League',
      lore: 'Saltmere belongs to the Crown on paper and to the Harbor League in practice. Its lighthouse is fed by whale oil and bribes, and both burn through the darkest storms.',
      theme: { gradient: 'linear-gradient(160deg, #051018 0%, #0a1e2e 60%, #040d14 100%)', accentColor: '#3a9ec2' },
    },
    {
      name: 'Sylvanthel', type: 'city', region: silverwood._id,
      description: 'The elven city grown — not built — among silver-barked trees older than the kingdom itself.', icon: '🌳',
      mapCoords: { x: 16, y: 32 }, dangerLevel: 'low', population: 3100, faction: 'Silverwood Court',
      lore: 'No axe has ever touched the Silverwood\'s heart. The elves of Sylvanthel signed the First Pact with Aldermere\'s founder, and they measure that friendship in centuries, not reigns.',
      theme: { gradient: 'linear-gradient(160deg, #051505 0%, #0c220e 60%, #041206 100%)', accentColor: '#5cc46a' },
    },
    {
      name: 'Thornwatch', type: 'outpost', region: silverwood._id,
      description: 'A ranger outpost on the forest\'s eastern fringe. Last warm meal before the deep woods.', icon: '🏹',
      mapCoords: { x: 34, y: 34 }, dangerLevel: 'medium', population: 140, faction: 'Wardens of the Wood',
      lore: 'The Wardens took an oath to let nothing out of the deep forest that walks on more legs than four. Their watchfires have burned without pause for ninety years.',
      theme: { gradient: 'linear-gradient(160deg, #0a1208 0%, #141f0e 60%, #080f06 100%)', accentColor: '#7da45a' },
    },
    {
      name: 'Greymoor Keep', type: 'fortress', region: greymoor._id,
      description: 'A storm-bitten border fortress on the high moors. The wind never stops; neither does the watch.', icon: '🛡️',
      mapCoords: { x: 22, y: 44 }, dangerLevel: 'medium', population: 800, faction: 'Crown of Aldermere',
      lore: 'Greymoor Keep guards the old west road. Its garrison jokes that the keep has two enemies — raiders and the weather — and the weather has killed more of them.',
      theme: { gradient: 'linear-gradient(160deg, #10121a 0%, #1c2030 60%, #0d0f16 100%)', accentColor: '#8a9bb8' },
    },
    {
      name: 'Karag-Dur', type: 'fortress', region: ironpeaks._id,
      description: 'The dwarven mountain-hold. Forges that never cool, halls that never end, grudges that never die.', icon: '⛏️',
      mapCoords: { x: 72, y: 48 }, dangerLevel: 'high', population: 5600, faction: 'Karag Clans',
      lore: 'The dwarves of Karag-Dur dug too deep exactly once, sealed what they found behind seven doors, and carved the warning in every dialect they know. They still mine — just not down.',
      theme: { gradient: 'linear-gradient(160deg, #16100a 0%, #261a10 60%, #120d08 100%)', accentColor: '#c47a3a' },
    },
    {
      name: 'Skyreach Monastery', type: 'town', region: ironpeaks._id,
      description: 'A cliff-clinging monastery above the clouds. Monks trade healing and prophecy for silence.', icon: '🕊️',
      mapCoords: { x: 78, y: 60 }, dangerLevel: 'high', population: 90, faction: 'Order of the Open Sky',
      lore: 'The monks of Skyreach believe the sky is a scripture and storms are its sermons. Pilgrims who survive the climb are owed one true answer — and most regret asking.',
      theme: { gradient: 'linear-gradient(160deg, #0c1018 0%, #161e2c 60%, #0a0d14 100%)', accentColor: '#b8c8e8' },
    },
    {
      name: 'Fenmoor', type: 'town', region: mirefen._id,
      description: 'A stilt-town above the black fen water. Lanterns burn green and questions go unasked.', icon: '🐸',
      mapCoords: { x: 28, y: 86 }, dangerLevel: 'high', population: 1100, faction: 'Fenfolk',
      lore: 'Fenmoor floats on oak pilings older than memory. The fenfolk pay a yearly tithe of salt and silence to something in the deep marsh, and in return the water gives back what it takes. Usually.',
      theme: { gradient: 'linear-gradient(160deg, #06100a 0%, #0c1c12 60%, #050d08 100%)', accentColor: '#4fae6e' },
    },
    {
      name: 'Gullhaven', type: 'village', region: northShore._id,
      description: 'A weather-beaten fishing village on the north shore. Cod, gulls, and tall tales of sea-lights.', icon: '🐟',
      mapCoords: { x: 62, y: 8 }, dangerLevel: 'low', population: 380, faction: 'Free Fisherfolk',
      lore: 'Gullhaven\'s fleet has fished these waters for nine generations. Every family keeps one oar from every boat the sea has taken — the meeting hall\'s ceiling is made of them.',
      theme: { gradient: 'linear-gradient(160deg, #08121a 0%, #102230 60%, #060e14 100%)', accentColor: '#6ab8d8' },
    },
    {
      name: 'The Sunken Crown', type: 'ruins', region: drownedReach._id,
      description: 'The drowned capital of a dead empire, rising from the southern sea one tide at a time.', icon: '👑',
      mapCoords: { x: 76, y: 94 }, dangerLevel: 'deadly', population: 0, faction: 'None',
      lore: 'The empire of Vessanth ruled the seas for a thousand years and drowned in a single night. Its crowned towers now breach the waves at low tide — and the treasure-divers who return speak of lights moving in the flooded streets below.',
      theme: { gradient: 'linear-gradient(160deg, #060d14 0%, #0c1a26 60%, #050a10 100%)', accentColor: '#3ac2b0' },
    },
    {
      name: 'The Barrowfields', type: 'ruins', region: barrowlands._id,
      description: 'A plain of grass-covered burial mounds. The dead kings beneath are old, proud, and light sleepers.', icon: '🪦',
      mapCoords: { x: 12, y: 14 }, dangerLevel: 'deadly', population: 0, faction: 'None',
      lore: 'Before Aldermere there were the Barrow Kings, who bound their souls to their gold so neither could be taken. Grave-robbers who dig here are found days later, standing perfectly still, smiling.',
      theme: { gradient: 'linear-gradient(160deg, #0c0a12 0%, #161226 60%, #0a0810 100%)', accentColor: '#9a7ec2' },
    },
  ]);

  await SubLocation.insertMany([
    // Dawnhold — the capital gets the full set
    { name: 'The Gilded Stag',     type: 'tavern',     city: dawnhold._id,    icon: '🍺', description: 'Where knights, merchants, and liars share the same long tables.', npcName: 'Maren', npcRole: 'Innkeeper' },
    { name: 'The Crownforge',      type: 'blacksmith', city: dawnhold._id,    icon: '⚒️', description: 'Armorers to the royal guard. Waitlist measured in seasons.', npcName: 'Master Edran', npcRole: 'Royal Smith' },
    { name: 'Cathedral of Dawn',   type: 'temple',     city: dawnhold._id,    icon: '✨', description: 'Sunrise services that fill the nave with golden light.', npcName: 'High Cleric Yvanne', npcRole: 'High Cleric' },
    { name: 'The Grand Bazaar',    type: 'market',     city: dawnhold._id,    icon: '🛒', description: 'If it exists, someone here sells it. If it doesn\'t, someone claims to.' },
    { name: 'The King\'s Arena',   type: 'arena',      city: dawnhold._id,    icon: '⚔️', description: 'Sanctioned duels before a roaring crowd.' },

    // Millbrook
    { name: 'The Wheatsheaf',      type: 'tavern',     city: millbrook._id,   icon: '🍻', description: 'Cider, stew, and the realm\'s best gossip per copper.', npcName: 'Old Tobb', npcRole: 'Innkeeper' },
    { name: 'Millers\' Guildhall', type: 'market',     city: millbrook._id,   icon: '🌾', description: 'Grain contracts and quiet influence.' },

    // Saltmere
    { name: 'The Drowned Anchor',  type: 'tavern',     city: saltmere._id,    icon: '⚓', description: 'Sailors\' songs until dawn; knife-fights settled outside, mostly.', npcName: 'Cora Tide', npcRole: 'Owner' },
    { name: 'Saltmere Docks',      type: 'docks',      city: saltmere._id,    icon: '🚢', description: 'A forest of masts from every nation that floats.' },
    { name: 'League Countinghouse',type: 'market',     city: saltmere._id,    icon: '💰', description: 'Where the Harbor League sets prices and settles debts.', npcName: 'Factor Wells', npcRole: 'Factor' },

    // Sylvanthel
    { name: 'Hall of Boughs',      type: 'tavern',     city: sylvanthel._id,  icon: '🌿', description: 'Moonwine served in cups grown for the occasion.', npcName: 'Ilyathe', npcRole: 'Host' },
    { name: 'The Living Library',  type: 'library',    city: sylvanthel._id,  icon: '📚', description: 'Histories whispered to trees, recited back on request.', npcName: 'Lorekeeper Vael', npcRole: 'Lorekeeper' },
    { name: 'Shrine of the Pact',  type: 'temple',     city: sylvanthel._id,  icon: '🌳', description: 'Where the First Pact is renewed each midsummer.' },

    // Thornwatch
    { name: 'The Last Hearth',     type: 'tavern',     city: thornwatch._id,  icon: '🔥', description: 'Hot food, spare arrows, and free advice: turn back.', npcName: 'Warden Hesk', npcRole: 'Warden-Captain' },

    // Greymoor Keep
    { name: 'The Windbreak',       type: 'tavern',     city: greymoorKeep._id,icon: '🍺', description: 'Thick walls, thin ale, warm enough.', npcName: 'Serjeant Brann', npcRole: 'Quartermaster' },
    { name: 'Garrison Armory',     type: 'blacksmith', city: greymoorKeep._id,icon: '🛡️', description: 'Function over form, moor-tested.' },

    // Karag-Dur
    { name: 'The Anvil\'s Rest',   type: 'tavern',     city: karagdur._id,    icon: '🍻', description: 'Stone mugs, black stout, songs about grudges.', npcName: 'Dvalin', npcRole: 'Barkeep' },
    { name: 'The Grand Forge',     type: 'blacksmith', city: karagdur._id,    icon: '⚙️', description: 'Heirloom-grade steel; payment in ore or favors.', npcName: 'Forgemistress Hild', npcRole: 'Forgemistress' },
    { name: 'The Deep Doors',      type: 'dungeon',    city: karagdur._id,    icon: '🚪', description: 'Seven sealed doors. The dwarves do not discuss them.' },

    // Skyreach
    { name: 'Hall of Echoes',      type: 'temple',     city: skyreach._id,    icon: '🕊️', description: 'Ask one question. Receive one true answer.', npcName: 'Abbot Serel', npcRole: 'Abbot' },

    // Fenmoor
    { name: 'The Green Lantern',   type: 'tavern',     city: fenmoor._id,     icon: '🏮', description: 'Eel pie and rumors that turn out true unsettlingly often.', npcName: 'Mama Sedge', npcRole: 'Brewer' },
    { name: 'Fen Market',          type: 'market',     city: fenmoor._id,     icon: '🧿', description: 'Charms, remedies, and things in jars that watch you back.' },

    // Gullhaven
    { name: 'The Salt Oar',        type: 'tavern',     city: gullhaven._id,   icon: '🐟', description: 'Chowder, grog, and the loudest weather arguments in the realm.', npcName: 'Skipper Unna', npcRole: 'Innkeeper' },

    // The Sunken Crown
    { name: 'Tidewalker Camp',     type: 'docks',      city: sunkenCrown._id, icon: '⛺', description: 'Treasure-divers\' staging ground. Empty bedrolls outnumber full ones.' },

    // The Barrowfields
    { name: 'The Warding Stones',  type: 'temple',     city: barrowfields._id,icon: '🗿', description: 'A ring of carved stones that keeps the mounds quiet. Mind the gaps.' },
  ]);

  console.log('The Realm of Aldermere seeded: 9 regions, 12 locations.');
  process.exit(0);
};

seed().catch((err) => { console.error(err); process.exit(1); });
