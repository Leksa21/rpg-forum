import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTravel } from '../hooks/useTravel';
import BgScene from '../components/layout/BgScene';
import Topbar from '../components/layout/Topbar';

const DANGER_CONFIG = {
  safe:   { label: 'Safe',   color: '#4a9a4a' },
  low:    { label: 'Low',    color: '#7aaa44' },
  medium: { label: 'Medium', color: '#d4ac0d' },
  high:   { label: 'High',   color: '#e07020' },
  deadly: { label: 'Deadly', color: '#c0392b' },
};

function toId(v) {
  if (!v) return null;
  if (typeof v === 'object' && v._id) return v._id.toString();
  return v.toString();
}

export default function WorldAreas() {
  const navigate = useNavigate();
  const { token, character, refreshCharacter } = useAuth();
  const { travel } = useTravel(token, refreshCharacter);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    get('/api/world/locations')
      .then(r => setLocations(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <BgScene />
      <div className="dashboard">
        <Topbar />
        <main className="dash-main">

          <header className="wa-header">
            <h1 className="forum-title">World Areas</h1>
            <p className="forum-sub">Choose a realm and step into its story</p>
          </header>

          {error && <div className="alert error visible">{error}</div>}

          {loading
            ? <div className="wa-loading">Loading the world…</div>
            : <div className="wa-grid">
                {locations.map(loc => {
                  const danger = DANGER_CONFIG[loc.dangerLevel] ?? DANGER_CONFIG.safe;
                  const locId = loc._id.toString();
                  const currentLocId = toId(character?.currentLocation);
                  const isHere = currentLocId === locId
                    || (currentLocId === null && loc.isStartingLocation);
                  const isTraveling = travel?.status === 'traveling' && toId(travel?.to) === locId;
                  return (
                    <button
                      key={loc._id}
                      className={`wa-card ${isHere ? 'wa-card-here' : ''}`}
                      onClick={() => navigate(`/world/areas/${loc._id}`)}
                    >
                      <div
                        className="wa-card-banner"
                        style={{ background: loc.theme?.gradient || 'linear-gradient(160deg, #0a0a14 0%, #141428 100%)' }}
                      >
                        <span className="wa-card-icon">{loc.icon}</span>
                        <span
                          className="wa-danger-badge"
                          style={{ color: danger.color, borderColor: danger.color }}
                        >
                          {danger.label}
                        </span>
                        {isHere && <span className="wa-here-badge">📍 Here</span>}
                        {isTraveling && <span className="wa-traveling-badge">🚶 Traveling</span>}
                      </div>

                      <div
                        className="wa-card-body"
                        style={{ '--accent': loc.theme?.accentColor || '#c9a84c' }}
                      >
                        <div className="wa-card-region">{loc.region?.name}</div>
                        <div className="wa-card-name">{loc.name}</div>
                        <p className="wa-card-desc">{loc.description}</p>
                        <div className="wa-card-footer">
                          <span className="wa-card-type">{loc.type}</span>
                          {loc.faction && <span className="wa-card-faction">{loc.faction}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
          }

        </main>
      </div>
    </>
  );
}
