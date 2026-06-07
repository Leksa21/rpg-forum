import { useRef, useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useAuth } from '../context/AuthContext';
import { get, post } from '../lib/api';
import BgScene from '../components/layout/BgScene';
import Topbar from '../components/layout/Topbar';

const DANGER_COLORS = { safe: '#2ecc71', low: '#a8d8a8', medium: '#f0c060', high: '#e74c3c', deadly: '#900' };

// Terrain plane
function Terrain() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[40, 40, 32, 32]} />
      <meshStandardMaterial color="#0a0d18" roughness={0.9} metalness={0.1} />
    </mesh>
  );
}

// Route line between two locations
function RouteLine({ from, to }) {
  const points = [
    new THREE.Vector3(from[0], 0.05, from[2]),
    new THREE.Vector3(to[0], 0.05, to[2]),
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return (
    <line geometry={geometry}>
      <lineBasicMaterial color="#c9a84c" opacity={0.25} transparent />
    </line>
  );
}

// Location marker pin
function LocationPin({ location, isCurrent, isSelected, onClick }) {
  const meshRef = useRef();
  const glowRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.position.y = 0.4 + Math.sin(state.clock.elapsedTime * 1.5 + location.x) * 0.08;
    if (glowRef.current) {
      glowRef.current.material.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  const color = isCurrent ? '#c9a84c' : hovered ? '#f0d080' : '#8877aa';
  const scale = isCurrent ? 1.3 : hovered ? 1.15 : 1;

  return (
    <group position={[location.x, 0, location.z]}>
      {/* Glow ring */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.35, 0.6, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>
      {/* Pin */}
      <mesh
        ref={meshRef}
        scale={[scale, scale, scale]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
      >
        <cylinderGeometry args={[0.12, 0.2, 0.5, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.3} />
      </mesh>
      {/* Label */}
      <Html distanceFactor={12} position={[0, 1, 0]} center>
        <div className="wm3d-label" style={{ color: isCurrent ? '#c9a84c' : '#a89d88', fontWeight: isCurrent ? 700 : 400 }}>
          {location.icon} {location.name}
          {isCurrent && <span className="wm3d-here"> ●</span>}
        </div>
      </Html>
    </group>
  );
}

function Scene({ locations, routes, currentLocationId, onSelectLocation }) {
  const { camera } = useThree();
  useEffect(() => { camera.position.set(0, 18, 14); camera.lookAt(0, 0, 0); }, [camera]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <pointLight position={[0, 8, 0]} intensity={0.2} color="#c9a84c" />
      <Stars radius={60} depth={40} count={1500} factor={3} saturation={0} fade />
      <Terrain />
      {routes.map((r, i) => {
        const from = locations.find(l => l._id === r[0]);
        const to   = locations.find(l => l._id === r[1]);
        if (!from || !to) return null;
        return <RouteLine key={i} from={[from.x, 0, from.z]} to={[to.x, 0, to.z]} />;
      })}
      {locations.map(loc => (
        <LocationPin
          key={loc._id}
          location={loc}
          isCurrent={loc._id === currentLocationId}
          onSelectLocation={onSelectLocation}
          onClick={() => onSelectLocation(loc)}
        />
      ))}
      <OrbitControls
        enablePan={true}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={6}
        maxDistance={30}
      />
    </>
  );
}

export default function WorldMap() {
  const navigate = useNavigate();
  const { token, character } = useAuth();
  const [locations, setLocations]   = useState([]);
  const [routes, setRoutes]         = useState([]);
  const [selected, setSelected]     = useState(null);
  const [currentId, setCurrentId]   = useState(null);
  const [traveling, setTraveling]   = useState(null);
  const [travelLoading, setTravelLoading] = useState(false);
  const [toast, setToast]           = useState('');

  useEffect(() => {
    get('/api/world/locations').then(res => {
      const locs = res.data.map(loc => ({
        ...loc,
        x: (loc.mapCoords?.x ?? 50) / 10 - 5,
        z: (loc.mapCoords?.y ?? 50) / 10 - 5,
      }));
      setLocations(locs);

      const rs = [];
      locs.forEach(loc => {
        (loc.connectedTo || []).forEach(conn => {
          const connId = typeof conn === 'object' ? conn._id : conn;
          if (!rs.some(r => (r[0] === loc._id && r[1] === connId) || (r[1] === loc._id && r[0] === connId))) {
            rs.push([loc._id, connId]);
          }
        });
      });
      setRoutes(rs);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!token) return;
    get('/api/travel/active', token)
      .then(res => { if (res.data) setTraveling(res.data); })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (character?.currentLocation) {
      setCurrentId(typeof character.currentLocation === 'object'
        ? character.currentLocation._id
        : character.currentLocation);
    } else {
      const starting = locations.find(l => l.isStartingLocation);
      if (starting) setCurrentId(starting._id);
    }
  }, [character, locations]);

  const handleTravel = async (destId) => {
    if (!token) { setToast('Log in to travel.'); return; }
    setTravelLoading(true);
    try {
      const res = await post('/api/travel', { toLocationId: destId }, token);
      setTraveling(res.data);
      setToast(`Traveling to ${selected.name}…`);
      setSelected(null);
    } catch (err) {
      setToast(err.message);
    } finally {
      setTravelLoading(false);
    }
  };

  const arrivalMins = traveling
    ? Math.max(0, Math.round((new Date(traveling.arrivalTime) - Date.now()) / 60000))
    : 0;

  return (
    <>
      <BgScene />
      <div className="dashboard">
        <Topbar />
        <main className="dash-main" style={{ padding: 0 }}>

          <div className="wm3d-wrap">

            {/* Header */}
            <div className="wm3d-header">
              <button className="wm-back" onClick={() => navigate('/dashboard')}>← Back</button>
              <h1 className="wm-title">World Map</h1>
              <p className="wm-sub">Click a location to travel</p>
            </div>

            {/* Travel status bar */}
            {traveling && traveling.status === 'traveling' && (
              <div className="wm3d-travel-bar">
                <span>🚶 Traveling to <strong>{traveling.to?.name}</strong></span>
                <span className="wm3d-eta">~{arrivalMins} min remaining</span>
              </div>
            )}

            {/* Toast */}
            {toast && (
              <div className="wm3d-toast" onClick={() => setToast('')}>{toast}</div>
            )}

            {/* 3D Canvas */}
            <div className="wm3d-canvas">
              <Canvas shadows camera={{ position: [0, 18, 14], fov: 50 }}>
                <Suspense fallback={null}>
                  <Scene
                    locations={locations}
                    routes={routes}
                    currentLocationId={currentId}
                    onSelectLocation={setSelected}
                  />
                </Suspense>
              </Canvas>
            </div>

            {/* Selected location panel */}
            {selected && (
              <div className="wm3d-info-panel">
                <button className="wm3d-close" onClick={() => setSelected(null)}>×</button>
                <div className="wm3d-info-icon">{selected.icon}</div>
                <h2 className="wm3d-info-name">{selected.name}</h2>
                <p className="wm3d-info-region">{selected.region?.name || ''}</p>
                <p className="wm3d-info-desc">{selected.description}</p>
                <div className="wm3d-info-meta">
                  <span style={{ color: DANGER_COLORS[selected.dangerLevel] || '#aaa' }}>
                    {selected.dangerLevel?.charAt(0).toUpperCase() + selected.dangerLevel?.slice(1)} danger
                  </span>
                  <span>Pop. {selected.population?.toLocaleString() || '?'}</span>
                  <span>{selected.faction}</span>
                </div>
                {selected._id !== currentId && (
                  <button
                    className="btn-primary"
                    style={{ marginTop: '1rem', width: '100%' }}
                    onClick={() => handleTravel(selected._id)}
                    disabled={travelLoading || (traveling && traveling.status === 'traveling')}
                  >
                    {travelLoading ? 'Departing…'
                      : traveling?.status === 'traveling' ? 'Already traveling'
                      : `Travel to ${selected.name}`}
                  </button>
                )}
                {selected._id === currentId && (
                  <p className="wm3d-here-msg">📍 You are here</p>
                )}
              </div>
            )}

            {/* Location list */}
            <div style={{ padding: '1.5rem' }}>
              <div className="db-section-title">All Locations</div>
              <div className="wm-location-list">
                {locations.map(loc => (
                  <div
                    key={loc._id}
                    className={`wm-location-card ${loc._id === currentId ? 'wm-location-current' : ''}`}
                    onClick={() => setSelected(loc)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="wm-loc-icon">{loc.icon}</div>
                    <div className="wm-loc-info">
                      <div className="wm-loc-name">
                        {loc.name}
                        {loc._id === currentId && <span className="wm-here-badge">Here</span>}
                      </div>
                      <div className="wm-loc-region">{loc.region?.name}</div>
                      <div className="wm-loc-desc">{loc.description}</div>
                    </div>
                    <div className="wm-loc-right">
                      <span className="wm-danger" style={{ color: DANGER_COLORS[loc.dangerLevel] || '#aaa' }}>
                        {loc.dangerLevel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>
    </>
  );
}
