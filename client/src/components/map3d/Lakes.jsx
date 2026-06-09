import { useMemo } from 'react';
import { getTerrainHeight } from './terrainNoise';

// ─── Seeded LCG RNG ───────────────────────────────────────────────────────────
function makeRng(seed) {
  let s = (seed ^ 0xcafebabe) >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

// ─── Find inland basin candidates ────────────────────────────────────────────
function findLakes(seed) {
  const rng = makeRng(seed + 777);
  const lakes = [];
  const MIN_SEP = 55;

  for (let attempt = 0; attempt < 800 && lakes.length < 7; attempt++) {
    const cx = (rng() - 0.5) * 400;
    const cz = (rng() - 0.5) * 400;
    const ch = getTerrainHeight(cx, cz);

    // Must be low-lying but above sea level
    if (ch < 2.2 || ch > 8.5) continue;

    // All surrounding sample points must be at similar or higher elevation
    // (ensures it's an inland basin, not coastal flatland)
    const R = 22;
    const enclosed = [0, 60, 120, 180, 240, 300].every(deg => {
      const rad = deg * Math.PI / 180;
      return getTerrainHeight(cx + Math.cos(rad) * R, cz + Math.sin(rad) * R) >= ch - 1.8;
    });
    if (!enclosed) continue;

    // No lake too close to an existing one
    const tooClose = lakes.some(l => {
      const dx = l.x - cx, dz = l.z - cz;
      return Math.sqrt(dx*dx + dz*dz) < MIN_SEP;
    });
    if (tooClose) continue;

    // Slightly irregular radius
    const radius = 9 + rng() * 14;
    lakes.push({ x: cx, z: cz, y: ch + 0.1, radius });
  }

  return lakes;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Lakes({ seed = 42 }) {
  const lakes = useMemo(() => findLakes(seed), [seed]);

  return (
    <>
      {lakes.map((lake, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[lake.x, lake.y, lake.z]}
          renderOrder={1}
        >
          <circleGeometry args={[lake.radius, 36]} />
          <meshStandardMaterial
            color="#2060b8"
            roughness={0.06}
            metalness={0.45}
            transparent
            opacity={0.88}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}
