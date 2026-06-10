const Battle    = require('../models/Battle');
const Character = require('../models/Character');
const { BASE_MANA, BASE_ENERGY } = require('../data/classResources');
const { CLASS_SPELLS }           = require('../data/spells');

const BASE_HP = {
  Warrior: 120, Paladin: 110, Ranger: 90, Rogue: 80,
  Mage: 70, Necromancer: 75, Druid: 85, Bard: 80,
};

const calcMaxHp     = c => (BASE_HP[c.class] || 80)        + (c.level - 1) * 10;
const calcMaxMana   = c => (BASE_MANA[c.class] || 0)       + (c.level - 1) * 2;
const calcMaxEnergy = c => (BASE_ENERGY[c.class] || 20)    + (c.level - 1);

async function createEncounterBattle(charId1, charId2) {
  const [char1, char2] = await Promise.all([
    Character.findById(charId1),
    Character.findById(charId2),
  ]);

  if (!char1 || !char2) throw new Error('Character not found');
  if (char1.isDead || char2.isDead) throw new Error('A dead character cannot fight');

  const existing = await Battle.findOne({
    'units.character': { $all: [char1._id, char2._id] },
    status: { $in: ['pending', 'active'] },
  });
  if (existing) return existing;

  const hp1  = calcMaxHp(char1);
  const hp2  = calcMaxHp(char2);
  const now  = new Date();

  const battle = new Battle({
    triggerType:      'encounter',
    status:           'active',
    currentTurn:      char1._id,
    turnDeadline:     new Date(now.getTime() + 24 * 3600 * 1000),
    units: [
      {
        character:   char1._id,
        user:        char1.owner,
        side:        'attacker',
        name:        char1.name,
        avatar:      char1.avatar,
        position:    { q: 3, r: 14 },
        hp:          hp1, maxHp: hp1,
        ap:          6,
        mana:        calcMaxMana(char1), maxMana: calcMaxMana(char1),
        energy:      calcMaxEnergy(char1), maxEnergy: calcMaxEnergy(char1),
        knownSpells: CLASS_SPELLS[char1.class] || [],
      },
      {
        character:   char2._id,
        user:        char2.owner,
        side:        'defender',
        name:        char2.name,
        avatar:      char2.avatar,
        position:    { q: 26, r: 14 },
        hp:          hp2, maxHp: hp2,
        ap:          6,
        mana:        calcMaxMana(char2), maxMana: calcMaxMana(char2),
        energy:      calcMaxEnergy(char2), maxEnergy: calcMaxEnergy(char2),
        knownSpells: CLASS_SPELLS[char2.class] || [],
      },
    ],
    log: [
      {
        turn:      1,
        actor:     char1._id,
        action:    'battle_start',
        message:   `Encounter battle: ${char1.name} vs ${char2.name}!`,
        timestamp: now,
      },
    ],
  });

  await battle.save();
  return battle;
}

module.exports = { createEncounterBattle };
