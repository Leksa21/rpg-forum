import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTerrainHeight } from './terrainNoise';

const GOLD = new THREE.Color('#d4a843');

export default function PlayerMarker({ mapX, mapY }) {
  const sphereRef = useRef();
  const ring1Ref  = useRef();
  const ring2Ref  = useRef();

  const wx       = mapX - 50;
  const wz       = mapY - 50;
  const terrainY = useMemo(() => getTerrainHeight(wx, wz), [wx, wz]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    if (sphereRef.current) {
      sphereRef.current.position.y = terrainY + 1.5 + Math.sin(t * 2.2) * 0.2;
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
    <group position={[wx, terrainY, wz]}>
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

      <pointLight color={GOLD} intensity={3.5} distance={12} position={[0, 1.5, 0]} />
    </group>
  );
}
