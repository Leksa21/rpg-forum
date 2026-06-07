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

  const [greenfield, stoneback, darkwood, coastal, ancient, flamecrest, frozen, desert, shadowmere, spire] = await Region.insertMany([
    { name: 'Greenfield Plains',    description: 'Rolling hills and fertile farmland.',              mapCoords: { x: 42, y: 58 }, climate: 'temperate' },
    { name: 'Stoneback Mountains',  description: 'Ancient peaks rich in ore and dwarven history.',   mapCoords: { x: 25, y: 35 }, climate: 'arctic' },
    { name: 'The Darkwood',         description: 'A forest perpetually cloaked in shadow.',          mapCoords: { x: 68, y: 28 }, climate: 'shadowlands' },
    { name: 'Coastal Reach',        description: 'Salt air and pirate flags.',                       mapCoords: { x: 78, y: 62 }, climate: 'tropical' },
    { name: 'Ancient Forest',       description: 'Trees older than civilisation itself.',            mapCoords: { x: 18, y: 68 }, climate: 'temperate' },
    { name: 'Flamecrest Peaks',     description: 'Volcanic mountains wreathed in fire and ash.',    mapCoords: { x: 55, y: 15 }, climate: 'volcanic' },
    { name: 'Frozen Wastes',        description: 'An endless tundra where winter never ends.',      mapCoords: { x: 10, y: 10 }, climate: 'arctic' },
    { name: 'Desert of Kings',      description: 'Sand-buried empires and forgotten gods.',         mapCoords: { x: 75, y: 80 }, climate: 'desert' },
    { name: 'Shadowmere Bayou',     description: 'A fog-choked swampland teeming with dark magic.', mapCoords: { x: 30, y: 75 }, climate: 'tropical' },
    { name: 'The Spire Reaches',    description: 'Sky-piercing towers where arcane energy bleeds.', mapCoords: { x: 50, y: 5  }, climate: 'shadowlands' },
  ]);

  const [village, ironhold, ashenveil, solvara, eldergrove, emberveil, frostwall, sandcroft, murkhaven, summit] = await Location.insertMany([
    {
      name: 'The Starting Village', type: 'village', region: greenfield._id,
      description: 'A humble village where every journey begins. The smell of fresh bread and forge smoke is ever-present.', icon: '🏘️',
      mapCoords: { x: 42, y: 58 }, dangerLevel: 'safe', isStartingLocation: true, population: 320, faction: 'Free Peoples',
      lore: 'Travelers from every corner of the realm pass through these simple streets. The elders say the village was founded on a crossroads blessed by forgotten gods.',
      theme: { gradient: 'linear-gradient(160deg, #0a200a 0%, #152a10 60%, #0a1a08 100%)', accentColor: '#4a9a4a' },
    },
    {
      name: 'Ironhold', type: 'fortress', region: stoneback._id,
      description: 'A dwarven fortress city, rich in iron and ale. Its walls have never been breached.', icon: '🏰',
      mapCoords: { x: 25, y: 35 }, dangerLevel: 'low', population: 4200, faction: 'Stoneback Clan',
      lore: 'Carved from the living mountain over a thousand years ago, Ironhold is the seat of Stoneback Clan power. Every stone was placed by hand, every corridor designed to repel invaders.',
      theme: { gradient: 'linear-gradient(160deg, #141420 0%, #1e1e2e 60%, #101018 100%)', accentColor: '#6b8aaa' },
    },
    {
      name: 'Ashenveil', type: 'city', region: darkwood._id,
      description: 'A city cloaked in eternal shadow. Few enter; fewer leave on their own terms.', icon: '🌑',
      mapCoords: { x: 68, y: 28 }, dangerLevel: 'high', population: 2800, faction: 'The Shadow Court',
      lore: 'Once a proud city of scholars, Ashenveil fell under a curse that no sunlight reaches within its walls. The Shadow Court now rules here with absolute, silent power.',
      theme: { gradient: 'linear-gradient(160deg, #080510 0%, #120820 60%, #080510 100%)', accentColor: '#8e44ad' },
    },
    {
      name: 'Solvara', type: 'city', region: coastal._id,
      description: 'A port city where merchants and pirates share the same docks. Gold flows as freely as the tide.', icon: '🌊',
      mapCoords: { x: 78, y: 62 }, dangerLevel: 'medium', population: 6100, faction: 'Maritime League',
      lore: 'Built on a natural harbor, Solvara has grown rich trading with distant lands. The Maritime League maintains an uneasy peace between the merchant fleets and the corsair brotherhoods.',
      theme: { gradient: 'linear-gradient(160deg, #050f1a 0%, #0a1a2a 60%, #051018 100%)', accentColor: '#1a7aaa' },
    },
    {
      name: 'Eldergrove', type: 'town', region: ancient._id,
      description: 'An elven town nestled within trees older than memory. Time moves differently here.', icon: '🌳',
      mapCoords: { x: 18, y: 68 }, dangerLevel: 'low', population: 890, faction: 'Elder Council',
      lore: 'The elves of Eldergrove are the oldest living beings in the known world. They speak of events from three millennia ago as though they happened last spring.',
      theme: { gradient: 'linear-gradient(160deg, #051505 0%, #0a200a 60%, #051008 100%)', accentColor: '#27ae60' },
    },
    {
      name: 'Emberveil', type: 'outpost', region: flamecrest._id,
      description: 'A volcanic outpost where fire-shapers and reckless adventurers gather. The ground trembles without warning.', icon: '🌋',
      mapCoords: { x: 55, y: 15 }, dangerLevel: 'deadly', population: 340, faction: 'Ashbound Order',
      lore: 'The Ashbound Order chose this place to study the raw fire elementals that spawn from the caldera. Most initiates do not survive their first month, but those who do become terrifyingly powerful.',
      theme: { gradient: 'linear-gradient(160deg, #1e0500 0%, #2a0a00 60%, #180400 100%)', accentColor: '#e74c3c' },
    },
    {
      name: 'Frostwall Citadel', type: 'fortress', region: frozen._id,
      description: 'An arctic fortress carved from eternal ice. Its defenders have never felt warmth.', icon: '❄️',
      mapCoords: { x: 10, y: 10 }, dangerLevel: 'high', population: 1200, faction: 'Iron Frost Legion',
      lore: 'The Iron Frost Legion was exiled here a century ago after a failed coup. They have endured, grown cold in spirit as well as body, and built a fortress that defies the blizzards.',
      theme: { gradient: 'linear-gradient(160deg, #040e18 0%, #081828 60%, #040e18 100%)', accentColor: '#74b9ff' },
    },
    {
      name: 'Sandcroft Ruins', type: 'ruins', region: desert._id,
      description: 'Desert ruins of an ancient empire. The gods they worshipped still stir beneath the sand.', icon: '🏜️',
      mapCoords: { x: 75, y: 80 }, dangerLevel: 'deadly', population: 120, faction: 'Tomb Wardens',
      lore: 'The empire of Karath fell in a single night, its million citizens turned to salt by a god they had displeased. Now only the Tomb Wardens remain, guarding the relics that keep the sleeping deity chained.',
      theme: { gradient: 'linear-gradient(160deg, #150e00 0%, #201500 60%, #120b00 100%)', accentColor: '#d4ac0d' },
    },
    {
      name: 'Murkhaven', type: 'town', region: shadowmere._id,
      description: 'A swamp town built on stilts above black water. Strange things are bought and sold here.', icon: '🌿',
      mapCoords: { x: 30, y: 75 }, dangerLevel: 'medium', population: 1540, faction: 'Hex Market',
      lore: 'Murkhaven grew around an ancient hex-market where curse-mongers, potion brewers, and soul traders gather. The town floats on cursed water that is said to whisper names at midnight.',
      theme: { gradient: 'linear-gradient(160deg, #030803 0%, #050f05 60%, #030803 100%)', accentColor: '#20a040' },
    },
    {
      name: 'The Summit', type: 'ruins', region: spire._id,
      description: 'The highest point in the known world. Arcane energy bleeds through the air itself. Not all who climb return sane.', icon: '✨',
      mapCoords: { x: 50, y: 5 }, dangerLevel: 'deadly', population: 30, faction: 'The Remnant',
      lore: 'The Remnant are the survivors of wizards who ascended to study the raw weave of magic. Most went mad. The few who remain guard the summit\'s secrets and speak in riddles that sometimes come true.',
      theme: { gradient: 'linear-gradient(160deg, #0d0518 0%, #180a28 60%, #0a0315 100%)', accentColor: '#9b59b6' },
    },
  ]);

  await Location.findByIdAndUpdate(village._id,   { connectedTo: [ironhold._id, ashenveil._id, solvara._id, eldergrove._id] });
  await Location.findByIdAndUpdate(ironhold._id,  { connectedTo: [village._id, ashenveil._id, frostwall._id] });
  await Location.findByIdAndUpdate(ashenveil._id, { connectedTo: [village._id, ironhold._id, emberveil._id] });
  await Location.findByIdAndUpdate(solvara._id,   { connectedTo: [village._id, eldergrove._id, sandcroft._id] });
  await Location.findByIdAndUpdate(eldergrove._id,{ connectedTo: [village._id, solvara._id, murkhaven._id] });
  await Location.findByIdAndUpdate(emberveil._id, { connectedTo: [ashenveil._id, summit._id] });
  await Location.findByIdAndUpdate(frostwall._id, { connectedTo: [ironhold._id] });
  await Location.findByIdAndUpdate(sandcroft._id, { connectedTo: [solvara._id] });
  await Location.findByIdAndUpdate(murkhaven._id, { connectedTo: [eldergrove._id, summit._id] });
  await Location.findByIdAndUpdate(summit._id,    { connectedTo: [emberveil._id, murkhaven._id] });

  await SubLocation.insertMany([
    { name: 'The Rusty Flagon',   type: 'tavern',     city: village._id,   icon: '🍺', description: 'A warm hearth and cold ale.', npcName: 'Margot', npcRole: 'Innkeeper' },
    { name: 'Village Smithy',     type: 'blacksmith', city: village._id,   icon: '⚒️', description: 'Basic arms and armour.', npcName: 'Brom', npcRole: 'Blacksmith' },
    { name: 'Chapel of Light',    type: 'temple',     city: village._id,   icon: '✨', description: 'A small shrine to the gods of light.', npcName: 'Sister Aelindra', npcRole: 'Priestess' },
    { name: 'Village Square',     type: 'market',     city: village._id,   icon: '🛒', description: 'Farmers, merchants, and rumours.' },

    { name: 'The Iron Hall',      type: 'tavern',     city: ironhold._id,  icon: '🍻', description: 'Dwarven ale strong enough to fell a horse.', npcName: 'Durgin', npcRole: 'Barkeep' },
    { name: "Grimrock's Forge",   type: 'blacksmith', city: ironhold._id,  icon: '⚙️', description: 'Master-crafted weapons and armour.', npcName: 'Grimrock', npcRole: 'Master Smith' },
    { name: 'Ironhold Arena',     type: 'arena',      city: ironhold._id,  icon: '⚔️', description: 'Prove your worth in combat.' },
    { name: 'Clan Treasury',      type: 'palace',     city: ironhold._id,  icon: '🏦', description: 'Where the Stoneback Clan conducts commerce.' },

    { name: 'The Obsidian Cup',   type: 'tavern',     city: ashenveil._id, icon: '🖤', description: 'Shadow and secrets over black wine.', npcName: 'Vesper', npcRole: 'Host' },
    { name: 'Shadow Conclave',    type: 'guild',      city: ashenveil._id, icon: '🌙', description: 'A gathering place for those who walk in darkness.' },
    { name: 'Ashenveil Prison',   type: 'prison',     city: ashenveil._id, icon: '⛓️', description: 'Few who enter leave of their own will.' },

    { name: "The Siren's Rest",   type: 'tavern',     city: solvara._id,   icon: '⚓', description: 'Sailors, merchants, and scoundrels welcome.', npcName: 'Captain Lyra', npcRole: 'Owner' },
    { name: 'Solvara Docks',      type: 'docks',      city: solvara._id,   icon: '🚢', description: 'Ships arriving from across the known world.' },
    { name: 'Merchant Exchange',  type: 'market',     city: solvara._id,   icon: '💰', description: 'Trade routes converge here.', npcName: 'Aldric', npcRole: 'Exchange Master' },

    { name: 'Moonleaf Inn',       type: 'tavern',     city: eldergrove._id,icon: '🌿', description: 'Elven hospitality and fine herb-wine.', npcName: 'Sylara', npcRole: 'Host' },
    { name: 'Elder Library',      type: 'library',    city: eldergrove._id,icon: '📚', description: 'Centuries of elven lore preserved here.', npcName: 'Lorekeeper Faen', npcRole: 'Lorekeeper' },
    { name: 'Grove Temple',       type: 'temple',     city: eldergrove._id,icon: '🌳', description: 'Sacred grove where the nature spirits dwell.' },

    { name: 'The Ember Pit',      type: 'tavern',     city: emberveil._id, icon: '🔥', description: 'Scorched walls, hotter drinks.', npcName: 'Cindra', npcRole: 'Barkeep' },
    { name: 'Ashbound Sanctum',   type: 'guild',      city: emberveil._id, icon: '🌋', description: 'Where fire-shapers train and die.' },

    { name: 'Frostmead Hall',     type: 'tavern',     city: frostwall._id, icon: '🍺', description: 'The only warm room in the citadel.', npcName: 'Hvar', npcRole: 'Innkeeper' },
    { name: 'The Frozen Vault',   type: 'blacksmith', city: frostwall._id, icon: '🧊', description: 'Cold-tempered steel, legendary durability.', npcName: 'Sigvald', npcRole: 'Weaponsmith' },

    { name: 'The Sand Veil',      type: 'tavern',     city: sandcroft._id, icon: '🏺', description: 'Shielded from the sun, full of tomb runners.', npcName: 'Yelara', npcRole: 'Host' },
    { name: 'Karath Catacombs',   type: 'dungeon',    city: sandcroft._id, icon: '💀', description: 'Endless corridors below the ruins, still guarded.' },

    { name: 'The Murky Cup',      type: 'tavern',     city: murkhaven._id, icon: '🍵', description: 'Strange brews, stranger patrons.', npcName: 'Bog-Lila', npcRole: 'Brewer' },
    { name: 'Hex Market Stalls',  type: 'market',     city: murkhaven._id, icon: '🧿', description: 'Curses, hexes, and worse for sale.' },

    { name: 'The Eye of the Weave', type: 'temple',   city: summit._id,    icon: '🔮', description: 'A crack in reality where magic leaks through.' },
    { name: 'Remnant Observatory',  type: 'library',  city: summit._id,    icon: '🌌', description: 'They watch the stars for patterns no one else can see.', npcName: 'The Watcher', npcRole: 'Archivist' },
  ]);

  console.log('World seeded successfully with 10 areas.');
  process.exit(0);
};

seed().catch((err) => { console.error(err); process.exit(1); });
