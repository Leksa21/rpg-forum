import { useMemo } from 'react';
import * as THREE from 'three';
import { fbm } from './terrainNoise';

const SIZE = 100;
const SEGS = 80;
const SCALE = 6;
const MAX_H = 14;

function heightToRgb(h) {
  if (h < 0.9)  return [0.04, 0.06, 0.20];
  if (h < 1.8)  return [0.06, 0.11, 0.32];
  if (h < 3.0)  return [0.09, 0.26, 0.13];
  if (h < 6.0)  return [0.12, 0.36, 0.16];
  if (h < 8.5)  return [0.20, 0.16, 0.30];
  if (h < 11.5) return [0.36, 0.24, 0.42];
  return [0.70, 0.68, 0.80];
}

export default function Terrain({ seed = 42 }) {
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i);
      const wz = pos.getZ(i);
      const nx = (wx + SIZE / 2) / SIZE;
      const nz = (wz + SIZE / 2) / SIZE;
      const h = fbm(nx * SCALE, nz * SCALE, seed) * MAX_H;
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
