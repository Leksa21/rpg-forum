import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { useAuth } from '../context/AuthContext';
import { get, post } from '../lib/api';
import { toId } from '../lib/utils';
import { useMapSocket } from '../hooks/useMapSocket';
import { useTravel } from '../hooks/useTravel';
import BgScene from '../components/layout/BgScene';
import Topbar from '../components/layout/Topbar';
import MapScene from '../components/map3d/MapScene';
import EncounterOverlay from '../components/map3d/EncounterOverlay';
import { getTerrainHeight, MAP_SCALE } from '../components/map3d/terrainNoise';
import { travelDurationSecs, formatTravelSecs } from '../lib/travelTime';

const DANGER_COLORS = {
  safe: '#4a9a4a', low: '#7aaa44', medium: '#d4ac0d', high: '#e07020', deadly: '#c0392b',
};

function useCountdown(arrivalTime) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!arrivalTime) { setSecs(0); return; }
    const update = () => setSecs(Math.max(0, Math.round((new Date(arrivalTime) - Date.now()) / 1000)));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [arrivalTime]);
  if (!arrivalTime || secs <= 0) return arrivalTime ? 'Arriving…' : '';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

function TravelBar({ travel, onCancel, travelLoading }) {
  const countdown = useCountdown(travel?.arrivalTime);
  return (
    <div className="wm3d-travel-bar">
      <span>🚶 Traveling to <strong>{travel.to?.name || '…'}</strong></span>
      <span className="wm3d-tbar-countdown">{countdown}</span>
      <button className="wm3d-tbar-cancel btn-secondary" onClick={onCancel} disabled={travelLoading}>
        Cancel
      </button>
    </div>
  );
}

function LocationPanel({ location, open, onClose, navigate, currentLocId, playerCoords, travel, travelLoading, onTravel, onCancelTravel }) {
  const [travelErr, setTravelErr] = useState('');

  const isHere    = location ? (currentLocId === null && location.isStartingLocation) || currentLocId === toId(location._id) : false;
  const isActive  = travel?.status === 'traveling';
  const goingHere = isActive && toId(travel?.to) === toId(location?._id);
  const goingElse = isActive && !goingHere;
  const countdown = useCountdown(goingHere ? travel?.arrivalTime : null);

  const handleTravel = async () => {
    setTravelErr('');
    const result = await onTravel(location._id);
    if (result && !result.success) setTravelErr(result.error);
  };

  const dangerColor = location ? (DANGER_COLORS[location.dangerLevel] || '#aaa') : '#aaa';
  const gradient    = location?.theme?.gradient || 'linear-gradient(160deg,#0a0a14 0%,#141428 100%)';
  const accent      = location?.theme?.accentColor || '#c9a84c';

  return (
    <div className={`wm3d-panel ${open ? 'open' : ''}`}>
      <button className="wm3d-panel-close" onClick={onClose}>×</button>

      {location && (
        <>
          <div className="wm3d-panel-banner" style={{ background: gradient }}>
            <span className="wm3d-panel-icon">{location.icon}</span>
            <h2 className="wm3d-panel-name" style={{ color: accent }}>{location.name}</h2>
            <p className="wm3d-panel-region">{location.region?.name}</p>
          </div>

          <div className="wm3d-panel-body">
            <div className="fm-panel-badges">
              <span className="fm-badge" style={{ color: dangerColor, borderColor: dangerColor }}>
                {location.dangerLevel}
              </span>
              <span className="fm-badge">{location.type}</span>
              {location.faction && <span className="fm-badge">{location.faction}</span>}
            </div>

            <p className="fm-panel-desc">{location.description}</p>
            {location.lore && <p className="fm-panel-lore">"{location.lore}"</p>}
            {location.population > 0 && (
              <p className="fm-panel-stat">👥 {location.population.toLocaleString()} inhabitants</p>
            )}

            <div className="fm-panel-travel">
              {isHere ? (
                <div className="fm-tp-here">
                  <span className="fm-tp-pulse" />
                  <span>📍 You are here</span>
                </div>
              ) : goingHere ? (
                <div className="fm-tp-going">
                  <p className="fm-tp-going-text">
                    🚶 Arriving in <strong className="fm-tp-countdown">{countdown}</strong>
                  </p>
                  <button className="fm-tp-cancel" onClick={onCancelTravel} disabled={travelLoading}>
                    Cancel journey
                  </button>
                </div>
              ) : goingElse ? (
                <div className="fm-tp-elsewhere">
                  <p>🚶 Already traveling to <strong>{travel.to?.name}</strong></p>
                  <p className="fm-tp-elsewhere-note">Finish your current journey first.</p>
                </div>
              ) : (
                <div className="fm-tp-start">
                  <div className="fm-tp-meta">
                    <span>⚔ <span style={{ color: dangerColor }}>{location.dangerLevel}</span> danger</span>
                    <span>⏱ ~{formatTravelSecs(travelDurationSecs(playerCoords, location.mapCoords))}</span>
                  </div>
                  {travelErr && <p className="fm-tp-err">{travelErr}</p>}
                  <button className="fm-tp-go" onClick={handleTravel} disabled={travelLoading}>
                    {travelLoading ? 'Departing…' : `Journey to ${location.name} →`}
                  </button>
                </div>
              )}
            </div>

            <button
              className={`fm-view-area${isHere ? ' fm-view-area--primary' : ''}`}
              onClick={() => navigate(`/world/areas/${location._id}`)}
            >
              📜 {isHere ? 'Enter this place’s forum →' : 'View area forum'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function WorldMap() {
  const navigate = useNavigate();
  const { token, character, refreshCharacter } = useAuth();
  const [locations, setLocations] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading]     = useState(true);

  const handleArrive = useCallback(() => { refreshCharacter?.(); }, [refreshCharacter]);
  const { travel, loading: travelLoading, startTravel, cancelTravel } = useTravel(token, handleArrive);

  // Seed discovered list from character data (already populated with mapCoords by API)
  const [discoveredLocations, setDiscoveredLocations] = useState(
    () => character?.discoveredLocations ?? []
  );

  // Keep in sync if character reloads (e.g. after travel arrives)
  useEffect(() => {
    if (character?.discoveredLocations) {
      setDiscoveredLocations(character.discoveredLocations);
    }
  }, [character?.discoveredLocations]);

  useEffect(() => {
    get('/api/world/locations')
      .then(r => setLocations(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const currentLocId = toId(character?.currentLocation);
  const myCharId     = toId(character?._id);

  const [playerMapX, playerMapY] = useMemo(() => {
    if (!locations.length) return [50, 50];
    const loc = locations.find(l => toId(l._id) === currentLocId)
              ?? locations.find(l => l.isStartingLocation)
              ?? locations[0];
    return [loc?.mapCoords?.x ?? 50, loc?.mapCoords?.y ?? 50];
  }, [locations, currentLocId]);

  const travelInfo = useMemo(() => {
    if (!travel || travel.status !== 'traveling' || !locations.length) return null;
    const fromId = toId(travel.from);
    const destId = toId(travel.to);
    const fromLoc = locations.find(l => toId(l._id) === fromId);
    const toLoc   = locations.find(l => toId(l._id) === destId);
    if (!fromLoc?.mapCoords || !toLoc?.mapCoords) return null;
    return {
      fromMapX:      fromLoc.mapCoords.x,
      fromMapY:      fromLoc.mapCoords.y,
      toMapX:        toLoc.mapCoords.x,
      toMapY:        toLoc.mapCoords.y,
      departureTime: travel.departureTime,
      arrivalTime:   travel.arrivalTime,
    };
  }, [travel, locations]);

  const { otherPlayers, encounter, respondToEncounter, clearEncounter } = useMapSocket(token, playerMapX, playerMapY, travelInfo, myCharId);

  const handleGoToBattle = () => {
    if (!encounter.battleId) return;
    clearEncounter();
    navigate(`/combat/${encounter.battleId}`);
  };

  const initialCameraPos = useMemo(() => {
    if (!locations.length) return [0, 150, 210];
    const loc = locations.find(l => toId(l._id) === currentLocId)
              ?? locations.find(l => l.isStartingLocation)
              ?? locations[0];
    const wx = ((loc?.mapCoords?.x ?? 50) - 50) * MAP_SCALE;
    const wz = ((loc?.mapCoords?.y ?? 50) - 50) * MAP_SCALE;
    return [wx, 185, wz + 240];
  }, [locations, currentLocId]);

  // Discovery check — runs every 4 seconds, fires once per location
  const discoveredIdsRef = useRef(new Set());
  useEffect(() => {
    if (character?.discoveredLocations) {
      character.discoveredLocations.forEach(l => discoveredIdsRef.current.add(toId(l._id ?? l)));
    }
  }, [character?.discoveredLocations]);

  useEffect(() => {
    if (!token || !locations.length) return;

    const TRIGGER_RADIUS = 16;

    function getPlayerXZ() {
      if (travelInfo) {
        const total   = new Date(travelInfo.arrivalTime) - new Date(travelInfo.departureTime);
        const elapsed = Date.now() - new Date(travelInfo.departureTime);
        const raw     = Math.min(1, Math.max(0, elapsed / total));
        const p       = raw * raw * (3 - 2 * raw);
        return [
          travelInfo.fromMapX + (travelInfo.toMapX - travelInfo.fromMapX) * p,
          travelInfo.fromMapY + (travelInfo.toMapY - travelInfo.fromMapY) * p,
        ];
      }
      const loc = locations.find(l => toId(l._id) === currentLocId)
                ?? locations.find(l => l.isStartingLocation)
                ?? locations[0];
      return [loc?.mapCoords?.x ?? 50, loc?.mapCoords?.y ?? 50];
    }

    function checkDiscoveries() {
      const [px, py] = getPlayerXZ();
      locations.forEach(loc => {
        const id = toId(loc._id);
        if (discoveredIdsRef.current.has(id)) return;
        const dx = (loc.mapCoords?.x ?? 50) - px;
        const dy = (loc.mapCoords?.y ?? 50) - py;
        if (Math.sqrt(dx * dx + dy * dy) < TRIGGER_RADIUS) {
          discoveredIdsRef.current.add(id);
          setDiscoveredLocations(prev => [...prev, loc]);
          post('/api/character/discover', { locationId: id }, token).catch(() => {});
        }
      });
    }

    checkDiscoveries();
    const id = setInterval(checkDiscoveries, 4000);
    return () => clearInterval(id);
  }, [token, locations, currentLocId, travelInfo]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (loc) => { setSelected(loc); setPanelOpen(true); };
  const handleClose  = () => setPanelOpen(false);

  return (
    <>
      <BgScene />
      <div className="wm3d-wrap">
        <Topbar />

        {loading ? (
          <div className="loading-screen">
            <div className="loading-rune">🗺️</div>
            <p className="text-muted">Charting the realm…</p>
          </div>
        ) : (
          <div className="wm3d-canvas-wrap">
            <Canvas
              camera={{ position: initialCameraPos, fov: 50, near: 1, far: 2000 }}
              gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
              dpr={[1, 1.75]}
            >
              <Suspense fallback={null}>
                <MapScene
                  locations={locations}
                  currentLocId={currentLocId}
                  travelInfo={travelInfo}
                  discoveredLocations={discoveredLocations}
                  otherPlayers={otherPlayers}
                  encounterActive={encounter.active}
                  onSelectLocation={handleSelect}
                />
              </Suspense>
            </Canvas>

            {/* Travel status HUD */}
            {travel?.status === 'traveling' && (
              <TravelBar travel={travel} onCancel={cancelTravel} travelLoading={travelLoading} />
            )}

            {/* Dimmer */}
            {panelOpen && <div className="wm3d-dimmer" onClick={handleClose} />}

            {/* Info / travel panel */}
            <LocationPanel
              location={selected}
              open={panelOpen}
              onClose={handleClose}
              navigate={navigate}
              currentLocId={currentLocId}
              playerCoords={{ x: playerMapX, y: playerMapY }}
              travel={travel}
              travelLoading={travelLoading}
              onTravel={startTravel}
              onCancelTravel={cancelTravel}
            />

            {/* Encounter overlay */}
            {encounter.active && (
              <EncounterOverlay
                encounter={encounter}
                onRespond={respondToEncounter}
                onGoToBattle={handleGoToBattle}
              />
            )}

            {/* Controls hint */}
            <div className="wm3d-hint">
              🖱 Drag to orbit · Right-drag to pan · Scroll to zoom · Click a location to travel
            </div>
          </div>
        )}
      </div>
    </>
  );
}
