import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { getTerrainHeight, MAP_SCALE } from './terrainNoise';

const GOLD   = new THREE.Color('#d4a843');
const VIOLET = new THREE.Color('#8b5cf6');

// Heights for each shard
const H_MAIN = 5.2;
const H_SEC  = 3.4;
const H_TER  = 2.4;

export default function CrystalPin({ location, mapX, mapY, isHere, onClick }) {
  const mainRef  = useRef();
  const glowRef  = useRef();
  const [hovered, setHovered] = useState(false);

  const color = isHere ? GOLD : VIOLET;
  const wx    = (mapX - 50) * MAP_SCALE;
  const wz    = (mapY - 50) * MAP_SCALE;

  // Embed 0.4 units below terrain so crystals look like they emerge from the ground
  const terrainY = useMemo(() => getTerrainHeight(wx, wz) - 0.4, [wx, wz]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (mainRef.current) {
      const pulse = 0.5 + Math.sin(t * 2.2 + wx * 0.3) * 0.4;
      mainRef.current.material.emissiveIntensity = isHere ? pulse * 1.5 : pulse * 0.6;
    }
    if (glowRef.current) {
      glowRef.current.material.opacity = 0.09 + Math.sin(t * 1.4 + wz * 0.2) * 0.07;
    }
  });

  return (
    <group
      position={[wx, terrainY, wz]}
      onClick={onClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* Ground glow ring */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.42, 0]}>
        <circleGeometry args={[2.4, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Main shard — base at y=0, tip at y=H_MAIN */}
      <mesh ref={mainRef} position={[0, H_MAIN / 2, 0]} castShadow>
        <coneGeometry args={[0.42, H_MAIN, 6]} />
        <meshStandardMaterial
          color={color} emissive={color} emissiveIntensity={0.7}
          metalness={0.25} roughness={0.08} transparent opacity={0.93}
        />
      </mesh>

      {/* Secondary shard — tilted right, base near ground */}
      <mesh position={[0.45, H_SEC / 2 - 0.1, 0.16]} rotation={[0, 0, 0.38]}>
        <coneGeometry args={[0.26, H_SEC, 6]} />
        <meshStandardMaterial
          color={color} emissive={color} emissiveIntensity={0.42}
          metalness={0.2} roughness={0.14} transparent opacity={0.78}
        />
      </mesh>

      {/* Tertiary shard — tilted left */}
      <mesh position={[-0.34, H_TER / 2 - 0.2, 0.24]} rotation={[0, 0.5, -0.30]}>
        <coneGeometry args={[0.18, H_TER, 6]} />
        <meshStandardMaterial
          color={color} emissive={color} emissiveIntensity={0.32}
          metalness={0.2} roughness={0.2} transparent opacity={0.65}
        />
      </mesh>

      <pointLight
        color={color}
        intensity={isHere ? 3.5 : 1.2}
        distance={isHere ? 14 : 8}
        position={[0, H_MAIN * 0.6, 0]}
      />

      {(hovered || isHere) && (
        <Html
          position={[0, H_MAIN + 2.2, 0]}
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
