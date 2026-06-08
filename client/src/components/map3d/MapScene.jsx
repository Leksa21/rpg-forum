import { useMemo, useRef } from 'react';
import { OrbitControls, Stars } from '@react-three/drei';
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
    return [wx, getTerrainHeight(wx, wz) + 2, wz];
  }, [playerMapX, playerMapY]);

  return (
    <>
      <ambientLight intensity={0.22} color="#7060b8" />
      <directionalLight
        position={[28, 52, 18]}
        intensity={1.05}
        color="#ffe4a0"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-18, 38, -18]} intensity={0.3} color="#5535a8" />

      <fog attach="fog" args={['#07051a', 52, 115]} />
      <Stars radius={90} depth={45} count={2400} factor={3} saturation={0.25} fade speed={0.35} />

      <Terrain seed={42} />

      {locations.map(loc => {
        const mx = loc.mapCoords?.x ?? 50;
        const my = loc.mapCoords?.y ?? 50;
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

      {currentLoc && <PlayerMarker mapX={playerMapX} mapY={playerMapY} travelInfo={travelInfo} />}

      {otherPlayers.map(p => (
        <OtherPlayerDot key={p.charId} player={p} />
      ))}

      <FogPlane
        mapX={playerMapX}
        mapY={playerMapY}
        travelInfo={travelInfo}
        discoveredLocations={discoveredLocations}
      />

      <OrbitControls
        ref={controlsRef}
        target={orbitTarget}
        enableDamping
        dampingFactor={0.07}
        minDistance={6}
        maxDistance={72}
        minPolarAngle={0.22}
        maxPolarAngle={Math.PI / 2.15}
        enablePan
        panSpeed={0.9}
      />
    </>
  );
}
