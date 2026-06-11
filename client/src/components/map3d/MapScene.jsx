import { useMemo, useRef } from 'react';
import { OrbitControls, Sky } from '@react-three/drei';
import { getTerrainHeight, MAP_SCALE } from './terrainNoise';
import { toId } from '../../lib/utils';
import Terrain from './Terrain';
import StylizedWater from './StylizedWater';
import Forests from './Forests';
import Clouds from './Clouds';
import LocationMarker from './LocationMarker';
import PlayerMarker from './PlayerMarker';
import FogPlane from './FogPlane';
import OtherPlayerDot from './OtherPlayerDot';

export default function MapScene({ locations, currentLocId, travelInfo, discoveredLocations, otherPlayers, encounterActive, onSelectLocation }) {
  const controlsRef = useRef();

  const currentLoc = useMemo(() => {
    if (!locations.length) return null;
    if (!currentLocId) return locations.find(l => l.isStartingLocation) ?? locations[0];
    return locations.find(l => toId(l._id) === toId(currentLocId)) ?? locations[0];
  }, [locations, currentLocId]);

  const playerMapX = currentLoc?.mapCoords?.x ?? 50;
  const playerMapY = currentLoc?.mapCoords?.y ?? 50;

  const orbitTarget = useMemo(() => {
    const wx = (playerMapX - 50) * MAP_SCALE;
    const wz = (playerMapY - 50) * MAP_SCALE;
    return [wx, Math.max(0, getTerrainHeight(wx, wz)) + 1, wz];
  }, [playerMapX, playerMapY]);

  return (
    <>
      {/* Soft anime sky */}
      <color attach="background" args={['#8fcbe8']} />
      <Sky
        distance={450000}
        sunPosition={[120, 65, -220]}
        turbidity={3.5}
        rayleigh={0.9}
        mieCoefficient={0.004}
        mieDirectionalG={0.8}
      />

      {/* Bright soft lighting — pastel, low contrast */}
      <ambientLight intensity={0.6} color="#dcecfa" />
      <directionalLight position={[60, 80, -60]} intensity={1.25} color="#ffeec2" />
      <hemisphereLight args={['#9ed4f0', '#5a8a3e', 0.4]} />

      {/* Atmospheric haze — soft blue distance fade for the bigger world */}
      <fog attach="fog" args={['#aed9ee', 650, 1700]} />

      {/* Rivers and lakes are carved into the terrain heightfield itself —
          the global water plane fills them with animated water and shore foam */}
      <StylizedWater seed={42} />
      <Terrain seed={42} />
      <Forests seed={42} />
      <Clouds seed={42} />

      {locations.map(loc => {
        const mx     = loc.mapCoords?.x ?? 50;
        const my     = loc.mapCoords?.y ?? 50;
        const isHere = !!currentLoc && toId(loc._id) === toId(currentLoc._id);
        return (
          <LocationMarker
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
        <PlayerMarker mapX={playerMapX} mapY={playerMapY} travelInfo={travelInfo} encounterActive={encounterActive} />
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

      {/* Drag = pan, scroll = zoom, no rotation */}
      <OrbitControls
        ref={controlsRef}
        target={orbitTarget}
        enableRotate={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={40}
        maxDistance={1400}
        enablePan
        panSpeed={1.0}
        mouseButtons={{ LEFT: 2, MIDDLE: 1, RIGHT: 2 }}
      />
    </>
  );
}
