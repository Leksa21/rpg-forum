import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { getTerrainHeight, MAP_SCALE } from './terrainNoise';

// Stylized low-poly landmark per location type — replaces the old crystal pins.
// Each marker: stone base + miniature building + banner flag in the location's
// accent color + danger ring. Gold pulse marks the player's current location.

const STONE      = '#b9b1a3';
const STONE_DARK = '#8d8579';
const WOOD       = '#6b4a2e';
const GOLD       = '#d4a843';

const DANGER_COLORS = {
  safe: '#4a9a4a', low: '#7aaa44', medium: '#d4ac0d', high: '#e07020', deadly: '#c0392b',
};

function Flag({ x = 0, z = 0, y = 0, height = 3.2, accent }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.06, 0.08, height, 5]} />
        <meshLambertMaterial color={WOOD} />
      </mesh>
      <mesh position={[0.55, height - 0.45, 0]}>
        <boxGeometry args={[1.1, 0.7, 0.06]} />
        <meshLambertMaterial color={accent} />
      </mesh>
    </group>
  );
}

function Tower({ x = 0, z = 0, r = 0.55, h = 2.6, accent }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[r, r * 1.12, h, 8]} />
        <meshLambertMaterial color={STONE} />
      </mesh>
      <mesh position={[0, h + r * 0.85, 0]}>
        <coneGeometry args={[r * 1.35, r * 2.1, 8]} />
        <meshLambertMaterial color={accent} />
      </mesh>
    </group>
  );
}

function House({ x = 0, z = 0, w = 1.1, h = 0.9, rotY = 0, accent }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, w * 0.85]} />
        <meshLambertMaterial color={STONE} />
      </mesh>
      <mesh position={[0, h + w * 0.32, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[w * 0.78, w * 0.7, 4]} />
        <meshLambertMaterial color={accent} />
      </mesh>
    </group>
  );
}

// ── Landmark variants ────────────────────────────────────────────────────────

function CityLandmark({ accent }) {
  return (
    <group>
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[2.6, 2.0, 2.2]} />
        <meshLambertMaterial color={STONE} />
      </mesh>
      <Tower x={-1.35} z={-1.0} r={0.5} h={2.9} accent={accent} />
      <Tower x={1.35}  z={-1.0} r={0.5} h={2.9} accent={accent} />
      <Tower x={-1.35} z={1.0}  r={0.5} h={2.9} accent={accent} />
      <Tower x={1.35}  z={1.0}  r={0.5} h={2.9} accent={accent} />
      <Tower x={0}     z={0}    r={0.75} h={3.9} accent={accent} />
      <Flag y={3.9} height={2.6} accent={accent} />
    </group>
  );
}

function FortressLandmark({ accent }) {
  return (
    <group>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[3.0, 1.8, 1.6]} />
        <meshLambertMaterial color={STONE_DARK} />
      </mesh>
      <Tower x={-1.55} z={0} r={0.62} h={3.3} accent={accent} />
      <Tower x={1.55}  z={0} r={0.62} h={3.3} accent={accent} />
      <mesh position={[0, 2.05, 0]}>
        <boxGeometry args={[1.4, 0.7, 1.2]} />
        <meshLambertMaterial color={STONE_DARK} />
      </mesh>
      <Flag y={2.4} height={2.8} accent={accent} />
    </group>
  );
}

function VillageLandmark({ accent }) {
  return (
    <group>
      <House x={-1.0} z={0.4}  w={1.15} rotY={0.4}  accent={accent} />
      <House x={0.9}  z={-0.5} w={1.3}  rotY={-0.3} accent={accent} />
      <House x={0.3}  z={1.1}  w={0.95} rotY={1.1}  accent={accent} />
      <Flag x={-0.2} z={-1.2} height={2.6} accent={accent} />
    </group>
  );
}

function TownLandmark({ accent }) {
  return (
    <group>
      <House x={-0.9} z={0.5} w={1.25} rotY={0.3} accent={accent} />
      <House x={0.95} z={0.6} w={1.1}  rotY={-0.5} accent={accent} />
      <Tower x={0.1} z={-0.9} r={0.55} h={2.8} accent={accent} />
      <Flag x={0.1} z={-0.9} y={2.8} height={2.0} accent={accent} />
    </group>
  );
}

function OutpostLandmark({ accent }) {
  return (
    <group>
      <mesh position={[0, 1.7, 0]}>
        <cylinderGeometry args={[0.5, 0.72, 3.4, 7]} />
        <meshLambertMaterial color={WOOD} />
      </mesh>
      <mesh position={[0, 3.6, 0]}>
        <boxGeometry args={[1.7, 0.75, 1.7]} />
        <meshLambertMaterial color={STONE_DARK} />
      </mesh>
      <mesh position={[0, 4.4, 0]}>
        <coneGeometry args={[1.25, 1.1, 4]} />
        <meshLambertMaterial color={accent} />
      </mesh>
      <Flag x={0.7} y={3.95} height={2.2} accent={accent} />
    </group>
  );
}

function RuinsLandmark() {
  const cols = [
    { x: -1.1, z: 0.3,  h: 2.4, tilt: 0.12 },
    { x: 0.2,  z: -0.9, h: 1.5, tilt: -0.2 },
    { x: 1.1,  z: 0.5,  h: 3.0, tilt: 0.05 },
    { x: 0.5,  z: 1.2,  h: 1.0, tilt: 0.3 },
  ];
  return (
    <group>
      {cols.map((c, i) => (
        <mesh key={i} position={[c.x, c.h / 2, c.z]} rotation={[c.tilt, 0, c.tilt * 0.7]}>
          <cylinderGeometry args={[0.32, 0.38, c.h, 6]} />
          <meshLambertMaterial color={STONE_DARK} />
        </mesh>
      ))}
      {/* Fallen column */}
      <mesh position={[-0.2, 0.3, -0.2]} rotation={[0, 0.7, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 2.2, 6]} />
        <meshLambertMaterial color={STONE} />
      </mesh>
    </group>
  );
}

const LANDMARKS = {
  city:     CityLandmark,
  fortress: FortressLandmark,
  village:  VillageLandmark,
  town:     TownLandmark,
  outpost:  OutpostLandmark,
  ruins:    RuinsLandmark,
  dungeon:  RuinsLandmark,
};

export default function LocationMarker({ location, mapX, mapY, isHere, onClick }) {
  const groupRef = useRef();
  const ringRef  = useRef();
  const [hovered, setHovered] = useState(false);

  const wx = (mapX - 50) * MAP_SCALE;
  const wz = (mapY - 50) * MAP_SCALE;
  const terrainY = useMemo(() => Math.max(getTerrainHeight(wx, wz) - 0.25, 0.1), [wx, wz]);

  const accent      = location.theme?.accentColor || GOLD;
  const dangerColor = DANGER_COLORS[location.dangerLevel] || '#aaa';
  const Landmark    = LANDMARKS[location.type] || TownLandmark;

  useFrame(({ clock }, delta) => {
    if (groupRef.current) {
      const target = hovered ? 1.12 : 1;
      const s = groupRef.current.scale.x + (target - groupRef.current.scale.x) * Math.min(1, delta * 10);
      groupRef.current.scale.setScalar(s);
    }
    if (ringRef.current && isHere) {
      const t = clock.elapsedTime;
      ringRef.current.material.opacity = 0.35 + Math.sin(t * 2.4) * 0.22;
      const rs = 1 + Math.sin(t * 2.4) * 0.06;
      ringRef.current.scale.setScalar(rs);
    }
  });

  return (
    <group
      ref={groupRef}
      position={[wx, terrainY, wz]}
      onClick={onClick}
      onPointerEnter={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerLeave={() => { setHovered(false); document.body.style.cursor = ''; }}
    >
      {/* Stone base platform */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[2.9, 3.3, 0.5, 10]} />
        <meshLambertMaterial color={STONE_DARK} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[2.5, 2.9, 0.24, 10]} />
        <meshLambertMaterial color={STONE} />
      </mesh>

      {/* Danger ring around the base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.52, 0]}>
        <ringGeometry args={[2.95, 3.35, 36]} />
        <meshBasicMaterial color={dangerColor} transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Gold "you are here" pulse */}
      {isHere && (
        <>
          <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.56, 0]}>
            <ringGeometry args={[3.6, 4.4, 40]} />
            <meshBasicMaterial color={GOLD} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <pointLight color={GOLD} intensity={2.6} distance={16} position={[0, 5, 0]} />
        </>
      )}

      {/* The landmark building sits on the platform */}
      <group position={[0, 0.62, 0]}>
        <Landmark accent={accent} />
      </group>

      {(hovered || isHere) && (
        <Html position={[0, 7.4, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="wm3d-label" data-here={isHere}>
            {location.icon} {location.name}
            {isHere && <div className="wm3d-label-here">◆ YOU ARE HERE</div>}
          </div>
        </Html>
      )}
    </group>
  );
}
