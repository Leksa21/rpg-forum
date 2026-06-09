import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { getTerrainHeight, MAP_SCALE } from './terrainNoise';

const GOLD   = new THREE.Color('#d4a843');
const VIOLET = new THREE.Color('#8b5cf6');

export default function CrystalPin({ location, mapX, mapY, isHere, onClick }) {
  const mainRef  = useRef();
  const glowRef  = useRef();
  const [hovered, setHovered] = useState(false);

  const color    = isHere ? GOLD : VIOLET;
  const wx       = (mapX - 50) * MAP_SCALE;
  const wz       = (mapY - 50) * MAP_SCALE;
  const terrainY = useMemo(() => getTerrainHeight(wx, wz), [wx, wz]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (mainRef.current) {
      const pulse = 0.5 + Math.sin(t * 2.2 + wx * 0.3) * 0.4;
      mainRef.current.material.emissiveIntensity = isHere ? pulse * 1.5 : pulse * 0.5;
    }
    if (glowRef.current) {
      glowRef.current.material.opacity = 0.07 + Math.sin(t * 1.4 + wz * 0.2) * 0.06;
    }
  });

  return (
    <group
      position={[wx, terrainY, wz]}
      onClick={onClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* Ground glow */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <circleGeometry args={[1.6, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Main shard */}
      <mesh ref={mainRef} castShadow>
        <coneGeometry args={[0.28, 3.4, 6]} />
        <meshStandardMaterial
          color={color} emissive={color} emissiveIntensity={0.7}
          metalness={0.2} roughness={0.1} transparent opacity={0.92}
        />
      </mesh>

      {/* Secondary shard */}
      <mesh position={[0.3, -0.5, 0.1]} rotation={[0, 0, 0.42]}>
        <coneGeometry args={[0.17, 2.2, 6]} />
        <meshStandardMaterial
          color={color} emissive={color} emissiveIntensity={0.4}
          metalness={0.2} roughness={0.15} transparent opacity={0.76}
        />
      </mesh>

      {/* Tertiary shard */}
      <mesh position={[-0.22, -0.7, 0.18]} rotation={[0, 0.5, -0.28]}>
        <coneGeometry args={[0.12, 1.6, 6]} />
        <meshStandardMaterial
          color={color} emissive={color} emissiveIntensity={0.3}
          metalness={0.2} roughness={0.2} transparent opacity={0.62}
        />
      </mesh>

      <pointLight color={color} intensity={isHere ? 2.5 : 0.7} distance={isHere ? 10 : 5} position={[0, 1.5, 0]} />

      {(hovered || isHere) && (
        <Html
          position={[0, 4.8, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="wm3d-label" data-here={isHere}>
            {location.icon} {location.name}
            {isHere && <div className="wm3d-label-here">◆ YOU ARE HERE</div>}
          </div>
        </Html>
      )}
    </group>
  );
}
