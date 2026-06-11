import { useMemo } from 'react';
import * as THREE from 'three';
import { fbm, getTerrainHeight } from './terrainNoise';

// Stylized instanced forests — thousands of low-poly trees in 2 draw calls.
// Trees are scattered on the forest biome (matching the terrain shader's
// canopy band) with deterministic hash jitter, so the layout never changes.
const HALF      = 256;   // scatter area half-size in world units
const STEP      = 3.4;   // sampling grid step
const MAX_TREES = 4500;

const MIN_H = 6.0;       // forest biome band
const MAX_H = 12.6;
const MAX_SLOPE = 2.6;   // skip cliffs (height delta over STEP units)

function hash2(x, z) {
  let h = (x * 374761393 + z * 668265263) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 0xFFFFFFFF;
}

export default function Forests({ seed = 42 }) {
  const { trunks, canopies, count } = useMemo(() => {
    const spots = [];

    for (let x = -HALF; x <= HALF && spots.length < MAX_TREES; x += STEP) {
      for (let z = -HALF; z <= HALF && spots.length < MAX_TREES; z += STEP) {
        const r1 = hash2(x * 7 + 13, z * 11 + 7);
        if (r1 > 0.62) continue; // thin out the grid

        const jx = x + (hash2(x, z) - 0.5) * STEP * 1.6;
        const jz = z + (hash2(z, x) - 0.5) * STEP * 1.6;
        const h  = getTerrainHeight(jx, jz, seed);
        if (h < MIN_H || h > MAX_H) continue;

        // Skip steep slopes
        const slope = Math.max(
          Math.abs(getTerrainHeight(jx + STEP, jz, seed) - h),
          Math.abs(getTerrainHeight(jx, jz + STEP, seed) - h)
        );
        if (slope > MAX_SLOPE) continue;

        // Cluster mask — denser where the terrain shader paints dark canopy
        const cluster = fbm(jx * 0.05, jz * 0.05, 3737, 3);
        if (cluster < 0.42 + hash2(jx * 3, jz * 5) * 0.18) continue;

        spots.push({ x: jx, z: jz, h, r: hash2(jx * 17, jz * 23) });
      }
    }

    const trunkGeo  = new THREE.CylinderGeometry(0.32, 0.5, 2.2, 5);
    const canopyGeo = new THREE.ConeGeometry(2.1, 5.4, 6);
    const trunkMat  = new THREE.MeshLambertMaterial({ color: '#5d4226' });
    const canopyMat = new THREE.MeshLambertMaterial({ color: '#ffffff' });

    const trunks   = new THREE.InstancedMesh(trunkGeo, trunkMat, spots.length);
    const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, spots.length);

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const greens = [
      new THREE.Color('#2e6b22'),
      new THREE.Color('#37772a'),
      new THREE.Color('#255c1c'),
      new THREE.Color('#418234'),
    ];

    spots.forEach((s, i) => {
      const scale = 0.7 + s.r * 0.8;
      q.setFromAxisAngle(up, s.r * Math.PI * 2);

      m.compose(
        new THREE.Vector3(s.x, s.h + 1.0 * scale, s.z),
        q,
        new THREE.Vector3(scale, scale, scale)
      );
      trunks.setMatrixAt(i, m);

      m.compose(
        new THREE.Vector3(s.x, s.h + (2.2 + 2.6) * scale, s.z),
        q,
        new THREE.Vector3(scale, scale, scale)
      );
      canopies.setMatrixAt(i, m);
      canopies.setColorAt(i, greens[Math.floor(s.r * greens.length) % greens.length]);
    });

    trunks.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    if (canopies.instanceColor) canopies.instanceColor.needsUpdate = true;

    return { trunks, canopies, count: spots.length };
  }, [seed]);

  return (
    <>
      <primitive object={trunks} />
      <primitive object={canopies} />
    </>
  );
}
