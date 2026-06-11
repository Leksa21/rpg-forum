import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTerrainHeight } from './terrainNoise';

// Animated painterly ocean. Shore foam is driven by a per-vertex mask
// precomputed from the terrain height — zero per-frame CPU cost.
const SIZE  = 760;
const SEGS  = 170;
const WATER_Y = -0.55;

const VERT = /* glsl */`
attribute float aFoam;
attribute float aDepth;

varying vec2  vXZ;
varying float vFoam;
varying float vDepth;

void main() {
  vec4 w  = modelMatrix * vec4(position, 1.0);
  vXZ     = w.xz;
  vFoam   = aFoam;
  vDepth  = aDepth;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */`
precision highp float;

uniform float uTime;

varying vec2  vXZ;
varying float vFoam;
varying float vDepth;

float h2(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p.yx + 19.19);
  return fract(p.x * p.y);
}
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i+vec2(1,0)), u.x),
             mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), u.x), u.y);
}

void main() {
  // Two layers of drifting wave noise
  float w1 = vn(vXZ * 0.060 + vec2(uTime * 0.05,  uTime * 0.035));
  float w2 = vn(vXZ * 0.150 - vec2(uTime * 0.04,  uTime * 0.06));
  float wave = w1 * 0.65 + w2 * 0.35;

  // Painterly banded water color, deep → shallow
  vec3 deep    = vec3(0.07, 0.26, 0.52);
  vec3 mid     = vec3(0.12, 0.38, 0.64);
  vec3 shallow = vec3(0.26, 0.62, 0.78);
  float band   = floor((1.0 - vDepth) * 3.0 + wave * 0.9) / 3.0;
  vec3 col     = mix(deep, mid, clamp(band, 0.0, 1.0));
  col          = mix(col, shallow, (1.0 - vDepth) * 0.55);

  // Sun sparkle on wave crests
  float sparkle = smoothstep(0.78, 0.95, w2) * 0.35;
  col += vec3(1.0, 0.95, 0.8) * sparkle;

  // Animated foam along the shoreline — breathing in and out
  float pulse = 0.5 + 0.5 * sin(uTime * 0.9 + vXZ.x * 0.05 + vXZ.y * 0.04);
  float foamN = vn(vXZ * 0.45 + vec2(uTime * 0.08, 0.0));
  float foam  = smoothstep(0.45, 0.85, vFoam * (0.70 + 0.30 * pulse) + foamN * 0.18 - 0.12);
  col = mix(col, vec3(0.94, 0.97, 1.0), foam * 0.85);

  gl_FragColor = vec4(col, 1.0);
}
`;

export default function StylizedWater({ seed = 42 }) {
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
    geo.rotateX(-Math.PI / 2);

    const pos   = geo.attributes.position;
    const foam  = new Float32Array(pos.count);
    const depth = new Float32Array(pos.count);

    for (let i = 0; i < pos.count; i++) {
      const h = getTerrainHeight(pos.getX(i), pos.getZ(i), seed);
      // Foam mask peaks where the seabed crosses the waterline
      foam[i]  = Math.max(0, 1 - Math.abs(h - WATER_Y + 0.35) / 1.5);
      // Depth 0 = shallow, 1 = deep open ocean
      depth[i] = Math.min(1, Math.max(0, -h / 5.5));
    }

    geo.setAttribute('aFoam',  new THREE.BufferAttribute(foam, 1));
    geo.setAttribute('aDepth', new THREE.BufferAttribute(depth, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms:       { uTime: { value: 0 } },
    });

    return { geometry: geo, material: mat };
  }, [seed]);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <>
      <mesh geometry={geometry} material={material} position={[0, WATER_Y, 0]} />
      {/* Far horizon ocean beyond the detailed plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_Y - 0.2, 0]}>
        <planeGeometry args={[2400, 2400]} />
        <meshBasicMaterial color="#0f3a60" />
      </mesh>
    </>
  );
}
