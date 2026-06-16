import { useMemo } from 'react';
import * as THREE from 'three';

// The world model rests on a vast dark stone floor inside a quiet hall.
// Three pieces:
//   1. FLOOR  — a huge flagstone disc receding into the fog
//   2. WALL   — a stone basin wall that hides the square terrain/water edges
//   3. RIM    — a beveled stone lip framing the map like a crafted artifact
//
// All stone is shaded with one warm key light to match the scene lighting,
// so the diorama reads as a physical object sitting on the ground.

const FLOOR_Y     = -11;   // floor sits below the ocean floor (~ -7.5)
const FLOOR_R     = 1600;  // large enough to fill view, fades into fog
const WALL_R      = 432;   // matches terrain mesh half-extent (440) — hides the square edge
const RIM_INNER   = 380;   // world edge / water disc radius
const RIM_OUTER   = 470;
const RIM_TOP_Y   = 2.6;

// ── Shared stone fragment helpers — flagstone cells, grout, grain ──
const STONE_COMMON = /* glsl */`
  float h2(vec2 p){ p = fract(p*vec2(127.1,311.7)); p += dot(p,p.yx+19.19); return fract(p.x*p.y); }
  float vn(vec2 p){
    vec2 i=floor(p), f=fract(p);
    vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(h2(i),h2(i+vec2(1,0)),u.x), mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),u.x), u.y);
  }
  float fbm2(vec2 p){ return vn(p)*0.6 + vn(p*2.1)*0.3 + vn(p*4.3)*0.1; }
`;

// ─── Flagstone floor ───────────────────────────────────────────────────────────
const FLOOR_VERT = /* glsl */`
  varying vec2 vXZ;
  void main(){
    vec4 w = modelMatrix * vec4(position, 1.0);
    vXZ = w.xz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const FLOOR_FRAG = /* glsl */`
  precision highp float;
  varying vec2 vXZ;
  ${STONE_COMMON}

  void main(){
    float cell = 56.0;                       // flagstone size in world units
    vec2  g    = vXZ / cell;
    vec2  id   = floor(g);
    vec2  f    = fract(g);

    // per-stone tone + slight jitter so the grid is not mechanical
    float tone = 0.62 + 0.38 * h2(id);
    float grain = fbm2(vXZ * 0.10) * 0.22 + fbm2(vXZ * 0.9) * 0.10;

    // grout lines between flagstones
    vec2  e   = min(f, 1.0 - f);
    float edge = smoothstep(0.0, 0.045, min(e.x, e.y));

    // dark warm granite
    vec3 stone = vec3(0.135, 0.118, 0.105) * (tone + grain);
    vec3 grout = vec3(0.045, 0.038, 0.033);
    vec3 col   = mix(grout, stone, edge);

    // faint key-light wash + radial fade toward the fog
    col *= 0.85 + 0.25 * vn(vXZ * 0.012);
    float r = length(vXZ);
    col *= 1.0 - smoothstep(420.0, 1500.0, r) * 0.55;

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ─── Stone wall + rim (lit lambert against the key light) ───────────────────────
const RIM_VERT = /* glsl */`
  varying vec3 vN;
  varying vec3 vWorld;
  void main(){
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const RIM_FRAG = /* glsl */`
  precision highp float;
  varying vec3 vN;
  varying vec3 vWorld;
  ${STONE_COMMON}

  void main(){
    // chiseled stone — carved bands + grain
    float bands = fbm2(vWorld.xz * 0.05 + vWorld.y * 0.12) * 0.3;
    float grain = fbm2(vWorld.xz * 0.6 + vWorld.y * 0.4) * 0.18;
    vec3  base  = vec3(0.20, 0.175, 0.150) * (0.8 + bands + grain);

    vec3  keyDir = normalize(vec3(0.5, 0.78, 0.38));
    float diff   = max(0.0, dot(normalize(vN), keyDir)) * 0.7 + 0.45;
    vec3  col    = base * diff;

    // cool ambient fill from below
    col += vec3(0.05, 0.06, 0.08) * (0.5 - 0.5 * normalize(vN).y);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function StoneFloor() {
  const { floorGeo, floorMat, wallGeo, rimGeo, stoneMat } = useMemo(() => {
    const floorGeo = new THREE.CircleGeometry(FLOOR_R, 96);
    floorGeo.rotateX(-Math.PI / 2);

    const floorMat = new THREE.ShaderMaterial({
      vertexShader: FLOOR_VERT,
      fragmentShader: FLOOR_FRAG,
    });

    // Basin wall — open-ended cylinder from the floor up to the rim lip
    const wallH = RIM_TOP_Y - FLOOR_Y;
    const wallGeo = new THREE.CylinderGeometry(WALL_R + 6, WALL_R + 28, wallH, 96, 1, true);
    wallGeo.translate(0, FLOOR_Y + wallH / 2, 0);

    // Rim lip — a flat-ish ring cap framing the world edge, slightly raised
    const rimGeo = new THREE.RingGeometry(RIM_INNER, RIM_OUTER, 96, 1);
    rimGeo.rotateX(-Math.PI / 2);
    rimGeo.translate(0, RIM_TOP_Y, 0);

    const stoneMat = new THREE.ShaderMaterial({
      vertexShader: RIM_VERT,
      fragmentShader: RIM_FRAG,
      side: THREE.DoubleSide,
    });

    return { floorGeo, floorMat, wallGeo, rimGeo, stoneMat };
  }, []);

  return (
    <>
      <mesh geometry={floorGeo} material={floorMat} position={[0, FLOOR_Y, 0]} />
      <mesh geometry={wallGeo} material={stoneMat} />
      <mesh geometry={rimGeo} material={stoneMat} />
    </>
  );
}
