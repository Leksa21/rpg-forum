import { useMemo } from 'react';
import * as THREE from 'three';
import { fbm, getTerrainHeight } from './terrainNoise';

// Terrain plane in world units — larger than the 400-unit game area to show ocean borders
const SIZE = 520;
const SEGS = 140;

// Fantasy Civ-style color palette — vibrant, distinct biomes, slope-aware
function heightSlopeToRgb(h, slope) {
  // Steep slopes (cliff faces) override height with rock regardless of elevation
  if (slope > 0.52) {
    return h > 14 ? [0.78, 0.78, 0.76] : [0.60, 0.50, 0.38];
  }

  if (h < -2.0) return [0.08, 0.22, 0.50]; // deep ocean
  if (h < -0.8) return [0.12, 0.34, 0.62]; // ocean
  if (h < -0.1) return [0.18, 0.48, 0.72]; // coastal/shallow
  if (h <  1.0) return [0.92, 0.84, 0.52]; // sandy beach
  if (h <  4.0) return [0.42, 0.76, 0.24]; // bright lowland grass
  if (h <  9.0) return [0.30, 0.62, 0.18]; // plains / forest
  if (h < 14.0) return [0.22, 0.48, 0.13]; // dense highland forest
  if (h < 18.0) return [0.50, 0.42, 0.26]; // rocky highland
  if (h < 22.0) return [0.72, 0.68, 0.62]; // mountain rock
  return               [0.96, 0.96, 0.94]; // snow peaks
}

export default function Terrain({ seed = 42 }) {
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;

    // Pass 1: set all vertex heights
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, getTerrainHeight(pos.getX(i), pos.getZ(i), seed));
    }
    pos.needsUpdate = true;

    // Compute normals so we can read slope from them
    geo.computeVertexNormals();

    // Pass 2: slope-aware + noise-varied coloring
    const normals = geo.attributes.normal;
    const colors  = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const h     = pos.getY(i);
      const wx    = pos.getX(i);
      const wz    = pos.getZ(i);
      // ny close to 1 = flat, near 0 = vertical cliff
      const slope = 1 - Math.abs(normals.getY(i));

      let [r, g, b] = heightSlopeToRgb(h, slope);

      // High-frequency brightness variation for painterly texture — skip on ocean
      if (h > -0.5) {
        const vary = (fbm(wx * 0.04, wz * 0.04, 5678, 3) - 0.5) * 0.14;
        r = Math.min(1, Math.max(0, r + vary));
        g = Math.min(1, Math.max(0, g + vary * 0.9));
        b = Math.min(1, Math.max(0, b + vary * 0.5));
      }

      colors[i * 3]     = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return {
      geometry: geo,
      material: new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.88,
        metalness: 0.0,
      }),
    };
  }, [seed]);

  return <mesh geometry={geometry} material={material} />;
}
