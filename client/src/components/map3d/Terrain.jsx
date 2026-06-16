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

// ── Aged relief-map palette — muted, earthy, hand-painted cartography ──
vec3 terrainColor(vec2 xz, float h, float sl, float lo, float md) {
  float hi = fn(xz * 1.2);              // fine hand-painted grain
  float g  = lo * 0.5 + md * 0.3 + hi * 0.2; // patchiness driver

  // Palette — desaturated, weathered tones of a crafted relief model
  vec3 deepW   = vec3(0.05, 0.13, 0.22);  // ink-dark sea
  vec3 shalW   = vec3(0.14, 0.34, 0.42);  // shallow teal
  vec3 sandC   = vec3(0.74, 0.65, 0.46);  // worn sand / coastline
  vec3 grassA  = vec3(0.40, 0.46, 0.27);  // dry olive lowland
  vec3 grassB  = vec3(0.28, 0.38, 0.22);  // shaded meadow
  vec3 forestC = vec3(0.16, 0.30, 0.18);  // deep muted woodland
  vec3 moorC   = vec3(0.52, 0.45, 0.30);  // ochre uplands / moor
  vec3 rockC   = vec3(0.42, 0.40, 0.40);  // slate rock
  vec3 rockHi  = vec3(0.58, 0.56, 0.56);
  vec3 snowC   = vec3(0.86, 0.86, 0.84);  // off-white aged snow

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

  // Contour lines — faint darkened rings at regular elevations, the
  // signature of a carved relief map. Only on land, fading near the coast.
  float contour = smoothstep(0.55, 0.5, abs(fract(h / 2.4 + hi * 0.06) - 0.5) * 2.0 - 0.86);
  col *= 1.0 - contour * 0.22 * smoothstep(0.3, 1.4, h);

  // Large painterly wash — aged warm/cool patches drifting across the parchment
  float macro = fn(xz * 0.0045);
  col *= mix(vec3(0.88, 0.86, 0.78), vec3(1.04, 1.00, 0.96), macro);

  return col;
}

uniform float uTime;

void main() {
  vec2 xz   = vWorldPos.xz;
  vec3 base = terrainColor(xz, vHeight, vSlope, vLo, vMid);

  // Museum key light — warm directional, deeper shadows, cool fill
  vec3 sunDir  = normalize(vec3(0.5, 0.78, 0.38));
  vec3 ambient = vec3(0.30, 0.30, 0.33);
  vec3 sun     = vec3(1.15, 1.02, 0.78);

  float diff = max(0.0, dot(vNormal, sunDir));
  diff = smoothstep(0.0, 0.5, diff) * 0.6 + diff * 0.4; // firmer, more sculpted falloff

  // Cool fill from below-left to keep shadowed slopes readable
  float fillT = max(0.0, dot(vNormal, normalize(vec3(-0.4, 0.2, -0.5))));
  vec3  fill  = vec3(0.22, 0.27, 0.34) * fillT * 0.4;

  float ao = 0.80 + 0.20 * (vNormal.y * 0.5 + 0.5);

  vec3 lit = base * (ambient + sun * diff + fill) * ao;

  // Gentle filmic roll-off keeps highlights from blowing out
  lit = lit / (lit + vec3(0.30)) * 1.30;

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
