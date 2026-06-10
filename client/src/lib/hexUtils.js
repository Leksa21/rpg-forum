export const HEX_SIZE  = 16;
export const GRID_W    = 30;
export const GRID_H    = 30;
export const SQRT3     = Math.sqrt(3);

// Offset even-r: pixel center of hex at (col, row)
export function hexToPixel(col, row) {
  const x = HEX_SIZE * SQRT3 * col + (row % 2 === 1 ? HEX_SIZE * SQRT3 / 2 : 0) + HEX_SIZE * SQRT3 / 2;
  const y = HEX_SIZE * 1.5 * row + HEX_SIZE;
  return { x, y };
}

// SVG polygon points string for a pointy-top hex centered at (cx, cy)
export function hexPoints(cx, cy) {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    return `${cx + HEX_SIZE * Math.cos(angle)},${cy + HEX_SIZE * Math.sin(angle)}`;
  }).join(' ');
}

// Convert offset even-r to cube coordinates
function toCube(col, row) {
  const x = col - (row - (row & 1)) / 2;
  const z = row;
  return { x, y: -x - z, z };
}

// Hex distance between two offset positions {q, r}
export function hexDistance(a, b) {
  const ca = toCube(a.q, a.r);
  const cb = toCube(b.q, b.r);
  return (Math.abs(ca.x - cb.x) + Math.abs(ca.y - cb.y) + Math.abs(ca.z - cb.z)) / 2;
}

// All hexes reachable within `ap` steps from `pos` on an empty grid
export function getReachable(pos, ap, occupiedList) {
  const blocked = new Set(occupiedList.map(p => `${p.q},${p.r}`));
  const result  = new Set();
  for (let r = 0; r < GRID_H; r++) {
    for (let q = 0; q < GRID_W; q++) {
      if (blocked.has(`${q},${r}`)) continue;
      const d = hexDistance(pos, { q, r });
      if (d > 0 && d <= ap) result.add(`${q},${r}`);
    }
  }
  return result;
}

// Hexes occupied by enemies that are adjacent (for attack highlight)
export function getAttackable(myPos, enemyPositions) {
  const result = new Set();
  for (const ep of enemyPositions) {
    if (hexDistance(myPos, ep) === 1) result.add(`${ep.q},${ep.r}`);
  }
  return result;
}

// Total SVG canvas dimensions
export const CANVAS_W = Math.ceil(HEX_SIZE * SQRT3 * GRID_W + HEX_SIZE * SQRT3 / 2 + 20);
export const CANVAS_H = Math.ceil(HEX_SIZE * 1.5 * GRID_H + HEX_SIZE + 20);
