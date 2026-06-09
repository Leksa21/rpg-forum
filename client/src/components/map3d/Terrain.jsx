import { useMemo } from 'react';
import * as THREE from 'three';
import { getTerrainHeight } from './terrainNoise';

const SIZE = 100;
const SEGS = 80;

function heightToRgb(h) {
  if (h < -1.4) return [0.02, 0.04, 0.16]; // deep ocean
  if (h < -0.4) return [0.03, 0.07, 0.24]; // ocean
  if (h <  0.3) return [0.04, 0.11, 0.30]; // shallows / coastal water
  if (h <  1.0) return [0.06, 0.18, 0.14]; // coastline
  if (h <  3.5) return [0.09, 0.32, 0.14]; // lowland plains
  if (h <  6.5) return [0.13, 0.40, 0.17]; // grassland
  if (h <  9.0) return [0.20, 0.17, 0.32]; // highlands / hills
  if (h < 12.0) return [0.38, 0.26, 0.44]; // mountains
  return                [0.72, 0.70, 0.84]; // snow peaks
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
      material: new THREE.MeshLambertMaterial({ vertexColors: true }),
    };
  }, [seed]);

  return <mesh geometry={geometry} material={material} receiveShadow />;
}
