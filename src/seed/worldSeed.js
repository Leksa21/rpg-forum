require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const connectDB = require('../config/database');
const Region = require('../models/Region');
const Location = require('../models/Location');
const SubLocation = require('../models/SubLocation');

const seed = async () => {
  await connectDB();

  await Promise.all([
    Region.deleteMany({}),
    Location.deleteMany({}),
    SubLocation.deleteMany({}),
  ]);

  const [greenfield, stoneback, darkwood, coastal, ancient] = await Region.insertMany([
    { name: 'Greenfield Plains', description: 'Rolling hills and fertile farmland.', mapCoords: { x: 42, y: 58 }, climate: 'temperate' },
    { name: 'Stoneback Mountains', description: 'Ancient peaks rich in ore and dwarven history.', mapCoords: { x: 25, y: 35 }, climate: 'arctic' },
    { name: 'The Darkwood', description: 'A forest perpetually cloaked in shadow.', mapCoords: { x: 68, y: 28 }, climate: 'shadowlands' },
    { name: 'Coastal Reach', description: 'Salt air and pirate flags.', mapCoords: { x: 78, y: 62 }, climate: 'tropical' },
    { name: 'Ancient Forest', description: 'Trees older than civilisation itself.', mapCoords: { x: 18, y: 68 }, climate: 'temperate' },
  ]);

  const [village, ironhold, ashenveil, solvara, eldergrove] = await Location.insertMany([
    {
      name: 'The Starting Village', type: 'village', region: greenfield._id,
      description: 'A humble village where every journey begins.', icon: '🏘️',
      mapCoords: { x: 42, y: 58 }, dangerLevel: 'safe', isStartingLocation: true,
      population: 320, faction: 'Free Peoples',
    },
    {
      name: 'Ironhold', type: 'fortress', region: stoneback._id,
      description: 'A dwarven fortress city, rich in iron and ale.', icon: '🏰',
      mapCoords: { x: 25, y: 35 }, dangerLevel: 'low', population: 4200, faction: 'Stoneback Clan',
    },
    {
      name: 'Ashenveil', type: 'city', region: darkwood._id,
      description: 'A city cloaked in eternal shadow. Few enter; fewer leave.', icon: '🌑',
      mapCoords: { x: 68, y: 28 }, dangerLevel: 'high', population: 2800, faction: 'The Shadow Court',
    },
    {
      name: 'Solvara', type: 'city', region: coastal._id,
      description: 'A port city where merchants and pirates share the same docks.', icon: '🌊',
      mapCoords: { x: 78, y: 62 }, dangerLevel: 'medium', population: 6100, faction: 'Maritime League',
    },
    {
      name: 'Eldergrove', type: 'town', region: ancient._id,
      description: 'An elven town nestled within trees older than memory.', icon: '🌳',
      mapCoords: { x: 18, y: 68 }, dangerLevel: 'low', population: 890, faction: 'Elder Council',
    },
  ]);

  // Connect routes between locations
  await Location.findByIdAndUpdate(village._id, {
    connectedTo: [ironhold._id, ashenveil._id, solvara._id, eldergrove._id],
  });
  await Location.findByIdAndUpdate(ironhold._id, { connectedTo: [village._id, ashenveil._id] });
  await Location.findByIdAndUpdate(ashenveil._id, { connectedTo: [village._id, ironhold._id] });
  await Location.findByIdAndUpdate(solvara._id, { connectedTo: [village._id, eldergrove._id] });
  await Location.findByIdAndUpdate(eldergrove._id, { connectedTo: [village._id, solvara._id] });

  await SubLocation.insertMany([
    { name: 'The Rusty Flagon', type: 'tavern', city: village._id, icon: '🍺', description: 'A warm hearth and cold ale.', npcName: 'Margot', npcRole: 'Innkeeper' },
    { name: 'Village Smithy', type: 'blacksmith', city: village._id, icon: '⚒️', description: 'Basic arms and armour.', npcName: 'Brom', npcRole: 'Blacksmith' },
    { name: 'Chapel of Light', type: 'temple', city: village._id, icon: '✨', description: 'A small shrine to the gods of light.', npcName: 'Sister Aelindra', npcRole: 'Priestess' },
    { name: 'Village Square', type: 'market', city: village._id, icon: '🛒', description: 'Farmers, merchants, and rumours.' },

    { name: 'The Iron Hall', type: 'tavern', city: ironhold._id, icon: '🍻', description: 'Dwarven ale strong enough to fell a horse.', npcName: 'Durgin', npcRole: 'Barkeep' },
    { name: "Grimrock's Forge", type: 'blacksmith', city: ironhold._id, icon: '⚙️', description: 'Master-crafted weapons and armour.', npcName: 'Grimrock', npcRole: 'Master Smith' },
    { name: 'Ironhold Arena', type: 'arena', city: ironhold._id, icon: '⚔️', description: 'Prove your worth in combat.' },
    { name: 'Clan Treasury', type: 'palace', city: ironhold._id, icon: '🏦', description: 'Where the Stoneback Clan conducts commerce.' },

    { name: 'The Obsidian Cup', type: 'tavern', city: ashenveil._id, icon: '🖤', description: 'Shadow and secrets over black wine.', npcName: 'Vesper', npcRole: 'Host' },
    { name: 'Shadow Conclave', type: 'guild', city: ashenveil._id, icon: '🌙', description: 'A gathering place for those who walk in darkness.' },
    { name: 'Ashenveil Prison', type: 'prison', city: ashenveil._id, icon: '⛓️', description: 'Few who enter leave of their own will.' },

    { name: "The Siren's Rest", type: 'tavern', city: solvara._id, icon: '⚓', description: 'Sailors, merchants, and scoundrels welcome.', npcName: 'Captain Lyra', npcRole: 'Owner' },
    { name: 'Solvara Docks', type: 'docks', city: solvara._id, icon: '🚢', description: 'Ships arriving from across the known world.' },
    { name: 'Merchant Exchange', type: 'market', city: solvara._id, icon: '💰', description: 'Trade routes converge here.', npcName: 'Aldric', npcRole: 'Exchange Master' },

    { name: 'Moonleaf Inn', type: 'tavern', city: eldergrove._id, icon: '🌿', description: 'Elven hospitality and fine herb-wine.', npcName: 'Sylara', npcRole: 'Host' },
    { name: 'Elder Library', type: 'library', city: eldergrove._id, icon: '📚', description: 'Centuries of elven lore preserved here.', npcName: 'Lorekeeper Faen', npcRole: 'Lorekeeper' },
    { name: 'Grove Temple', type: 'temple', city: eldergrove._id, icon: '🌳', description: 'Sacred grove where the nature spirits dwell.' },
  ]);

  console.log('World seeded successfully.');
  process.exit(0);
};

seed().catch((err) => { console.error(err); process.exit(1); });
