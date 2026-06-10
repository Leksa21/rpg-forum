import { GRID_W, GRID_H } from './hexUtils';

// Offset even-r hex distance (mirrors server formula)
function hexDistance(a, b) {
  const ax = a.q - (a.r - (a.r & 1)) / 2;
  const az = a.r;
  const ay = -ax - az;
  const bx = b.q - (b.r - (b.r & 1)) / 2;
  const bz = b.r;
  const by = -bx - bz;
  return (Math.abs(ax - bx) + Math.abs(ay - by) + Math.abs(az - bz)) / 2;
}

// Returns all {q,r} within radius of center that fit inside the grid
function hexesInRadius(center, radius) {
  const result = [];
  for (let r = 0; r < GRID_H; r++) {
    for (let q = 0; q < GRID_W; q++) {
      if (hexDistance(center, { q, r }) <= radius) {
        result.push({ q, r });
      }
    }
  }
  return result;
}

// Returns a Set of "q,r" keys that are legal cast targets for the given spell.
// casterPos: {q,r}  enemyPos: {q,r} or null
export function getCastableHexes(spell, casterPos, enemyPos) {
  const result = new Set();
  if (!spell || !casterPos) return result;

  if (spell.target === 'self') {
    result.add(`${casterPos.q},${casterPos.r}`);
    return result;
  }

  if (spell.target === 'enemy') {
    if (!enemyPos) return result;
    const dist = hexDistance(casterPos, enemyPos);
    if (dist <= spell.range) {
      result.add(`${enemyPos.q},${enemyPos.r}`);
    }
    return result;
  }

  if (spell.target === 'hex') {
    for (let r = 0; r < GRID_H; r++) {
      for (let q = 0; q < GRID_W; q++) {
        if (hexDistance(casterPos, { q, r }) <= spell.range) {
          result.add(`${q},${r}`);
        }
      }
    }
    return result;
  }

  return result;
}

// Returns a Set of "q,r" keys that a zone spell would cover if cast at targetHex
export function getZonePreviewHexes(spell, targetHex) {
  if (!spell || !targetHex || spell.kind !== 'zone') return new Set();
  const hexes = hexesInRadius(targetHex, spell.radius);
  return new Set(hexes.map(h => `${h.q},${h.r}`));
}
