import { useMemo, useRef } from 'react';
import { OrbitControls, Sky } from '@react-three/drei';
import { getTerrainHeight } from './terrainNoise';
import Terrain from './Terrain';
import CrystalPin from './CrystalPin';
import PlayerMarker from './PlayerMarker';
import FogPlane from './FogPlane';
import OtherPlayerDot from './OtherPlayerDot';

function toId(v) {
  if (!v) return null;
  return typeof v === 'object' && v._id ? v._id.toString() : v?.toString() ?? null;
}

export default function MapScene({ locations, currentLocId, travelInfo, discoveredLocations, otherPlayers, onSelectLocation }) {
  const controlsRef = useRef();

  const currentLoc = useMemo(() => {
    if (!locations.length) return null;
    if (!currentLocId) return locations.find(l => l.isStartingLocation) ?? locations[0];
    return locations.find(l => toId(l._id) === toId(currentLocId)) ?? locations[0];
  }, [locations, currentLocId]);

  const playerMapX = currentLoc?.mapCoords?.x ?? 50;
  const playerMapY = currentLoc?.mapCoords?.y ?? 50;

  const orbitTarget = useMemo(() => {
    const wx = playerMapX - 50;
    const wz = playerMapY - 50;
    return [wx, Math.max(0, getTerrainHeight(wx, wz)) + 1, wz];
  }, [playerMapX, playerMapY]);

  return (
    <>
      {/* Atmospheric sky — twilight/dusk look, no more "space" background */}
      <Sky
        distance={450000}
        sunPosition={[80, 6, -160]}
        turbidity={14}
        rayleigh={1.8}
        mieCoefficient={0.004}
        mieDirectionalG={0.88}
      />

      {/* Lighting */}
      <ambientLight intensity={0.28} color="#8070c0" />
      <directionalLight
        position={[28, 55, -35]}
        intensity={1.1}
        color="#ffd890"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-20, 38, -18]} intensity={0.28} color="#5535aa" />

      {/* Atmospheric haze matching sky horizon */}
      <fog attach="fog" args={['#1e1640', 70, 145]} />

      {/* Deep ocean plane visible around and between continents */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]}>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#071428" roughness={0.7} metalness={0.15} />
      </mesh>

      <Terrain seed={42} />

      {locations.map(loc => {
        const mx   = loc.mapCoords?.x ?? 50;
        const my   = loc.mapCoords?.y ?? 50;
        const isHere = !!currentLoc && toId(loc._id) === toId(currentLoc._id);
        return (
          <CrystalPin
            key={toId(loc._id)}
            location={loc}
            mapX={mx}
            mapY={my}
            isHere={isHere}
            onClick={() => onSelectLocation(loc)}
          />
        );
      })}

      {currentLoc && (
        <PlayerMarker mapX={playerMapX} mapY={playerMapY} travelInfo={travelInfo} />
      )}

      {otherPlayers.map(p => (
        <OtherPlayerDot key={p.charId} player={p} />
      ))}

      <FogPlane
        mapX={playerMapX}
        mapY={playerMapY}
        travelInfo={travelInfo}
        discoveredLocations={discoveredLocations}
      />

      {/* Pan with right-click, zoom with scroll — rotation disabled */}
      <OrbitControls
        ref={controlsRef}
        target={orbitTarget}
        enableRotate={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={8}
        maxDistance={80}
        enablePan
        panSpeed={1.1}
        mouseButtons={{ LEFT: null, MIDDLE: 1, RIGHT: 2 }}
      />
    </>
  );
}
