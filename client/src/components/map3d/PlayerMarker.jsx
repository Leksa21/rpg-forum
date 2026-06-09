import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTerrainHeight } from './terrainNoise';

const GOLD = new THREE.Color('#d4a843');

function smoothStep(t) {
  return t * t * (3 - 2 * t);
}

export default function PlayerMarker({ mapX, mapY, travelInfo }) {
  const groupRef = useRef();
  const ring1Ref = useRef();
  const ring2Ref = useRef();

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

    if (ring1Ref.current) {
      const p = (t % 1.6) / 1.6;
      ring1Ref.current.scale.setScalar(1 + p * 2.0);
      ring1Ref.current.material.opacity = Math.max(0, 0.55 * (1 - p));
    }
    if (ring2Ref.current) {
      const p = ((t + 0.8) % 1.6) / 1.6;
      ring2Ref.current.scale.setScalar(1 + p * 2.0);
      ring2Ref.current.material.opacity = Math.max(0, 0.55 * (1 - p));
    }
  });

  return (
    <group ref={groupRef} position={[staticWx, staticBaseY, staticWz]}>
      {/* Solid 2D disc — lies flat on the terrain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.14, 0]}>
        <circleGeometry args={[0.42, 32]} />
        <meshBasicMaterial color={GOLD} />
      </mesh>

      {/* Pulsing ring 1 */}
      <mesh ref={ring1Ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.10, 0]}>
        <ringGeometry args={[0.42, 0.62, 32]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Pulsing ring 2 (offset phase) */}
      <mesh ref={ring2Ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.10, 0]}>
        <ringGeometry args={[0.42, 0.62, 32]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.32} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      <pointLight color={GOLD} intensity={2.2} distance={9} position={[0, 0.5, 0]} />
    </group>
  );
}
