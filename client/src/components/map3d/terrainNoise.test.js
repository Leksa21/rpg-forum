import { fbm, getTerrainHeight, MAP_SCALE } from './terrainNoise';

// Sample a grid of points across the full map extent (world units ±200)
function sampleGrid(seed = 42, step = 10) {
  const heights = [];
  for (let x = -200; x <= 200; x += step)
    for (let z = -200; z <= 200; z += step)
      heights.push(getTerrainHeight(x, z, seed));
  return heights;
}

test('MAP_SCALE is 4 (4 world units per game-coord unit)', () => {
  expect(MAP_SCALE).toBe(4);
});

describe('fbm()', () => {
  test('output is always in [0, 1]', () => {
    const vals = [
      fbm(0, 0, 42),
      fbm(0.5, 0.5, 42),
      fbm(10, 10, 99),
      fbm(-5, 3.7, 1337),
    ];
    vals.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });
  });

  test('is deterministic — same inputs always return the same value', () => {
    expect(fbm(1.2, 3.4, 99)).toBe(fbm(1.2, 3.4, 99));
  });

  test('different seeds produce different noise at the same coordinate', () => {
    expect(fbm(1.2, 3.4, 1)).not.toBe(fbm(1.2, 3.4, 2));
  });

  test('different coordinates produce different noise with the same seed', () => {
    expect(fbm(0, 0, 42)).not.toBe(fbm(1, 0, 42));
  });
});

describe('getTerrainHeight()', () => {
  test('is deterministic — same inputs always return the same height', () => {
    expect(getTerrainHeight(10, 20, 42)).toBe(getTerrainHeight(10, 20, 42));
  });

  test('different seeds produce different terrain', () => {
    expect(getTerrainHeight(0, 0, 1)).not.toBe(getTerrainHeight(0, 0, 2));
  });

  test('height is always within the theoretical range [-8, 28]', () => {
    const heights = sampleGrid(42);
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(-8.01);
    expect(Math.max(...heights)).toBeLessThanOrEqual(28.01);
  });

  test('the map contains both land (h > 0) and ocean (h < 0)', () => {
    const heights = sampleGrid(42);
    expect(heights.some(h => h > 0)).toBe(true);
    expect(heights.some(h => h < 0)).toBe(true);
  });

  test('all three continental centers are clearly above sea level', () => {
    // Centers in normalized space → world = (n - 0.5) * 400
    expect(getTerrainHeight((0.24 - 0.5) * 400, (0.36 - 0.5) * 400, 42)).toBeGreaterThan(0); // Westmark
    expect(getTerrainHeight((0.78 - 0.5) * 400, (0.28 - 0.5) * 400, 42)).toBeGreaterThan(0); // Eastreach
    expect(getTerrainHeight((0.58 - 0.5) * 400, (0.83 - 0.5) * 400, 42)).toBeGreaterThan(0); // Southsea
  });

  test('oceans separate the continents (water in the west-east channel)', () => {
    // Mid-channel between Westmark and Eastreach, normalized (0.54, 0.08)
    const h = getTerrainHeight((0.54 - 0.5) * 400, (0.08 - 0.5) * 400, 42);
    expect(h).toBeLessThan(0);
  });
});
