// MAP_SCALE: visual world units per game-coord unit (game coords: 0-100)
export const MAP_SCALE = 4;

const SIZE  = 100 * MAP_SCALE; // 400 — world units for full map (game coords 0-100)
const MAX_H = 28;              // max peak height in world units

export const WATER_LEVEL = -0.55; // global water plane height (StylizedWater)

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

// Ridged multifractal — sharp mountain crests instead of round blobs
function ridged(nx, nz, seed, octaves = 4) {
  let v = 0, amp = 0.55, freq = 1, total = 0;
  for (let i = 0; i < octaves; i++) {
    const n = smooth(nx * freq, nz * freq, seed + i * 1013);
    const r = 1 - Math.abs(2 * n - 1);
    v += r * r * amp;
    total += amp;
    amp  *= 0.5;
    freq *= 2.05;
  }
  return v / total;
}

function smoothstep(a, b, t) {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

// ── Three continents ─────────────────────────────────────────────────────────
// Each entry: center (normalized 0-1), inverse radius per axis, mountain factor.
//  - Westmark:  the large temperate mainland with a central mountain spine
//  - Eastreach: tall, dramatic peaks
//  - Southsea:  low, gentle, island-like
const CONTINENTS = [
  { cx: 0.24, cz: 0.36, rx: 2.2, rz: 1.75, ridgeAmp: 0.95 },
  { cx: 0.78, cz: 0.28, rx: 2.6, rz: 2.25, ridgeAmp: 1.30 },
  { cx: 0.58, cz: 0.83, rx: 3.0, rz: 3.0,  ridgeAmp: 0.45 },
];

function continentField(nx, nz, jitter) {
  let mask = 0, ridgeAmp = 1;
  for (const c of CONTINENTS) {
    const dx = (nx - c.cx) * c.rx;
    const dz = (nz - c.cz) * c.rz;
    const m  = Math.max(0, 1 - Math.sqrt(dx * dx + dz * dz) + jitter);
    if (m > mask) { mask = m; ridgeAmp = c.ridgeAmp; }
  }
  return { mask: Math.min(1, mask) ** 1.5, ridgeAmp };
}

export function getTerrainHeight(worldX, worldZ, seed = 42) {
  const nx = (worldX + SIZE / 2) / SIZE;
  const nz = (worldZ + SIZE / 2) / SIZE;

  // Coast jitter shared by all continents — centers differ, so coasts still vary
  const jitter = (fbm(nx * 3.0, nz * 3.0, seed + 7331, 4) - 0.5) * 0.30;
  const { mask, ridgeAmp } = continentField(nx, nz, jitter);

  // Open ocean — gently undulating sea floor
  if (mask <= 0.002) {
    return -6.0 - fbm(nx * 6, nz * 6, seed + 11, 2) * 1.5;
  }

  // Steeper, more defined coastline; land interior sits safely above sea level
  const coast    = smoothstep(0.04, 0.36, mask);
  const base     = fbm(nx * 7.0, nz * 7.0, seed, 4);
  const ridge    = ridged(nx * 4.2, nz * 4.2, seed + 31, 4);
  const inland   = smoothstep(0.26, 0.72, mask);
  const mountain = Math.pow(ridge, 1.9) * inland * ridgeAmp;

  let h = coast * (1.0 + base * 6.0 + mountain * 30.0) - (1 - coast) * 7.0;

  // ── Carved rivers — winding channels that flow down to the sea ──
  if (h > 0) {
    const rv      = Math.abs(fbm(nx * 9.0, nz * 9.0, seed + 101, 4) * 2 - 1);
    const channel = Math.max(0, 1 - rv / 0.07);
    const altFade = 1 - smoothstep(8.0, 16.0, h); // rivers don't cross high peaks
    const carve   = Math.pow(channel, 1.7) * altFade;
    if (carve > 0) h = h * (1 - carve) + (WATER_LEVEL - 1.1) * carve;
  }

  // ── Carved lakes — broad basins depressed below the waterline ──
  if (h > 0.5 && h < 9.0) {
    const lk    = fbm(nx * 3.4, nz * 3.4, seed + 555, 3);
    const lakeT = smoothstep(0.665, 0.74, lk);
    if (lakeT > 0) h = h * (1 - lakeT) + (WATER_LEVEL - 1.6) * lakeT;
  }

  return Math.min(MAX_H, h);
}
