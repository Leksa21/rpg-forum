import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { getTerrainHeight } from './terrainNoise';

const SILVER    = new THREE.Color('#8ab4d4');
const LERP_RATE = 0.05;

export default function OtherPlayerDot({ player }) {
  const groupRef  = useRef();
  const sphereRef = useRef();
  const [hovered, setHovered] = useState(false);

  // Keep target position in a ref so useFrame reads latest without stale closure
  const targetRef = useRef({ wx: player.mapX - 50, wz: player.mapY - 50 });
  targetRef.current = { wx: player.mapX - 50, wz: player.mapY - 50 };

  const initWx = player.mapX - 50;
  const initWz = player.mapY - 50;
  const initY  = useMemo(() => getTerrainHeight(initWx, initWz), [initWx, initWz]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t  = clock.elapsedTime;
    const { wx: tx, wz: tz } = targetRef.current;
    const p  = groupRef.current.position;

    // Lerp XZ toward target so jumps (every 3s) look smooth
    p.x += (tx - p.x) * LERP_RATE;
    p.z += (tz - p.z) * LERP_RATE;
    p.y  = getTerrainHeight(p.x, p.z);

    if (sphereRef.current) {
      sphereRef.current.position.y = 1.0 + Math.sin(t * 1.9 + tx * 0.3) * 0.12;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[initWx, initY, initWz]}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* Floating silver sphere */}
      <mesh ref={sphereRef} position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.28, 12, 12]} />
        <meshStandardMaterial
          color={SILVER}
          emissive={SILVER}
          emissiveIntensity={0.8}
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>

      <pointLight color={SILVER} intensity={1.5} distance={7} position={[0, 1.0, 0]} />

      {hovered && (
        <Html position={[0, 3.2, 0]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
          <div className="wm3d-label">
            ⚔ {player.name}
            {player.class && (
              <div className="wm3d-label-here" style={{ color: '#8ab4d4' }}>{player.class}</div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
