import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTerrainHeight } from './terrainNoise';

const GOLD = new THREE.Color('#d4a843');

function smoothStep(t) {
  return t * t * (3 - 2 * t);
}

export default function PlayerMarker({ mapX, mapY, travelInfo }) {
  const groupRef  = useRef();
  const sphereRef = useRef();
  const ring1Ref  = useRef();
  const ring2Ref  = useRef();
  const lightRef  = useRef();

  const staticWx    = mapX - 50;
  const staticWz    = mapY - 50;
  const staticBaseY = useMemo(() => getTerrainHeight(staticWx, staticWz), [staticWx, staticWz]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    let wx, wz, baseY;

    if (travelInfo) {
      const total   = new Date(travelInfo.arrivalTime) - new Date(travelInfo.departureTime);
      const elapsed = Date.now() - new Date(travelInfo.departureTime);
      const raw     = Math.min(1, Math.max(0, elapsed / total));
      const p       = smoothStep(raw);

      const mx = travelInfo.fromMapX + (travelInfo.toMapX - travelInfo.fromMapX) * p;
      const my = travelInfo.fromMapY + (travelInfo.toMapY - travelInfo.fromMapY) * p;
      wx    = mx - 50;
      wz    = my - 50;
      baseY = getTerrainHeight(wx, wz);
    } else {
      wx    = staticWx;
      wz    = staticWz;
      baseY = staticBaseY;
    }

    if (groupRef.current) {
      groupRef.current.position.set(wx, baseY, wz);
    }

    if (sphereRef.current) {
      sphereRef.current.position.y = 1.5 + Math.sin(t * 2.2) * 0.2;
    }

    if (lightRef.current) {
      lightRef.current.position.y = 1.5 + Math.sin(t * 2.2) * 0.2;
    }

    if (ring1Ref.current) {
      const p = (t % 1.5) / 1.5;
      ring1Ref.current.scale.setScalar(1 + p * 2);
      ring1Ref.current.material.opacity = Math.max(0, 0.55 * (1 - p));
    }

    if (ring2Ref.current) {
      const p = ((t + 0.75) % 1.5) / 1.5;
      ring2Ref.current.scale.setScalar(1 + p * 2);
      ring2Ref.current.material.opacity = Math.max(0, 0.55 * (1 - p));
    }
  });

  return (
    <group ref={groupRef} position={[staticWx, staticBaseY, staticWz]}>
      {/* Pulsing ground rings */}
      <mesh ref={ring1Ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[0.5, 0.85, 32]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.45} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[0.5, 0.85, 32]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Floating gold sphere */}
      <mesh ref={sphereRef} position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial
          color={GOLD} emissive={GOLD} emissiveIntensity={1.5}
          metalness={0.7} roughness={0.05}
        />
      </mesh>

      {/* Vertical beam */}
      <mesh position={[0, 5, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 10, 8]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.1} depthWrite={false} />
      </mesh>

      <pointLight ref={lightRef} color={GOLD} intensity={3.5} distance={12} position={[0, 1.5, 0]} />
    </group>
  );
}
