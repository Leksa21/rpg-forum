import { useMemo, useRef, useEffect } from 'react';
import { OrbitControls } from '@react-three/drei';
import { getTerrainHeight, MAP_SCALE } from './terrainNoise';
import { toId } from '../../lib/utils';
import Terrain from './Terrain';
import StylizedWater from './StylizedWater';
import Forests from './Forests';
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

  // Center the orbit on the player's location once on mount and whenever the
  // location actually changes (e.g. after travel). We set it imperatively
  // rather than as a controlled prop so ordinary re-renders never reset the
  // camera mid-drag — that was the source of the jittery movement.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.target.set(orbitTarget[0], orbitTarget[1], orbitTarget[2]);
    controls.update();
  }, [orbitTarget]);

  return (
    <>
      {/* Three continents adrift in open ocean that runs to the horizon */}
      <color attach="background" args={['#16252e']} />

      {/* Overcast sea light — warm key sun, cool sky/sea bounce */}
      <ambientLight intensity={0.45} color="#a9b8c0" />
      <directionalLight position={[280, 400, 180]} intensity={1.45} color="#ffeccb" castShadow={false} />
      <hemisphereLight args={['#9fb8c8', '#10202a', 0.55]} />

      {/* Sea haze — the ocean fades seamlessly into the horizon */}
      <fog attach="fog" args={['#16252e', 320, 1500]} />

      {/* Rivers and lakes are carved into the terrain heightfield itself —
          the global water plane fills them, surrounded by open ocean to the horizon */}
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

      {/* Left-drag = orbit 360°, right-drag = pan along the sea, scroll = zoom.
          Polar angle is clamped so the camera can never dip below the horizon —
          you always look down onto the world, never underneath it.
          Target is set imperatively (see effect above), not as a prop. */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableRotate
        enableDamping
        dampingFactor={0.09}
        minDistance={70}
        maxDistance={920}
        minPolarAngle={0.15}
        maxPolarAngle={1.32}
        enablePan
        screenSpacePanning={false}
        panSpeed={0.8}
        rotateSpeed={0.6}
        zoomSpeed={0.9}
      />
    </>
  );
}
