import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { fbm, getTerrainHeight } from './terrainNoise';

const SIZE = 880;
const SEGS = 360; // ~130k verts — single static mesh, keeps carved rivers smooth

// ─── Vertex Shader ────────────────────────────────────────────────────────────
const VERT = /* glsl */`
attribute float aLowNoise;
attribute float aMidNoise;

varying vec3  vWorldPos;
varying vec3  vNormal;
varying float vHeight;
varying float vSlope;
varying float vLo;
varying float vMid;

void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorldPos = w.xyz;
  vNormal   = normalize(normalMatrix * normal);
  vHeight   = position.y;
  vSlope    = 1.0 - abs(vNormal.y);
  vLo       = aLowNoise;
  vMid      = aMidNoise;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// ─── Fragment Shader ──────────────────────────────────────────────────────────
const FRAG = /* glsl */`
precision highp float;

varying vec3  vWorldPos;
varying vec3  vNormal;
varying float vHeight;
varying float vSlope;
varying float vLo;
varying float vMid;

// ── Fast per-pixel noise (used for fine detail only) ──
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
// 2-octave fbm for fine surface detail
float fn(vec2 p) { return vn(p) * 0.62 + vn(p * 2.2) * 0.38; }

// ── Anime fantasy biome palette — every transition is a smooth gradient ──
vec3 terrainColor(vec2 xz, float h, float sl, float lo, float md) {
  float hi = fn(xz * 1.2);              // fine hand-painted grain
  float g  = lo * 0.5 + md * 0.3 + hi * 0.2; // patchiness driver

  // Palette — saturated Ghibli-style colors
  vec3 deepW   = vec3(0.09, 0.30, 0.60);
  vec3 shalW   = vec3(0.33, 0.75, 0.84);
  vec3 sandC   = vec3(0.97, 0.88, 0.62);
  vec3 grassA  = vec3(0.55, 0.85, 0.36);  // sunlit spring green
  vec3 grassB  = vec3(0.36, 0.72, 0.26);  // meadow
  vec3 forestC = vec3(0.17, 0.52, 0.22);  // emerald canopy
  vec3 moorC   = vec3(0.62, 0.66, 0.34);  // golden-olive uplands
  vec3 rockC   = vec3(0.56, 0.55, 0.70);  // lavender-blue anime rock
  vec3 rockHi  = vec3(0.74, 0.74, 0.87);
  vec3 snowC   = vec3(0.97, 0.98, 1.00);

  // Continuous vertical gradient — no hard bands anywhere
  vec3 col = mix(deepW, shalW, smoothstep(-3.5, -0.2, h));
  col = mix(col, sandC, smoothstep(-0.25, 0.85, h));
  col = mix(col, mix(grassA, grassB, smoothstep(0.25, 0.75, g)), smoothstep(0.7, 2.6, h));

  // Forest creeps in patchily — cluster noise decides where canopy takes over
  float forestT = smoothstep(4.2, 8.0, h) * (0.45 + 0.55 * smoothstep(0.3, 0.7, lo));
  col = mix(col, forestC, min(1.0, forestT));
  col = mix(col, forestC * 0.78, smoothstep(8.5, 12.0, h) * 0.5); // deep woods shade

  // Uplands → rock → snow, all gradient
  col = mix(col, moorC, smoothstep(11.0, 15.0, h));
  col = mix(col, mix(rockC, rockHi, md), smoothstep(14.0, 19.5, h));
  col = mix(col, snowC, smoothstep(21.0, 24.5, h + lo * 2.4)); // noisy snowline

  // Steep faces fade toward bare rock — smooth, slope- and height-aware
  float cliff = smoothstep(0.40, 0.62, sl) * smoothstep(0.6, 2.2, h);
  col = mix(col, mix(rockC * 0.82, rockHi * 0.9, hi), cliff * 0.85);

  // Large painterly wash — warm and cool patches drifting across the world
  float macro = fn(xz * 0.0045);
  col *= mix(vec3(0.94, 1.00, 0.90), vec3(1.06, 1.00, 1.07), macro);

  return col;
}

uniform float uTime;

void main() {
  vec2 xz   = vWorldPos.xz;
  vec3 base = terrainColor(xz, vHeight, vSlope, vLo, vMid);

  // Soft anime lighting — bright ambient, warm gentle sun, low contrast
  vec3 sunDir  = normalize(vec3(0.51, 0.69, -0.51));
  vec3 ambient = vec3(0.58, 0.62, 0.66);
  vec3 sun     = vec3(1.02, 0.92, 0.72);

  float diff = max(0.0, dot(vNormal, sunDir));
  diff = smoothstep(0.0, 0.62, diff) * 0.7 + diff * 0.3; // soft toon falloff

  // Hemisphere sky/ground bounce
  float hemiT   = 0.5 + 0.5 * vNormal.y;
  vec3  hemiCol = mix(vec3(0.28, 0.38, 0.18), vec3(0.55, 0.74, 0.92), hemiT) * 0.30;

  float ao = 0.86 + 0.14 * (vNormal.y * 0.5 + 0.5);

  // Drifting cloud shadows — large soft noise scrolling over the land
  float cloud  = fn(xz * 0.0075 + vec2(uTime * 0.013, uTime * 0.008));
  float shadow = mix(1.0, 0.80, smoothstep(0.52, 0.78, cloud));

  vec3 lit = base * (ambient + sun * diff + hemiCol) * ao * shadow;

  // Gentle filmic-ish roll-off keeps brights pastel instead of blown out
  lit = lit / (lit + vec3(0.22)) * 1.22;

  gl_FragColor = vec4(lit, 1.0);
}
`;

export default function Terrain({ seed = 42 }) {
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;

    // Pass 1: set heights
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, getTerrainHeight(pos.getX(i), pos.getZ(i), seed));
    }
    pos.needsUpdate = true;

    // Compute normals (needed for slope + lighting)
    geo.computeVertexNormals();

    // Pass 2: pre-compute coarse noise as vertex attributes
    // Fragment shader interpolates these and only computes fine detail per-pixel
    const lo = new Float32Array(pos.count);
    const md = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      lo[i] = fbm(x * 0.050, z * 0.050, 3737, 3);
      md[i] = fbm(x * 0.140, z * 0.140, 8821, 3);
    }
    geo.setAttribute('aLowNoise', new THREE.BufferAttribute(lo, 1));
    geo.setAttribute('aMidNoise', new THREE.BufferAttribute(md, 1));

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

  return <mesh geometry={geometry} material={material} />;
}
