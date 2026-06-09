import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { getTerrainHeight, MAP_SCALE } from './terrainNoise';

const SILVER    = new THREE.Color('#8ab4d4');
const LERP_RATE = 0.05;

export default function OtherPlayerDot({ player }) {
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);

  const targetRef = useRef({ wx: (player.mapX - 50) * MAP_SCALE, wz: (player.mapY - 50) * MAP_SCALE });
  targetRef.current = { wx: (player.mapX - 50) * MAP_SCALE, wz: (player.mapY - 50) * MAP_SCALE };

  const initWx = (player.mapX - 50) * MAP_SCALE;
  const initWz = (player.mapY - 50) * MAP_SCALE;
  const initY  = useMemo(() => getTerrainHeight(initWx, initWz), [initWx, initWz]);

  useFrame(() => {
    if (!groupRef.current) return;
    const { wx: tx, wz: tz } = targetRef.current;
    const p = groupRef.current.position;
    p.x += (tx - p.x) * LERP_RATE;
    p.z += (tz - p.z) * LERP_RATE;
    p.y  = getTerrainHeight(p.x, p.z);
  });

  return (
    <group
      ref={groupRef}
      position={[initWx, initY, initWz]}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* Flat 2D disc on terrain surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <circleGeometry args={[0.28, 24]} />
        <meshBasicMaterial color={SILVER} />
      </mesh>

      <pointLight color={SILVER} intensity={1.2} distance={6} position={[0, 0.3, 0]} />

      {hovered && (
        <Html position={[0, 2.4, 0]} center style={{ pointerEvents: 'none' }}>
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
