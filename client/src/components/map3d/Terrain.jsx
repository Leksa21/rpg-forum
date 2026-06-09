import { useMemo } from 'react';
import * as THREE from 'three';
import { fbm, getTerrainHeight } from './terrainNoise';

const SIZE = 520;
const SEGS = 240;

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

// ── Biome color ──
vec3 terrainColor(vec2 xz, float h, float sl, float lo, float md) {
  float hi = fn(xz * 1.9); // fine detail, per-pixel

  // Cliff faces — override height-based color
  if (sl > 0.50) {
    float v = vn(xz * 0.38) * 0.28 + 0.72;
    if (h > 15.0) return vec3(0.80, 0.80, 0.78) * v;
    return vec3(0.52, 0.44, 0.36) * v;
  }

  // Deep ocean
  if (h < -1.6) return mix(vec3(0.05, 0.16, 0.46), vec3(0.08, 0.22, 0.52), lo);
  // Ocean
  if (h < -0.5) return mix(vec3(0.09, 0.28, 0.58), vec3(0.14, 0.36, 0.66), md*0.5+lo*0.5);
  // Shallow coastal water
  if (h <  0.1) {
    float t = (h + 0.5) / 0.6;
    return mix(
      mix(vec3(0.10, 0.30, 0.60), vec3(0.15, 0.38, 0.67), md),
      mix(vec3(0.20, 0.54, 0.76), vec3(0.28, 0.64, 0.84), hi), t);
  }
  // Sandy beach — dry/wet gradient
  if (h < 1.4) {
    float wet   = 1.0 - smoothstep(0.1, 1.2, h);
    float grain = fn(xz * 1.6) * 0.18 + 0.82;
    return mix(vec3(0.90, 0.81, 0.50), vec3(0.66, 0.58, 0.36), wet*0.7) * grain;
  }
  // Lowland grassland — bright green patches
  if (h < 5.5) {
    float blend  = lo*0.55 + md*0.25 + hi*0.20;
    float t      = (h - 1.4) / 4.1;
    vec3  light  = vec3(0.45, 0.80, 0.25);
    vec3  mid2   = vec3(0.35, 0.68, 0.18);
    vec3  dark   = vec3(0.26, 0.54, 0.13);
    float inLow  = 1.0 - step(0.45, blend); // 1 if blend < 0.45, else 0
    vec3  lowC   = mix(light, mid2, clamp(blend / 0.45, 0.0, 1.0));
    vec3  hiC    = mix(mid2,  dark,  clamp((blend - 0.45) / 0.55, 0.0, 1.0));
    vec3  col    = mix(hiC, lowC, inLow);
    return mix(col, dark, t * 0.35);
  }
  // Forest — canopy clusters
  if (h < 13.0) {
    float cluster = pow(lo, 1.4)*0.60 + md*0.28 + hi*0.12;
    float t       = (h - 5.5) / 7.5;
    return mix(
      mix(vec3(0.26, 0.57, 0.14), vec3(0.16, 0.41, 0.08), cluster),
      vec3(0.10, 0.28, 0.06), t * 0.45);
  }
  // Highland — grass → rock transition
  if (h < 19.0) {
    float t = (h - 13.0) / 6.0;
    float r = md*0.45 + hi*0.35 + lo*0.20;
    return mix(vec3(0.28, 0.44, 0.14), vec3(0.54, 0.46, 0.28), t*0.65 + r*0.35);
  }
  // Mountain rock — horizontal strata
  if (h < 25.0) {
    float strata = abs(sin(h * 0.65 + lo * 2.8)) * 0.45 + 0.55;
    float n = md*0.5 + hi*0.5;
    return mix(vec3(0.56, 0.50, 0.42), vec3(0.74, 0.68, 0.60), strata * n);
  }
  // Snow peaks — sparkle
  float sp = pow(hi, 2.2) * 0.55 + lo * 0.25;
  return mix(vec3(0.86, 0.88, 0.93), vec3(0.97, 0.97, 0.99), sp);
}

void main() {
  vec2 xz   = vWorldPos.xz;
  vec3 base = terrainColor(xz, vHeight, vSlope, vLo, vMid);

  // Lighting — matches scene: directionalLight position [60, 80, -60]
  vec3 sunDir  = normalize(vec3(0.51, 0.69, -0.51));
  vec3 ambient = vec3(0.44, 0.54, 0.62);
  vec3 sun     = vec3(1.12, 1.00, 0.82);

  float diff = max(0.0, dot(vNormal, sunDir));

  // Hemisphere sky/ground light
  float hemiT   = 0.5 + 0.5 * vNormal.y;
  vec3  hemiCol = mix(vec3(0.24, 0.36, 0.12), vec3(0.48, 0.72, 0.85), hemiT) * 0.32;

  // Concave-area AO approximation
  float ao = 0.82 + 0.18 * (vNormal.y * 0.5 + 0.5);

  vec3 lit = base * (ambient + sun * diff + hemiCol) * ao;
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
    });

    return { geometry: geo, material: mat };
  }, [seed]);

  return <mesh geometry={geometry} material={material} />;
}
