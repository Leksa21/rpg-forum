import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { get } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import BgScene from '../components/layout/BgScene';
import Topbar from '../components/layout/Topbar';
import { isInjured, countActiveWounds } from '../lib/progression';

function calcDaysActive(createdAt) {
  if (!createdAt) return 0;
  return Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)));
}

export default function PublicCharacterProfile() {
  const { id } = useParams();
  const { token } = useAuth();

  const [char, setChar]           = useState(null);
  const [postCount, setPostCount] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    get(`/api/characters/${id}`, token)
      .then(res => {
        setChar(res.data);
        return get(`/api/posts?character=${id}`, token);
      })
      .then(res => {
        const posts = res.data ?? [];
        setPostCount(Array.isArray(posts) ? posts.length : (res.meta?.total ?? 0));
      })
      .catch(() => setError('Character not found.'))
      .finally(() => setLoading(false));
  }, [id, token]);

  if (loading) {
    return (
      <>
        <BgScene />
        <div className="dashboard">
          <Topbar />
          <main className="dash-main pub-main">
            <div className="pub-loading">Loading…</div>
          </main>
        </div>
      </>
    );
  }

  if (error || !char) {
    return (
      <>
        <BgScene />
        <div className="dashboard">
          <Topbar />
          <main className="dash-main pub-main">
            <div className="pub-error">
              <div className="pub-error-icon">💀</div>
              <p>{error || 'Character not found.'}</p>
              <Link to="/forum" className="btn-primary">Back to Forum</Link>
            </div>
          </main>
        </div>
      </>
    );
  }

  const daysActive = calcDaysActive(char.createdAt);
  const location   = char.currentLocation;

  return (
    <>
      <BgScene />
      <div className="dashboard">
        <Topbar />

        <main className="dash-main pub-main">
          <div className="pub-card">

            {/* ── Art column ── */}
            <div className="pub-art-col">
              {char.fullBodyAvatar ? (
                <div className="pub-fullbody-wrap">
                  <img
                    src={char.fullBodyAvatar}
                    alt={char.name}
                    className="pub-fullbody-img"
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              ) : (
                <div className="pub-avatar-fallback">{char.avatar || '⚔️'}</div>
              )}

              {/* Status badges */}
              <div className="pub-badges">
                {char.isDead
                  ? <span className="pub-badge pub-badge-dead">☠ Fallen</span>
                  : isInjured(char)
                    ? <span className="pub-badge pub-badge-injured">⛑ Recovering</span>
                    : <span className="pub-badge pub-badge-alive">◈ Adventuring</span>
                }
                {!char.isDead && countActiveWounds(char.wounds) > 0 && (
                  <span className="pub-badge pub-badge-wounded" title="Wounds heal 24h after they were inflicted">
                    🩸 {countActiveWounds(char.wounds)} {countActiveWounds(char.wounds) === 1 ? 'wound' : 'wounds'}
                  </span>
                )}
              </div>
            </div>

            {/* ── Info column ── */}
            <div className="pub-info-col">

              <div className="pub-name-row">
                <h1 className="pub-name">{char.name}</h1>
                <span className="pub-level-badge">Lvl {char.level}</span>
              </div>

              <p className="pub-class-line">
                {[char.race, char.class].filter(Boolean).join(' · ')}
              </p>

              {char.tagline && (
                <p className="pub-tagline">"{char.tagline}"</p>
              )}

              <div className="pub-divider" />

              <div className="pub-details">
                <div className="pub-detail-row">
                  <span className="pub-detail-icon">📍</span>
                  <span className="pub-detail-text">
                    {location ? location.name : 'The Starting Village'}
                  </span>
                </div>
                <div className="pub-detail-row">
                  <span className="pub-detail-icon">📜</span>
                  <span className="pub-detail-text">
                    {postCount === null ? '—' : postCount} posts written
                  </span>
                </div>
                <div className="pub-detail-row">
                  <span className="pub-detail-icon">🕯</span>
                  <span className="pub-detail-text">{daysActive} days adventuring</span>
                </div>
              </div>

              <div className="pub-divider" />

              {char.backstory ? (
                <div className="pub-backstory-section">
                  <div className="pub-section-label">Backstory</div>
                  <p className="pub-backstory-text">{char.backstory}</p>
                </div>
              ) : (
                <p className="pub-no-backstory">This adventurer keeps their past a mystery.</p>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
