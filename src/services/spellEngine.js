const { getSpell } = require('../data/spells');

// Offset even-r hex distance (same formula as battleController)
function hexDistance(a, b) {
  const ax = a.q - (a.r - (a.r & 1)) / 2;
  const az = a.r;
  const ay = -ax - az;
  const bx = b.q - (b.r - (b.r & 1)) / 2;
  const bz = b.r;
  const by = -bx - bz;
  return (Math.abs(ax - bx) + Math.abs(ay - by) + Math.abs(az - bz)) / 2;
}

// Returns all {q,r} hexes within `radius` of `center` that are inside the grid
function hexesInRadius(center, radius, gridWidth, gridHeight) {
  const result = [];
  for (let r = 0; r < gridHeight; r++) {
    for (let q = 0; q < gridWidth; q++) {
      if (hexDistance(center, { q, r }) <= radius) {
        result.push({ q, r });
      }
    }
  }
  return result;
}

// Validate a cast action before applying it
// casterSim: { pos, ap, mana, energy, knownSpells }
// enemyUnit: { position }
// target:    {q,r} or null (for self-targeting)
// Returns { ok: true } or { ok: false, error: string }
function validateCast(spell, casterSim, enemyUnit, target, gridWidth, gridHeight) {
  if (!spell) return { ok: false, error: 'Unknown spell' };
  if (!casterSim.knownSpells.includes(spell.id)) {
    return { ok: false, error: `${spell.name} is not known by this character` };
  }
  if (casterSim.ap < spell.apCost) {
    return { ok: false, error: `Not enough AP for ${spell.name} (need ${spell.apCost}, have ${casterSim.ap})` };
  }
  if (casterSim.mana < spell.manaCost) {
    return { ok: false, error: `Not enough mana for ${spell.name} (need ${spell.manaCost}, have ${casterSim.mana})` };
  }

  if (spell.target === 'self') return { ok: true };

  if (spell.target === 'enemy') {
    if (!enemyUnit) return { ok: false, error: 'No enemy target' };
    const dist = hexDistance(casterSim.pos, enemyUnit.position);
    if (dist > spell.range) {
      return { ok: false, error: `${spell.name} out of range (distance ${dist}, range ${spell.range})` };
    }
    return { ok: true };
  }

  if (spell.target === 'hex') {
    if (!target) return { ok: false, error: `${spell.name} requires a target hex` };
    if (target.q < 0 || target.q >= gridWidth || target.r < 0 || target.r >= gridHeight) {
      return { ok: false, error: 'Target hex is out of bounds' };
    }
    const dist = hexDistance(casterSim.pos, target);
    if (dist > spell.range) {
      return { ok: false, error: `${spell.name} out of range (distance ${dist}, range ${spell.range})` };
    }
    return { ok: true };
  }

  return { ok: false, error: `Unknown target type: ${spell.target}` };
}

// Build a zone subdoc from a spell + owner + target hex
function buildZone(spell, ownerCharId, target, gridWidth, gridHeight) {
  return {
    spellId:        spell.id,
    ownerCharacter: ownerCharId,
    hexes:          hexesInRadius(target, spell.radius, gridWidth, gridHeight),
    damage:         spell.damage,
    turnsLeft:      spell.duration,
    name:           spell.name,
    icon:           spell.icon,
    color:          spell.color,
  };
}

// Tick all active zones: apply damage to units standing in zone hexes,
// decrement turnsLeft, remove expired zones.
// units: array of unit subdocs (mutated in place — caller owns the document)
// Returns { survivingZones, ticks }
// ticks: array of { spellId, name, icon, color, hexes, hitUnits: [{charId, damage}] }
function tickZones(activeZones, units) {
  const survivingZones = [];
  const ticks          = [];

  for (const zone of activeZones) {
    const zoneHexSet = new Set(zone.hexes.map(h => `${h.q},${h.r}`));
    const hitUnits   = [];

    for (const unit of units) {
      const key = `${unit.position.q},${unit.position.r}`;
      if (zoneHexSet.has(key) && unit.hp > 0) {
        const dmg = zone.damage;
        unit.hp   = Math.max(0, unit.hp - dmg);
        hitUnits.push({ charId: String(unit.character._id || unit.character), name: unit.name, damage: dmg });
      }
    }

    if (hitUnits.length > 0 || zone.turnsLeft > 1) {
      ticks.push({
        spellId:  zone.spellId,
        name:     zone.name,
        icon:     zone.icon,
        color:    zone.color,
        hexes:    zone.hexes,
        hitUnits,
      });
    }

    const remaining = zone.turnsLeft - 1;
    if (remaining > 0) {
      survivingZones.push({ ...zone, turnsLeft: remaining });
    }
  }

  return { survivingZones, ticks };
}

module.exports = { hexDistance, hexesInRadius, validateCast, buildZone, tickZones };
