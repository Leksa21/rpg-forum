const SPELLS = Object.freeze({
  fireball: {
    id: 'fireball', name: 'Fireball', kind: 'damage',
    apCost: 2, manaCost: 3,
    range: 5, target: 'enemy',
    damage: 15, heal: 0, radius: 0, duration: 0, apMod: 0,
    icon: '🔥', color: '#e05050',
    description: 'Hurls a ball of fire at a distant enemy.',
  },
  ice_rain: {
    id: 'ice_rain', name: 'Ice Rain', kind: 'zone',
    apCost: 3, manaCost: 4,
    range: 4, target: 'hex',
    damage: 6, heal: 0, radius: 1, duration: 2, apMod: 0,
    icon: '❄️', color: '#4ac8f0',
    description: 'Calls down icy rain over an area for 2 turns.',
  },
  haste: {
    id: 'haste', name: 'Haste', kind: 'buff',
    apCost: 1, manaCost: 3,
    range: 0, target: 'self',
    damage: 0, heal: 0, radius: 0, duration: 0, apMod: 3,
    icon: '⚡', color: '#f0c040',
    description: 'Surge of speed — gain +3 AP on your next turn.',
  },
  slow: {
    id: 'slow', name: 'Slow', kind: 'debuff',
    apCost: 2, manaCost: 2,
    range: 4, target: 'enemy',
    damage: 0, heal: 0, radius: 0, duration: 0, apMod: -2,
    icon: '🧊', color: '#8080cc',
    description: 'Encases enemy in frost — they lose 2 AP next turn.',
  },
  mend: {
    id: 'mend', name: 'Mend', kind: 'heal',
    apCost: 1, manaCost: 2,
    range: 0, target: 'self',
    damage: 0, heal: 20, radius: 0, duration: 0, apMod: 0,
    icon: '💚', color: '#42c87a',
    description: 'Channels life energy to restore 20 HP.',
  },
});

const CLASS_SPELLS = {
  Mage:        ['fireball', 'ice_rain', 'slow', 'mend', 'haste'],
  Necromancer: ['fireball', 'ice_rain', 'slow', 'mend'],
  Druid:       ['ice_rain', 'mend', 'haste'],
  Paladin:     ['mend', 'haste'],
  Bard:        ['haste', 'slow', 'mend'],
  Ranger:      ['slow', 'haste'],
  Rogue:       ['slow'],
  Warrior:     ['haste'],
};

function getSpell(id)  { return SPELLS[id] || null; }
function getCatalog()  { return Object.values(SPELLS); }

module.exports = { SPELLS, getSpell, getCatalog, CLASS_SPELLS };
