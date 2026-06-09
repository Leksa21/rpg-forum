import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { get } from '../lib/api';

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
  const { token } = useAuth();
  const [chars, setChars]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'online'

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
          const status = statusOf(char.lastActiveAt);
          return (
            <Link key={char._id} to={`/character/${char._id}`} className="aa-row">
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
          );
        })}
      </div>
    </div>
  );
}
