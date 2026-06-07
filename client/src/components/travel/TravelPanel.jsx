import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTravel } from '../../hooks/useTravel';

const DANGER_COLORS = { safe: '#4a9a4a', low: '#7aaa44', medium: '#d4ac0d', high: '#e07020', deadly: '#c0392b' };
const DANGER_TIME   = { safe: '30s', low: '1 min', medium: '2 min', high: '5 min', deadly: '10 min' };

function useCountdown(arrivalTime) {
  const calc = () => arrivalTime ? Math.max(0, Math.round((new Date(arrivalTime) - Date.now()) / 1000)) : 0;
  const [secs, setSecs] = useState(calc);

  useEffect(() => {
    if (!arrivalTime) { setSecs(0); return; }
    setSecs(calc());
    const id = setInterval(() => setSecs(calc()), 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrivalTime]);

  if (secs <= 0) return 'Arriving…';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

function toId(v) {
  if (!v) return null;
  if (typeof v === 'object' && v._id) return v._id.toString();
  return v.toString();
}

export default function TravelPanel({ locationId, dangerLevel, isStartingLocation }) {
  const { token, character, refreshCharacter } = useAuth();
  const [error, setError] = useState('');

  const handleArrive = (arrived) => {
    refreshCharacter?.();
    if (toId(arrived?.to) === locationId) setError('');
  };

  const { travel, loading, startTravel, cancelTravel } = useTravel(token, handleArrive);

  const countdown = useCountdown(travel?.status === 'traveling' ? travel.arrivalTime : null);

  if (!character || !token) return null;

  const currentLocId = toId(character.currentLocation) || (isStartingLocation ? null : undefined);
  const isHere = currentLocId === locationId
    || (currentLocId === null && isStartingLocation);

  const isActive = travel?.status === 'traveling';
  const travelToId   = toId(travel?.to);
  const goingHere    = isActive && travelToId === locationId;
  const goingElsewhere = isActive && !goingHere;

  if (isHere) {
    return (
      <div className="tp-bar tp-here">
        <span className="tp-pulse" />
        <span className="tp-here-text">📍 You are here</span>
      </div>
    );
  }

  if (goingHere) {
    return (
      <div className="tp-bar tp-traveling">
        <span className="tp-travel-glyph">🚶</span>
        <span className="tp-traveling-label">
          Arriving in <strong className="tp-countdown">{countdown}</strong>
        </span>
        <button className="tp-cancel-btn" onClick={cancelTravel} disabled={loading}>
          Cancel
        </button>
      </div>
    );
  }

  if (goingElsewhere) {
    return (
      <div className="tp-bar tp-elsewhere">
        <span className="tp-travel-glyph">🚶</span>
        <span>
          Traveling to <strong>{travel.to?.name}</strong>
          <span className="tp-countdown tp-countdown-sm"> · {countdown}</span>
        </span>
      </div>
    );
  }

  const handleTravel = async () => {
    setError('');
    const result = await startTravel(locationId);
    if (!result.success) setError(result.error);
  };

  return (
    <div className="tp-bar tp-available">
      <div className="tp-avail-meta">
        <span className="tp-danger-dot" style={{ background: DANGER_COLORS[dangerLevel] || '#aaa' }} />
        <span className="tp-danger-text" style={{ color: DANGER_COLORS[dangerLevel] || '#aaa' }}>
          {dangerLevel} danger
        </span>
        <span className="tp-sep">·</span>
        <span className="tp-time-label">~{DANGER_TIME[dangerLevel] || '?'} travel</span>
      </div>
      <div className="tp-avail-action">
        {error && <span className="tp-err">{error}</span>}
        <button className="tp-go-btn" onClick={handleTravel} disabled={loading}>
          {loading ? 'Departing…' : 'Travel here →'}
        </button>
      </div>
    </div>
  );
}
