// MAP_SCALE: visual world units per game-coord unit (game coords: 0-100)
export const MAP_SCALE = 4;

const SIZE  = 100 * MAP_SCALE; // 400 — world units for full map (game coords 0-100)
const SCALE = 10;              // noise frequency (higher = more terrain detail)
const MAX_H = 28;              // max peak height in world units

function hash(x, y, s) {
  let h = (s | 0) ^ ((x | 0) * 374761393) ^ ((y | 0) * 668265263);
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 0xFFFFFFFF;
}

function smooth(x, y, s) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix,     iy,     s), b = hash(ix + 1, iy,     s);
  const c = hash(ix,     iy + 1, s), d = hash(ix + 1, iy + 1, s);
  return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
}

export function fbm(nx, nz, seed, octaves = 5) {
  let v = 0, amp = 0.6, freq = 1, total = 0;
  for (let i = 0; i < octaves; i++) {
    v += smooth(nx * freq, nz * freq, seed + i * 997) * amp;
    total += amp;
    amp  *= 0.5;
    freq *= 2.1;
  }
  return v / total;
}

// Two continents — same shape in normalized space, just physically 4x larger
function continentMask(nx, nz) {
  const jitter = fbm(nx * 2.8, nz * 2.8, 7331) * 0.22;

  const d1x = (nx - 0.25) * 2.7, d1z = (nz - 0.50) * 1.9;
  const c1 = Math.max(0, 1 - Math.sqrt(d1x * d1x + d1z * d1z) + jitter);

  const d2x = (nx - 0.75) * 2.5, d2z = (nz - 0.50) * 1.7;
  const c2 = Math.max(0, 1 - Math.sqrt(d2x * d2x + d2z * d2z) + jitter * 0.9);

  return Math.min(1, Math.max(0, Math.max(c1, c2))) ** 1.6;
}

export function getTerrainHeight(worldX, worldZ, seed = 42) {
  const nx = (worldX + SIZE / 2) / SIZE;
  const nz = (worldZ + SIZE / 2) / SIZE;
  const noise = fbm(nx * SCALE, nz * SCALE, seed);
  const mask  = continentMask(nx, nz);
  return noise * mask * MAX_H - (1 - mask) * 2.2;
}
