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
      {/* Solid canvas background — prevents transparent/void edges */}
      <color attach="background" args={['#12102a']} />

      {/* Atmospheric sky (dusk/twilight) */}
      <Sky
        distance={450000}
        sunPosition={[80, 6, -160]}
        turbidity={14}
        rayleigh={1.8}
        mieCoefficient={0.004}
        mieDirectionalG={0.88}
      />

      {/* Lighting — no shadows (avoids deprecation warning) */}
      <ambientLight intensity={0.32} color="#8070c0" />
      <directionalLight position={[28, 55, -35]} intensity={1.1} color="#ffd890" />
      <pointLight position={[-20, 38, -18]} intensity={0.28} color="#5535aa" />

      {/* Fog pushed far — full terrain visible */}
      <fog attach="fog" args={['#12102a', 200, 400]} />

      {/* Ocean — large enough to fill any gap around terrain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]}>
        <planeGeometry args={[1200, 1200]} />
        <meshStandardMaterial color="#060e1e" roughness={0.8} metalness={0.1} />
      </mesh>

      <Terrain seed={42} />

      {locations.map(loc => {
        const mx     = loc.mapCoords?.x ?? 50;
        const my     = loc.mapCoords?.y ?? 50;
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

      {/* Left or right drag = pan, scroll = zoom, no rotation */}
      <OrbitControls
        ref={controlsRef}
        target={orbitTarget}
        enableRotate={false}
        enableDamping
        dampingFactor={0.08}
        minZoom={3}
        maxZoom={55}
        enablePan
        panSpeed={1.0}
        mouseButtons={{ LEFT: 2, MIDDLE: 1, RIGHT: 2 }}
      />
    </>
  );
}
