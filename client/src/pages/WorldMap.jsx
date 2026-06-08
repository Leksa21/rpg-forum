import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { get } from '../lib/api';
import { useTravel } from '../hooks/useTravel';
import BgScene from '../components/layout/BgScene';
import Topbar from '../components/layout/Topbar';

const DANGER_COLORS = {
  safe: '#4a9a4a', low: '#7aaa44', medium: '#d4ac0d', high: '#e07020', deadly: '#c0392b',
};
const DANGER_TIME = {
  safe: '30s', low: '1 min', medium: '2 min', high: '5 min', deadly: '10 min',
};

function srand(x, y, s = 0) {
  const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.3) * 43758.5453;
  return v - Math.floor(v);
}

function toId(v) {
  if (!v) return null;
  return typeof v === 'object' && v._id ? v._id.toString() : v?.toString() ?? null;
}

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

// ── Terrain SVG atoms ──────────────────────────────────────────────────────

function Mountain({ x, y, s = 1, o = 0.72 }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`} opacity={o}>
      <polygon points="0,-6 -4.5,0 4.5,0" fill="#9a8070" stroke="#6a5040" strokeWidth="0.2"/>
      <polygon points="-3,-2.5 -7,0.5 0.5,0.5" fill="#857060" stroke="#6a5040" strokeWidth="0.15"/>
    </g>
  );
}

function Tree({ x, y, s = 1, o = 0.65, dark = false }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`} opacity={o}>
      <ellipse cx="0" cy="-3" rx="3" ry="3.5"
        fill={dark ? '#3a5030' : '#5a7848'}
        stroke={dark ? '#2a3820' : '#3a5030'} strokeWidth="0.2"/>
      <rect x="-0.8" y="0.3" width="1.6" height="2.5" fill={dark ? '#2a3020' : '#4a3020'}/>
    </g>
  );
}

function Wave({ x, y, w = 8, o = 0.55 }) {
  const hw = w / 2;
  return (
    <path
      d={`M${x},${y} Q${x+hw/2},${y-1.5} ${x+hw},${y} Q${x+hw*1.5},${y+1.5} ${x+w},${y}`}
      fill="none" stroke="#7aaac0" strokeWidth="0.6" opacity={o}
    />
  );
}

function Dune({ x, y, o = 0.5 }) {
  return <ellipse cx={x} cy={y} rx="6" ry="2.5" fill="#c0a055" stroke="#9a7835" strokeWidth="0.2" opacity={o}/>;
}

function SnowPatch({ x, y, o = 0.55 }) {
  return <ellipse cx={x} cy={y} rx="5" ry="3" fill="#d8e8f0" stroke="#b0c8d8" strokeWidth="0.2" opacity={o}/>;
}

function VolcRock({ x, y, o = 0.62 }) {
  return (
    <polygon points={`${x},${y-5} ${x-3.5},${y+2} ${x+3.5},${y+2}`}
      fill="#8a3820" stroke="#6a2810" strokeWidth="0.2" opacity={o}/>
  );
}

function Reed({ x, y, o = 0.6 }) {
  return (
    <g opacity={o}>
      <line x1={x} y1={y+2.5} x2={x} y2={y-3.5} stroke="#4a6a3a" strokeWidth="0.5"/>
      <ellipse cx={x} cy={y-4} rx="1" ry="1.5" fill="#5a7a4a"/>
      <line x1={x+2} y1={y+2} x2={x+2} y2={y-3} stroke="#4a6a3a" strokeWidth="0.45"/>
      <ellipse cx={x+2} cy={y-3.5} rx="0.9" ry="1.3" fill="#5a7a4a"/>
    </g>
  );
}

// ── Terrain Layer (all decorations) ──────────────────────────────────────

function TerrainLayer() {
  const elems = [];

  // Terrain tints
  elems.push(<ellipse key="tw"  cx="93" cy="62" rx="12" ry="20" fill="#7aaac0" opacity="0.14"/>);
  elems.push(<ellipse key="ti"  cx="9"  cy="10" rx="13" ry="11" fill="#c8d8e8" opacity="0.17"/>);
  elems.push(<ellipse key="tv"  cx="55" cy="13" rx="11" ry="9"  fill="#c06040" opacity="0.11"/>);
  elems.push(<ellipse key="ts"  cx="28" cy="74" rx="14" ry="10" fill="#4a6a3a" opacity="0.11"/>);
  elems.push(<ellipse key="td"  cx="79" cy="82" rx="16" ry="12" fill="#c8a060" opacity="0.14"/>);
  elems.push(<ellipse key="tdk" cx="68" cy="26" rx="12" ry="10" fill="#2a3a20" opacity="0.13"/>);
  elems.push(<ellipse key="tf"  cx="15" cy="66" rx="11" ry="12" fill="#4a6030" opacity="0.12"/>);

  // Mountains: Stoneback + Frozen Wastes (upper-left quadrant)
  for (let i = 0; i < 14; i++) {
    elems.push(<Mountain key={`ml${i}`}
      x={5 + srand(i, 0) * 24} y={4 + srand(0, i) * 38}
      s={0.55 + srand(i, i+1) * 0.85}
    />);
  }
  // Mountains: Flamecrest area (upper-center)
  for (let i = 0; i < 7; i++) {
    elems.push(<Mountain key={`mc${i}`}
      x={46 + srand(i+20, 0) * 15} y={5 + srand(0, i+20) * 14}
      s={0.5 + srand(i+20, i+21) * 0.7}
    />);
  }

  // Trees: Ancient Forest (lower-left)
  for (let i = 0; i < 14; i++) {
    elems.push(<Tree key={`tl${i}`}
      x={8 + srand(i, 3) * 16} y={57 + srand(3, i) * 22}
      s={0.6 + srand(i+3, i) * 0.7}
    />);
  }
  // Trees: Darkwood/Ashenveil (upper-right) — dark
  for (let i = 0; i < 12; i++) {
    elems.push(<Tree key={`td${i}`}
      x={60 + srand(i, 4) * 15} y={16 + srand(4, i) * 20}
      s={0.6 + srand(i+4, i) * 0.65}
      dark
    />);
  }

  // Water waves: coastal right
  for (let i = 0; i < 14; i++) {
    elems.push(<Wave key={`wv${i}`}
      x={83 + srand(i, 5) * 14 - 3} y={46 + srand(5, i) * 32}
      w={5 + srand(i, i+5) * 5}
    />);
  }

  // Desert dunes (lower-right)
  for (let i = 0; i < 16; i++) {
    elems.push(<Dune key={`dn${i}`}
      x={64 + srand(i, 6) * 28} y={69 + srand(6, i) * 24}
    />);
  }

  // Snow patches (top-left)
  for (let i = 0; i < 9; i++) {
    elems.push(<SnowPatch key={`sn${i}`}
      x={3 + srand(i, 7) * 18} y={3 + srand(7, i) * 18}
    />);
  }

  // Volcanic rocks (upper-center)
  for (let i = 0; i < 8; i++) {
    elems.push(<VolcRock key={`vr${i}`}
      x={47 + srand(i, 8) * 16} y={7 + srand(8, i) * 14}
    />);
  }

  // Reeds: Shadowmere Bayou (lower-center-left)
  for (let i = 0; i < 10; i++) {
    elems.push(<Reed key={`rd${i}`}
      x={20 + srand(i, 9) * 20} y={66 + srand(9, i) * 16}
    />);
  }

  return (
    <svg className="fm-terrain-svg" viewBox="0 0 100 100"
      preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      {elems}
    </svg>
  );
}

// ── Compass Rose ──────────────────────────────────────────────────────────

function CompassRose() {
  return (
    <div className="fm-compass">
      <svg viewBox="-26 -30 52 60" width="84" height="84">
        <polygon points="0,-22 -3.5,-8 3.5,-8" fill="#c9a84c"/>
        <polygon points="0,22 -3.5,8 3.5,8" fill="#7a6050"/>
        <polygon points="22,0 8,-3.5 8,3.5" fill="#7a6050"/>
        <polygon points="-22,0 -8,-3.5 -8,3.5" fill="#7a6050"/>
        <polygon points="14,-14 5,-6 7,-3" fill="#9a8868"/>
        <polygon points="-14,-14 -5,-6 -7,-3" fill="#9a8868"/>
        <polygon points="14,14 5,6 7,3" fill="#9a8868"/>
        <polygon points="-14,14 -5,6 -7,3" fill="#9a8868"/>
        <circle r="4.5" fill="#c9a84c" stroke="#7a5030" strokeWidth="0.8"/>
        <circle r="2" fill="#4a3020"/>
        <text y="-24" textAnchor="middle" fill="#4a3020" fontSize="7"
          fontFamily="Cinzel, serif" fontWeight="bold">N</text>
      </svg>
    </div>
  );
}

// ── Location Pin ─────────────────────────────────────────────────────────

function LocationPin({ loc, isHere, isTravelDest, onClick }) {
  const x = loc.mapCoords?.x ?? 50;
  const y = loc.mapCoords?.y ?? 50;
  const cls = ['fm-pin', isHere && 'fm-pin-here', isTravelDest && 'fm-pin-dest']
    .filter(Boolean).join(' ');

  return (
    <div className={cls} style={{ left: `${x}%`, top: `${y}%` }}
      onClick={() => onClick(loc)} title={loc.name}>
      <div className="fm-pin-inner">
        <span className="fm-pin-icon">{loc.icon}</span>
        <div className="fm-pin-marker" style={{ '--pin-color': loc.theme?.accentColor || '#4a3525' }}/>
        <span className="fm-pin-label">{loc.name}</span>
      </div>
    </div>
  );
}

// ── Travel Status Bar ─────────────────────────────────────────────────────

function TravelBar({ travel, onCancel, travelLoading }) {
  const countdown = useCountdown(travel?.arrivalTime);
  return (
    <div className="fm-travel-bar">
      <span>🚶 Traveling to <strong>{travel.to?.name || '…'}</strong></span>
      <span className="fm-tbar-countdown">{countdown}</span>
      <button className="fm-tbar-cancel" onClick={onCancel} disabled={travelLoading}>
        Cancel
      </button>
    </div>
  );
}

// ── Location Info Panel ───────────────────────────────────────────────────

function LocationPanel({ location, open, onClose, navigate, currentLocId, travel, travelLoading, onTravel, onCancelTravel }) {
  const [travelErr, setTravelErr] = useState('');

  const isHere = location
    ? (currentLocId === null && location.isStartingLocation) || currentLocId === location._id
    : false;

  const isActive    = travel?.status === 'traveling';
  const goingHere   = isActive && toId(travel?.to) === location?._id;
  const goingElse   = isActive && !goingHere;
  const countdown   = useCountdown(goingHere ? travel?.arrivalTime : null);

  const handleTravel = async () => {
    setTravelErr('');
    const result = await onTravel(location._id);
    if (result && !result.success) setTravelErr(result.error);
  };

  const dangerColor = location ? (DANGER_COLORS[location.dangerLevel] || '#aaa') : '#aaa';
  const gradient    = location?.theme?.gradient || 'linear-gradient(160deg,#0a0a14 0%,#141428 100%)';
  const accent      = location?.theme?.accentColor || '#c9a84c';

  return (
    <div className={`fm-panel ${open ? 'open' : ''}`}>
      <button className="fm-panel-close" onClick={onClose}>×</button>

      {location && (
        <>
          <div className="fm-panel-banner" style={{ background: gradient }}>
            <span className="fm-panel-icon">{location.icon}</span>
            <h2 className="fm-panel-name" style={{ color: accent }}>{location.name}</h2>
            <p className="fm-panel-region">{location.region?.name}</p>
          </div>

          <div className="fm-panel-body">
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
                  <span className="fm-tp-pulse"/>
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
                    <span>⏱ ~{DANGER_TIME[location.dangerLevel] || '?'}</span>
                  </div>
                  {travelErr && <p className="fm-tp-err">{travelErr}</p>}
                  <button className="fm-tp-go" onClick={handleTravel} disabled={travelLoading}>
                    {travelLoading ? 'Departing…' : `Journey to ${location.name} →`}
                  </button>
                </div>
              )}
            </div>

            <button className="fm-view-area" onClick={() => navigate(`/world/areas/${location._id}`)}>
              📜 View Area Forum
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main WorldMap ─────────────────────────────────────────────────────────

export default function WorldMap() {
  const navigate = useNavigate();
  const { token, character, refreshCharacter } = useAuth();
  const [locations, setLocations] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading]     = useState(true);

  const handleArrive = useCallback(() => {
    refreshCharacter?.();
  }, [refreshCharacter]);

  const { travel, loading: travelLoading, startTravel, cancelTravel } = useTravel(token, handleArrive);

  useEffect(() => {
    get('/api/world/locations')
      .then(r => setLocations(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const currentLocId = toId(character?.currentLocation);
  const travelDestId = travel?.status === 'traveling' ? toId(travel?.to) : null;

  const handleSelect = (loc) => {
    setSelected(loc);
    setPanelOpen(true);
  };

  const handleClose = () => setPanelOpen(false);

  return (
    <>
      <BgScene />
      <div className="dashboard">
        <Topbar />
        <main className="dash-main" style={{ padding: 0, overflow: 'hidden' }}>

          <div className="fm-wrap">

            {/* Parchment base */}
            <div className="fm-parchment"/>

            {/* SVG grain noise */}
            <svg className="fm-layer fm-grain" viewBox="0 0 300 300"
              preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="fm-noise-f">
                  <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch"/>
                  <feColorMatrix type="saturate" values="0"/>
                </filter>
              </defs>
              <rect width="300" height="300" filter="url(#fm-noise-f)" opacity="0.13"/>
            </svg>

            {/* SVG vignette */}
            <svg className="fm-layer fm-vignette" viewBox="0 0 100 100"
              preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="fm-vig-g" cx="50%" cy="50%" r="70%">
                  <stop offset="35%" stopColor="transparent"/>
                  <stop offset="100%" stopColor="rgba(55,30,8,0.65)"/>
                </radialGradient>
              </defs>
              <rect width="100" height="100" fill="url(#fm-vig-g)"/>
            </svg>

            {/* Terrain decorations */}
            <TerrainLayer/>

            {/* Map title */}
            <div className="fm-title">Known Realm</div>

            {/* Decorative inner border */}
            <div className="fm-border-frame"/>

            {/* Travel status bar */}
            {travel?.status === 'traveling' && (
              <TravelBar travel={travel} onCancel={cancelTravel} travelLoading={travelLoading}/>
            )}

            {/* Location pins */}
            {!loading && locations.map(loc => (
              <LocationPin
                key={loc._id}
                loc={loc}
                isHere={
                  currentLocId === null
                    ? loc.isStartingLocation === true
                    : currentLocId === loc._id
                }
                isTravelDest={travelDestId === loc._id}
                onClick={handleSelect}
              />
            ))}

            {/* Compass rose */}
            <CompassRose/>

            {/* Dimmer when panel open */}
            {panelOpen && <div className="fm-dimmer" onClick={handleClose}/>}

            {/* Info / travel panel */}
            <LocationPanel
              location={selected}
              open={panelOpen}
              onClose={handleClose}
              navigate={navigate}
              currentLocId={currentLocId}
              travel={travel}
              travelLoading={travelLoading}
              onTravel={startTravel}
              onCancelTravel={cancelTravel}
            />

          </div>

        </main>
      </div>
    </>
  );
}
