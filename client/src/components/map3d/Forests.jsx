import { useMemo } from 'react';
import * as THREE from 'three';
import { fbm, getTerrainHeight } from './terrainNoise';

// Stylized instanced forests — two tree species in 4 draw calls total.
// Pines: two stacked cones. Broadleaf: a faceted leaf blob on a trunk.
// Placement is deterministic and clustered into distinct forest patches.
const HALF      = 400;   // scatter area half-size in world units
const STEP      = 6.2;   // sampling grid step
const MAX_TREES = 3200;

const MIN_H = 5.2;       // forest biome band
const MAX_H = 11.8;
const MAX_SLOPE = 2.4;   // skip cliffs (height delta over STEP units)

function hash2(x, z) {
  let h = (x * 374761393 + z * 668265263) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 0xFFFFFFFF;
}

// Muted, weathered greens to match the relief-map palette
const PINE_GREENS = [
  new THREE.Color('#1b3a1c'),
  new THREE.Color('#244a24'),
  new THREE.Color('#142f17'),
];
const LEAF_GREENS = [
  new THREE.Color('#2c4a22'),
  new THREE.Color('#375a2b'),
  new THREE.Color('#243d1d'),
];

export default function Forests({ seed = 42 }) {
  const meshes = useMemo(() => {
    const spots = [];

    for (let x = -HALF; x <= HALF && spots.length < MAX_TREES; x += STEP) {
      for (let z = -HALF; z <= HALF && spots.length < MAX_TREES; z += STEP) {
        const r1 = hash2(x * 7 + 13, z * 11 + 7);
        if (r1 > 0.72) continue;

        const jx = x + (hash2(x, z) - 0.5) * STEP * 1.7;
        const jz = z + (hash2(z, x) - 0.5) * STEP * 1.7;
        const h  = getTerrainHeight(jx, jz, seed);
        if (h < MIN_H || h > MAX_H) continue;

        const slope = Math.max(
          Math.abs(getTerrainHeight(jx + STEP, jz, seed) - h),
          Math.abs(getTerrainHeight(jx, jz + STEP, seed) - h)
        );
        if (slope > MAX_SLOPE) continue;

        // Cluster mask — trees gather in patches, not an even carpet
        const cluster = fbm(jx * 0.05, jz * 0.05, 3737, 3);
        if (cluster < 0.46 + hash2(jx * 3, jz * 5) * 0.16) continue;

        const r = hash2(jx * 17, jz * 23);
        spots.push({ x: jx, z: jz, h, r, isPine: hash2(jx * 5, jz * 13) < 0.6 });
      }
    }

    const pines  = spots.filter(s => s.isPine);
    const leafs  = spots.filter(s => !s.isPine);

    const trunkGeo   = new THREE.CylinderGeometry(0.45, 0.7, 3.2, 5);
    const coneGeo    = new THREE.ConeGeometry(3.0, 6.4, 7);
    const coneTopGeo = new THREE.ConeGeometry(2.0, 4.2, 7);
    const blobGeo    = new THREE.IcosahedronGeometry(2.9, 0);

    const trunkMat  = new THREE.MeshLambertMaterial({ color: '#5d4226' });
    const greenMat  = new THREE.MeshLambertMaterial({ color: '#ffffff' });

    const trunks   = new THREE.InstancedMesh(trunkGeo,   trunkMat, spots.length);
    const cones    = new THREE.InstancedMesh(coneGeo,    greenMat, pines.length);
    const coneTops = new THREE.InstancedMesh(coneTopGeo, greenMat, pines.length);
    const blobs    = new THREE.InstancedMesh(blobGeo,    greenMat, leafs.length);

    const m  = new THREE.Matrix4();
    const q  = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);

    const place = (mesh, i, s, y, scale, squash = 1) => {
      q.setFromAxisAngle(up, s.r * Math.PI * 2);
      m.compose(
        new THREE.Vector3(s.x, y, s.z),
        q,
        new THREE.Vector3(scale, scale * squash, scale)
      );
      mesh.setMatrixAt(i, m);
    };

    spots.forEach((s, i) => {
      const scale = 1.0 + s.r * 1.1;
      place(trunks, i, s, s.h + 1.4 * scale, scale);
    });

    pines.forEach((s, i) => {
      const scale = 1.0 + s.r * 1.1;
      place(cones,    i, s, s.h + (2.6 + 3.0) * scale, scale);
      place(coneTops, i, s, s.h + (2.6 + 6.6) * scale, scale);
      const c = PINE_GREENS[Math.floor(s.r * PINE_GREENS.length) % PINE_GREENS.length];
      cones.setColorAt(i, c);
      coneTops.setColorAt(i, c);
    });

    leafs.forEach((s, i) => {
      const scale = 1.0 + s.r * 1.1;
      place(blobs, i, s, s.h + (2.8 + 2.2) * scale, scale, 0.85);
      blobs.setColorAt(i, LEAF_GREENS[Math.floor(s.r * LEAF_GREENS.length) % LEAF_GREENS.length]);
    });

    for (const mesh of [trunks, cones, coneTops, blobs]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    return [trunks, cones, coneTops, blobs];
  }, [seed]);

  return (
    <>
      {meshes.map((mesh, i) => <primitive key={i} object={mesh} />)}
    </>
  );
}
