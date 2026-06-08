const SIZE = 100;
const SCALE = 6;
const MAX_H = 14;

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
  const a = hash(ix, iy, s),     b = hash(ix + 1, iy, s);
  const c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
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

export function getTerrainHeight(worldX, worldZ, seed = 42) {
  const nx = (worldX + SIZE / 2) / SIZE;
  const nz = (worldZ + SIZE / 2) / SIZE;
  return fbm(nx * SCALE, nz * SCALE, seed) * MAX_H;
}
