import { useMemo } from 'react';
import * as THREE from 'three';
import { getTerrainHeight } from './terrainNoise';

const SIZE = 160;
const SEGS = 100;

function heightToRgb(h) {
  if (h < -1.8) return [0.05, 0.18, 0.42]; // deep ocean
  if (h < -0.8) return [0.08, 0.27, 0.54]; // ocean
  if (h < -0.1) return [0.13, 0.39, 0.64]; // shallow coastal water
  if (h <  0.5) return [0.76, 0.68, 0.46]; // sandy beach/coast
  if (h <  2.0) return [0.33, 0.56, 0.22]; // coastal grass
  if (h <  4.5) return [0.24, 0.47, 0.16]; // plains
  if (h <  7.5) return [0.19, 0.38, 0.12]; // forest/lowland
  if (h < 10.0) return [0.44, 0.37, 0.20]; // rocky highlands
  if (h < 12.5) return [0.64, 0.60, 0.55]; // mountain rock
  return               [0.92, 0.91, 0.90]; // snow peaks
}

export default function Terrain({ seed = 42 }) {
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
    geo.rotateX(-Math.PI / 2);

    const pos    = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const h = getTerrainHeight(pos.getX(i), pos.getZ(i), seed);
      pos.setY(i, h);
      const [r, g, b] = heightToRgb(h);
      colors[i * 3]     = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    return {
      geometry: geo,
      material: new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.85,
        metalness: 0.0,
      }),
    };
  }, [seed]);

  return <mesh geometry={geometry} material={material} />;
}
