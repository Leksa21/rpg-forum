import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MAX_DISCOVERED  = 30;
const REVEAL_RADIUS   = 8;
const DISCOVER_RADIUS = 5;
const SOFT_EDGE       = 2;

function smoothStep(t) {
  return t * t * (3 - 2 * t);
}

const vertexShader = /* glsl */`
  varying vec2 vXZ;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vXZ = worldPos.xz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const fragmentShader = /* glsl */`
  precision mediump float;

  uniform vec2  uPlayerPos;
  uniform float uRevealRadius;
  uniform float uDiscoverRadius;
  uniform float uSoftEdge;
  uniform int   uDiscoveredCount;
  uniform vec2  uDiscoveredPos[${MAX_DISCOVERED}];

  varying vec2 vXZ;

  void main() {
    float alpha = 1.0;

    // Reveal around player
    float dPlayer = distance(vXZ, uPlayerPos);
    alpha = min(alpha, smoothstep(uRevealRadius - uSoftEdge, uRevealRadius, dPlayer));

    // Permanent reveal around each discovered location
    for (int i = 0; i < ${MAX_DISCOVERED}; i++) {
      if (i >= uDiscoveredCount) break;
      float d = distance(vXZ, uDiscoveredPos[i]);
      float locAlpha = smoothstep(uDiscoverRadius - uSoftEdge, uDiscoverRadius, d);
      alpha = min(alpha, locAlpha);
    }

    if (alpha < 0.01) discard;
    gl_FragColor = vec4(0.04, 0.02, 0.09, alpha * 0.92);
  }
`;

export default function FogPlane({ mapX, mapY, travelInfo, discoveredLocations }) {
  const matRef = useRef();

  const uniforms = useMemo(() => ({
    uPlayerPos:       { value: new THREE.Vector2(mapX - 50, mapY - 50) },
    uRevealRadius:    { value: REVEAL_RADIUS },
    uDiscoverRadius:  { value: DISCOVER_RADIUS },
    uSoftEdge:        { value: SOFT_EDGE },
    uDiscoveredCount: { value: 0 },
    uDiscoveredPos:   { value: Array.from({ length: MAX_DISCOVERED }, () => new THREE.Vector2()) },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!matRef.current) return;
    const count = Math.min(discoveredLocations.length, MAX_DISCOVERED);
    matRef.current.uniforms.uDiscoveredCount.value = count;
    discoveredLocations.slice(0, MAX_DISCOVERED).forEach((loc, i) => {
      const wx = (loc.mapCoords?.x ?? 50) - 50;
      const wz = (loc.mapCoords?.y ?? 50) - 50;
      matRef.current.uniforms.uDiscoveredPos.value[i].set(wx, wz);
    });
  }, [discoveredLocations]);

  useFrame(() => {
    if (!matRef.current) return;
    let wx, wz;

    if (travelInfo) {
      const total   = new Date(travelInfo.arrivalTime) - new Date(travelInfo.departureTime);
      const elapsed = Date.now() - new Date(travelInfo.departureTime);
      const raw     = Math.min(1, Math.max(0, elapsed / total));
      const p       = smoothStep(raw);
      const mx      = travelInfo.fromMapX + (travelInfo.toMapX - travelInfo.fromMapX) * p;
      const my      = travelInfo.fromMapY + (travelInfo.toMapY - travelInfo.fromMapY) * p;
      wx = mx - 50;
      wz = my - 50;
    } else {
      wx = mapX - 50;
      wz = mapY - 50;
    }

    matRef.current.uniforms.uPlayerPos.value.set(wx, wz);
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.4, 0]} renderOrder={10}>
      <planeGeometry args={[800, 800]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
