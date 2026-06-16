import { useMemo, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { getTerrainHeight, MAP_SCALE } from './terrainNoise';
import { toId } from '../../lib/utils';
import Terrain from './Terrain';
import StylizedWater from './StylizedWater';
import Forests from './Forests';
import StoneFloor from './StoneFloor';
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
      {/* The map is a crafted relief artifact resting on a stone floor in a dark hall */}
      <color attach="background" args={['#0e0b08']} />

      {/* Museum-style lighting — one warm key light picks the artifact out of the dark */}
      <ambientLight intensity={0.34} color="#b7a489" />
      <directionalLight position={[300, 420, 200]} intensity={1.55} color="#fff0d2" castShadow={false} />
      <hemisphereLight args={['#5a4a36', '#0a0806', 0.45]} />

      {/* Dark hall haze — fades the floor and hides the model's square edges */}
      <fog attach="fog" args={['#0e0b08', 360, 980]} />

      {/* Stone floor + basin rim that frames the world model */}
      <StoneFloor />

      {/* Rivers and lakes are carved into the terrain heightfield itself —
          the global water plane fills them with animated water and shore foam */}
      <StylizedWater seed={42} />
      <Terrain seed={42} />
      <Forests seed={42} />

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

      {/* Left-drag = orbit 360°, right-drag = pan, scroll = zoom.
          Polar angle is clamped so the camera can never dip below the
          horizon — you always look down onto the model, never underneath it. */}
      <OrbitControls
        ref={controlsRef}
        target={orbitTarget}
        enableRotate
        enableDamping
        dampingFactor={0.08}
        minDistance={70}
        maxDistance={560}
        minPolarAngle={0.18}
        maxPolarAngle={1.28}
        enablePan
        panSpeed={0.9}
        rotateSpeed={0.7}
      />
    </>
  );
}
