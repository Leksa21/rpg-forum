import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { get, put } from '../lib/api';
import BgScene from '../components/layout/BgScene';
import Topbar from '../components/layout/Topbar';

const STAT_LABELS = {
  strength:     { label: 'STR', icon: '⚔️' },
  dexterity:    { label: 'DEX', icon: '🏹' },
  intelligence: { label: 'INT', icon: '🔮' },
  endurance:    { label: 'END', icon: '🛡️' },
  charisma:     { label: 'CHA', icon: '🎵' },
  wisdom:       { label: 'WIS', icon: '🌿' },
};

const STAT_MAX = 100;

function calcNextLevelXP(level) {
  return (level ?? 1) * 1000;
}

function calcDaysActive(createdAt) {
  if (!createdAt) return 0;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / msPerDay));
}

export default function CharacterProfile() {
  const { character, token } = useAuth();

  const [backstory, setBackstory]           = useState(character?.backstory ?? '');
  const [backstorySaving, setBackstorySaving] = useState(false);
  const [backstoryError, setBackstoryError]   = useState('');
  const [backstorySaved, setBackstorySaved]   = useState(false);

  const [locationName, setLocationName] = useState('The Starting Village');
  const [postCount, setPostCount]       = useState(null);
  const [questCount, setQuestCount]     = useState(null);

  // Sync backstory when character loads
  useEffect(() => {
    setBackstory(character?.backstory ?? '');
  }, [character?.backstory]);

  // Fetch location name
  useEffect(() => {
    if (!token || !character?.currentLocation) return;

    const controller = new AbortController();

    get('/api/world/locations', token)
      .then((res) => {
        const locations = res.data ?? [];
        const match = locations.find(
          (loc) => String(loc._id) === String(character.currentLocation),
        );
        if (match) setLocationName(match.name);
      })
      .catch(() => {
        // keep default "The Starting Village"
      });

    return () => controller.abort();
  }, [token, character?.currentLocation]);

  // Fetch post count
  useEffect(() => {
    if (!token || !character?._id) return;

    get(`/api/posts?character=${character._id}`, token)
      .then((res) => {
        const posts = res.data ?? [];
        setPostCount(Array.isArray(posts) ? posts.length : (res.meta?.total ?? 0));
      })
      .catch(() => setPostCount(0));
  }, [token, character?._id]);

  // Fetch quest count
  useEffect(() => {
    if (!token) return;

    get('/api/quests/mine', token)
      .then((res) => {
        const quests = res.data ?? [];
        const completed = Array.isArray(quests)
          ? quests.filter((q) => q.status === 'completed').length
          : 0;
        setQuestCount(completed);
      })
      .catch(() => setQuestCount(0));
  }, [token]);

  const handleSaveBackstory = async () => {
    setBackstoryError('');
    setBackstorySaved(false);
    setBackstorySaving(true);

    try {
      await put('/api/characters/backstory', { backstory }, token);
      setBackstorySaved(true);
      setTimeout(() => setBackstorySaved(false), 3000);
    } catch (err) {
      setBackstoryError(err.message ?? 'Failed to save backstory.');
    } finally {
      setBackstorySaving(false);
    }
  };

  const level     = character?.level ?? 1;
  const xp        = character?.experience ?? 0;
  const nextLevel = calcNextLevelXP(level);
  const xpPercent = Math.min(100, Math.round((xp / nextLevel) * 100));
  const stats     = character?.stats ?? {};
  const daysActive = calcDaysActive(character?.createdAt);

  return (
    <>
      <BgScene />
      <div className="dashboard">
        <Topbar />

        <main className="dash-main cp-main">

          {/* ── Hero Banner ── */}
          <div className="cp-hero-banner">
            <div className="cp-hero-avatar">
              {character?.avatar ?? '⚔️'}
            </div>

            <div className="cp-hero-info">
              <h1 className="cp-hero-name">{character?.name ?? 'Unknown Hero'}</h1>
              <p className="cp-hero-meta">
                {character?.race} {character?.class}
              </p>

              <div className="cp-hero-tags">
                <span className="char-tag">Level {level}</span>
                {character?.isDead && (
                  <span className="char-tag cp-tag-dead">☠ Fallen</span>
                )}
              </div>

              {/* XP Progress Bar */}
              <div className="cp-xp-wrap">
                <div className="cp-xp-labels">
                  <span className="cp-xp-current">{xp.toLocaleString()} XP</span>
                  <span className="cp-xp-next">{nextLevel.toLocaleString()} to level {level + 1}</span>
                </div>
                <div className="cp-xp-track" role="progressbar" aria-valuenow={xpPercent} aria-valuemin={0} aria-valuemax={100}>
                  <div className="cp-xp-fill" style={{ width: `${xpPercent}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Quick Stats Row ── */}
          <div className="cp-quick-row">
            <div className="cp-quick-card">
              <div className="cp-quick-icon">📜</div>
              <div className="cp-quick-value">
                {postCount === null ? '—' : postCount}
              </div>
              <div className="cp-quick-label">Posts Written</div>
            </div>

            <div className="cp-quick-card">
              <div className="cp-quick-icon">⚔️</div>
              <div className="cp-quick-value">
                {questCount === null ? '—' : questCount}
              </div>
              <div className="cp-quick-label">Quests Completed</div>
            </div>

            <div className="cp-quick-card">
              <div className="cp-quick-icon">🕯️</div>
              <div className="cp-quick-value">{daysActive}</div>
              <div className="cp-quick-label">Days Active</div>
            </div>
          </div>

          {/* ── Stats Grid ── */}
          <div className="db-section-title">Character Stats</div>
          <div className="cp-stats-grid">
            {Object.entries(STAT_LABELS).map(([key, { label, icon }]) => {
              const value = stats[key] ?? 10;
              const barWidth = Math.min(100, Math.round((value / STAT_MAX) * 100));

              return (
                <div key={key} className="cp-stat-card">
                  <div className="cp-stat-icon">{icon}</div>
                  <div className="cp-stat-body">
                    <div className="cp-stat-top">
                      <span className="cp-stat-label">{label}</span>
                      <span className="cp-stat-value">{value}</span>
                    </div>
                    <div className="cp-stat-track">
                      <div className="cp-stat-fill" style={{ width: `${barWidth}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Two-column: Location + Backstory ── */}
          <div className="cp-lower-grid">

            {/* Current Location */}
            <div className="db-panel cp-location-panel">
              <div className="db-panel-head">
                <span>📍</span> Current Location
              </div>
              <div className="db-panel-content cp-location-body">
                <div className="cp-location-name">{locationName}</div>
                <p className="cp-location-hint">
                  Your character currently resides here. Travel via the World Map.
                </p>
              </div>
            </div>

            {/* Backstory */}
            <div className="db-panel cp-backstory-panel">
              <div className="db-panel-head">
                <span>📖</span> Backstory
              </div>
              <div className="db-panel-content">
                <textarea
                  className="cp-backstory-textarea"
                  value={backstory}
                  onChange={(e) => setBackstory(e.target.value)}
                  placeholder="Write your character's origin story…"
                  rows={6}
                  maxLength={2000}
                />

                {backstoryError && (
                  <p className="cp-backstory-msg cp-backstory-error">{backstoryError}</p>
                )}
                {backstorySaved && (
                  <p className="cp-backstory-msg cp-backstory-ok">Backstory saved.</p>
                )}

                <div className="cp-backstory-footer">
                  <span className="cp-backstory-count">
                    {backstory.length} / 2000
                  </span>
                  <button
                    className="btn-primary cp-save-btn"
                    onClick={handleSaveBackstory}
                    disabled={backstorySaving}
                  >
                    {backstorySaving ? 'Saving…' : 'Save Backstory'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </>
  );
}
