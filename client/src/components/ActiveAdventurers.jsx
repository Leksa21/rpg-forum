import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { get, post } from '../lib/api';

const ONLINE_MS  = 5  * 60 * 1000;   // green  — active within 5 min
const RECENT_MS  = 60 * 60 * 1000;   // yellow — active within 1 hour
const POLL_MS    = 60 * 1000;         // refresh every 60 s

function statusOf(lastActiveAt) {
  if (!lastActiveAt) return 'inactive';
  const age = Date.now() - new Date(lastActiveAt).getTime();
  if (age < ONLINE_MS) return 'online';
  if (age < RECENT_MS) return 'recent';
  return 'away';
}

function timeAgo(iso) {
  if (!iso) return '';
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60)   return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400)return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function ActiveAdventurers() {
  const { token, character } = useAuth();
  const navigate = useNavigate();
  const [chars,       setChars]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState('all');
  const [challenging, setChallenging] = useState(null);

  const fetchActive = useCallback(() => {
    get('/api/characters/active', token)
      .then(res => setChars(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchActive();
    const id = setInterval(fetchActive, POLL_MS);
    return () => clearInterval(id);
  }, [fetchActive]);

  async function handleChallenge(targetCharId) {
    if (challenging) return;
    setChallenging(targetCharId);
    try {
      const res = await post('/api/battles/challenge', { targetCharacterId: targetCharId }, token);
      navigate(`/combat/${res.data._id}`);
    } catch (err) {
      alert(err.message || 'Could not send challenge');
    } finally {
      setChallenging(null);
    }
  }

  const onlineCount = chars.filter(c => statusOf(c.lastActiveAt) === 'online').length;
  const displayed   = filter === 'online'
    ? chars.filter(c => statusOf(c.lastActiveAt) === 'online')
    : chars;

  return (
    <div className="db-panel aa-panel">
      <div className="db-panel-head">
        <span>⚔</span>
        Active Adventurers
        <div className="aa-counts">
          <span className="aa-dot aa-dot-online" />
          <span className="aa-count-text">{onlineCount} online</span>
          <span className="aa-sep">·</span>
          <span className="aa-count-text">{chars.length} in 72h</span>
        </div>
      </div>

      <div className="aa-filters">
        <button
          className={`aa-filter-btn${filter === 'all' ? ' active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({chars.length})
        </button>
        <button
          className={`aa-filter-btn${filter === 'online' ? ' active' : ''}`}
          onClick={() => setFilter('online')}
        >
          Online now ({onlineCount})
        </button>
      </div>

      <div className="aa-list">
        {loading && (
          <div className="aa-empty">Loading…</div>
        )}
        {!loading && displayed.length === 0 && (
          <div className="aa-empty">
            {filter === 'online' ? 'No adventurers online right now.' : 'No activity in the last 72 hours.'}
          </div>
        )}
        {!loading && displayed.map(char => {
          const status  = statusOf(char.lastActiveAt);
          const isSelf  = character && String(char._id) === String(character._id);
          return (
            <div key={char._id} className="aa-row" style={{ flexDirection: 'column', gap: '0.4rem', padding: '0.6rem 0.8rem' }}>
              <Link to={`/character/${char._id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none', color: 'inherit', flex: 1 }}>
                <div className="aa-avatar">{char.avatar || '⚔️'}</div>
                <div className="aa-info">
                  <div className="aa-name-row">
                    <span className="aa-name">{char.name}</span>
                    <span className={`aa-status-dot aa-status-${status}`} title={status} />
                  </div>
                  <div className="aa-meta">
                    {[char.race, char.class].filter(Boolean).join(' ')}
                    {char.level ? ` · Lv.${char.level}` : ''}
                  </div>
                </div>
                <div className="aa-time">{timeAgo(char.lastActiveAt)}</div>
              </Link>
              {!isSelf && (
                <button
                  onClick={() => handleChallenge(char._id)}
                  disabled={!!challenging}
                  style={{
                    fontSize: '0.72rem', padding: '0.25rem 0.6rem',
                    background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.3)',
                    color: 'var(--gold)', borderRadius: '6px', cursor: 'pointer',
                    opacity: challenging === char._id ? 0.5 : 1,
                    alignSelf: 'flex-end',
                  }}
                >
                  {challenging === char._id ? 'Sending…' : '⚔ Challenge'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
