import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTerrainHeight } from './terrainNoise';

// ─── River water shader ───────────────────────────────────────────────────────
const RIVER_VERT = /* glsl */`
varying vec2 vUV;
void main() {
  vUV = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const RIVER_FRAG = /* glsl */`
precision mediump float;
uniform float uTime;
varying vec2 vUV;

float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p.yx + 19.19);
  return fract(p.x * p.y);
}

void main() {
  // Soft edge fade
  float edge = smoothstep(0.0, 0.14, vUV.x) * smoothstep(1.0, 0.86, vUV.x);
  // Animated flow: move UV along river axis
  vec2 flow = vec2(vUV.x * 5.0, vUV.y - uTime * 0.45);
  float ripple = hash(floor(flow * 7.0) / 7.0) * 0.09;
  // Darker in center (depth illusion)
  float depth = vUV.x * (1.0 - vUV.x) * 4.0;
  vec3 shallow = vec3(0.24, 0.64, 0.90) + ripple;
  vec3 deep    = vec3(0.10, 0.38, 0.74) + ripple * 0.4;
  vec3 color   = mix(shallow, deep, clamp(depth * 0.55, 0.0, 1.0));
  gl_FragColor = vec4(color, edge * 0.82);
}
`;

// ─── Seeded LCG RNG ───────────────────────────────────────────────────────────
function makeRng(seed) {
  let s = seed ^ 0xdeadbeef;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

// ─── Gradient-descent river tracing ──────────────────────────────────────────
function generateRivers(seed) {
  const rng = makeRng(seed);
  const STEP = 5, MAX_STEPS = 220, MIN_PTS = 14;

  // Sample candidate sources at high elevations
  const sources = [];
  for (let i = 0; i < 500 && sources.length < 40; i++) {
    const x = (rng() - 0.5) * 420;
    const z = (rng() - 0.5) * 420;
    const h = getTerrainHeight(x, z);
    if (h >= 16) sources.push({ x, z, h });
  }
  sources.sort((a, b) => b.h - a.h);

  const rivers = [];
  for (let ri = 0; ri < Math.min(6, sources.length); ri++) {
    let cx = sources[ri].x, cz = sources[ri].z;
    const pts = [];

    for (let step = 0; step < MAX_STEPS; step++) {
      const ch = getTerrainHeight(cx, cz);
      if (ch < -0.7 || Math.abs(cx) > 262 || Math.abs(cz) > 262) break;
      pts.push({ x: cx, z: cz, h: Math.max(0.3, ch) });

      // Find steepest downhill neighbor (4-directional)
      let bx = cx, bz = cz, bh = ch;
      for (const [dx, dz] of [[STEP,0],[-STEP,0],[0,STEP],[0,-STEP]]) {
        const nh = getTerrainHeight(cx + dx, cz + dz);
        if (nh < bh) { bx = cx+dx; bz = cz+dz; bh = nh; }
      }

      if (bx === cx && bz === cz) {
        // Stuck in local minimum — escape with random nudge
        cx += (rng() - 0.5) * STEP * 3.5;
        cz += (rng() - 0.5) * STEP * 3.5;
      } else {
        // Move to best neighbor + slight meander
        const dx = bx - cx, dz = bz - cz;
        const len = Math.sqrt(dx*dx + dz*dz) || 1;
        const m = (rng() - 0.5) * 0.55;
        cx = bx + (-dz / len) * m * STEP;
        cz = bz + ( dx / len) * m * STEP;
      }
    }

    if (pts.length >= MIN_PTS) rivers.push(pts);
  }

  return rivers;
}

// ─── Ribbon geometry along a river path ──────────────────────────────────────
function buildRiverGeo(pts) {
  const positions = [], uvs = [], indices = [];
  let uvY = 0;

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    let dx, dz;
    if (i < pts.length - 1) { dx = pts[i+1].x - p.x; dz = pts[i+1].z - p.z; }
    else                     { dx = p.x - pts[i-1].x; dz = p.z - pts[i-1].z; }
    const len = Math.sqrt(dx*dx + dz*dz) || 1;
    const nx = -dz/len, nz = dx/len;

    // Widen from source (2u) to mouth (6u)
    const half = (2.2 + (i / (pts.length - 1)) * 3.8) / 2;
    const y    = p.h + 0.22;

    positions.push(p.x + nx*half, y, p.z + nz*half, p.x - nx*half, y, p.z - nz*half);
    uvs.push(0, uvY, 1, uvY);
    uvY += len / 50;

    if (i > 0) {
      const b = (i - 1) * 2;
      indices.push(b, b+1, b+2, b+1, b+3, b+2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Rivers({ seed = 42 }) {
  const matRef = useRef(null);

  const { geometries, material } = useMemo(() => {
    const paths     = generateRivers(seed);
    const geometries = paths.map(buildRiverGeo);
    const material  = new THREE.ShaderMaterial({
      vertexShader:   RIVER_VERT,
      fragmentShader: RIVER_FRAG,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      depthWrite:  false,
      side: THREE.DoubleSide,
    });
    matRef.current = material;
    return { geometries, material };
  }, [seed]);

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <>
      {geometries.map((geo, i) => (
        <mesh key={i} geometry={geo} material={material} renderOrder={2} />
      ))}
    </>
  );
}
