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

const AVATAR_PRESETS = ['⚔️','🧙','🏹','🛡️','💀','🐉','🌿','🎵','🗡️','🔮','⚗️','🌙','🔥','❄️','🌊','⚡'];

function calcNextLevelXP(level) { return (level ?? 1) * 1000; }
function calcDaysActive(createdAt) {
  if (!createdAt) return 0;
  return Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)));
}

export default function CharacterProfile() {
  const { character, token, refreshCharacter } = useAuth();

  // ── Backstory state ──
  const [backstory, setBackstory]             = useState(character?.backstory ?? '');
  const [backstorySaving, setBackstorySaving] = useState(false);
  const [backstoryError, setBackstoryError]   = useState('');
  const [backstorySaved, setBackstorySaved]   = useState(false);

  // ── Appearance state ──
  const [avatar, setAvatar]               = useState(character?.avatar ?? '');
  const [tagline, setTagline]             = useState(character?.tagline ?? '');
  const [fullBodyAvatar, setFullBodyAvatar] = useState(character?.fullBodyAvatar ?? '');
  const [fullBodyPreview, setFullBodyPreview] = useState(character?.fullBodyAvatar ?? '');
  const [appearanceSaving, setAppearanceSaving] = useState(false);
  const [appearanceError, setAppearanceError]   = useState('');
  const [appearanceSaved, setAppearanceSaved]   = useState(false);

  // ── Supporting data ──
  const [locationName, setLocationName] = useState('The Starting Village');
  const [postCount, setPostCount]       = useState(null);
  const [questCount, setQuestCount]     = useState(null);

  // Sync state when character loads/changes
  useEffect(() => {
    setBackstory(character?.backstory ?? '');
    setAvatar(character?.avatar ?? '');
    setTagline(character?.tagline ?? '');
    setFullBodyAvatar(character?.fullBodyAvatar ?? '');
    setFullBodyPreview(character?.fullBodyAvatar ?? '');
  }, [character]);

  useEffect(() => {
    if (!token || !character?.currentLocation) return;
    get('/api/world/locations', token)
      .then(res => {
        const match = (res.data ?? []).find(l => String(l._id) === String(character.currentLocation));
        if (match) setLocationName(match.name);
      })
      .catch(() => {});
  }, [token, character?.currentLocation]);

  useEffect(() => {
    if (!token || !character?._id) return;
    get(`/api/posts?character=${character._id}`, token)
      .then(res => {
        const posts = res.data ?? [];
        setPostCount(Array.isArray(posts) ? posts.length : (res.meta?.total ?? 0));
      })
      .catch(() => setPostCount(0));
  }, [token, character?._id]);

  useEffect(() => {
    if (!token) return;
    get('/api/quests/mine', token)
      .then(res => {
        const completed = (res.data ?? []).filter(q => q.status === 'completed').length;
        setQuestCount(completed);
      })
      .catch(() => setQuestCount(0));
  }, [token]);

  const handleSaveBackstory = async () => {
    setBackstoryError(''); setBackstorySaved(false); setBackstorySaving(true);
    try {
      await put('/api/characters/backstory', { backstory }, token);
      setBackstorySaved(true);
      setTimeout(() => setBackstorySaved(false), 3000);
    } catch (err) {
      setBackstoryError(err.message ?? 'Failed to save.');
    } finally {
      setBackstorySaving(false);
    }
  };

  const handleSaveAppearance = async () => {
    setAppearanceError(''); setAppearanceSaved(false); setAppearanceSaving(true);
    try {
      await put('/api/characters/profile', { avatar, tagline, fullBodyAvatar }, token);
      await refreshCharacter();
      setAppearanceSaved(true);
      setTimeout(() => setAppearanceSaved(false), 3000);
    } catch (err) {
      setAppearanceError(err.message ?? 'Failed to save.');
    } finally {
      setAppearanceSaving(false);
    }
  };

  const level      = character?.level ?? 1;
  const xp         = character?.experience ?? 0;
  const nextLevel  = calcNextLevelXP(level);
  const xpPercent  = Math.min(100, Math.round((xp / nextLevel) * 100));
  const stats      = character?.stats ?? {};
  const daysActive = calcDaysActive(character?.createdAt);

  return (
    <>
      <BgScene />
      <div className="dashboard">
        <Topbar />

        <main className="dash-main cp-main">

          {/* ── Hero Banner ── */}
          <div className="cp-hero-banner">
            <div className="cp-hero-avatar">{character?.avatar || '⚔️'}</div>
            <div className="cp-hero-info">
              <h1 className="cp-hero-name">{character?.name ?? 'Unknown Hero'}</h1>
              <p className="cp-hero-meta">{character?.race} {character?.class}</p>
              {character?.tagline && (
                <p className="cp-hero-tagline">"{character.tagline}"</p>
              )}
              <div className="cp-hero-tags">
                <span className="char-tag">Level {level}</span>
                {character?.isDead && <span className="char-tag cp-tag-dead">☠ Fallen</span>}
              </div>
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
              <div className="cp-quick-value">{postCount === null ? '—' : postCount}</div>
              <div className="cp-quick-label">Posts Written</div>
            </div>
            <div className="cp-quick-card">
              <div className="cp-quick-icon">⚔️</div>
              <div className="cp-quick-value">{questCount === null ? '—' : questCount}</div>
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
              const value    = stats[key] ?? 10;
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

          {/* ── Appearance Editor ── */}
          <div className="db-section-title">Appearance & Identity</div>
          <div className="db-panel cp-appearance-panel">
            <div className="db-panel-head"><span>🎨</span> Public Profile</div>
            <div className="db-panel-content">
              <div className="cp-appear-grid">

                {/* Avatar column */}
                <div className="cp-appear-col">
                  <label className="cp-field-label">Avatar Emoji</label>
                  <div className="cp-avatar-preview">{avatar || '⚔️'}</div>
                  <input
                    type="text"
                    className="cp-text-input"
                    value={avatar}
                    onChange={e => setAvatar(e.target.value)}
                    placeholder="Paste or type an emoji"
                    maxLength={10}
                  />
                  <div className="cp-emoji-presets">
                    {AVATAR_PRESETS.map(e => (
                      <button
                        key={e}
                        className={`cp-emoji-btn${avatar === e ? ' active' : ''}`}
                        onClick={() => setAvatar(e)}
                        type="button"
                        title={e}
                      >
                        {e}
                      </button>
                    ))}
                  </div>

                  <label className="cp-field-label" style={{ marginTop: '1.25rem' }}>Public Tagline</label>
                  <input
                    type="text"
                    className="cp-text-input"
                    value={tagline}
                    onChange={e => setTagline(e.target.value)}
                    placeholder="A short motto others will see…"
                    maxLength={150}
                  />
                  <div className="cp-char-count">{tagline.length} / 150</div>
                </div>

                {/* Full body column */}
                <div className="cp-appear-col">
                  <label className="cp-field-label">Full Body Art <span className="cp-field-hint">(image URL)</span></label>
                  <input
                    type="url"
                    className="cp-text-input"
                    value={fullBodyAvatar}
                    onChange={e => {
                      setFullBodyAvatar(e.target.value);
                      setFullBodyPreview(e.target.value);
                    }}
                    placeholder="https://…"
                    maxLength={500}
                  />
                  <p className="cp-field-hint-text">Paste a direct image link. This art will appear on your public profile.</p>

                  {fullBodyPreview && (
                    <div className="cp-fullbody-preview-wrap">
                      <img
                        src={fullBodyPreview}
                        alt="Full body preview"
                        className="cp-fullbody-preview"
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                        onLoad={e => { e.currentTarget.style.display = 'block'; }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {appearanceError && <p className="cp-backstory-msg cp-backstory-error">{appearanceError}</p>}
              {appearanceSaved && <p className="cp-backstory-msg cp-backstory-ok">Appearance saved.</p>}

              <div className="cp-backstory-footer" style={{ marginTop: '1rem' }}>
                <span />
                <button
                  className="btn-primary cp-save-btn"
                  onClick={handleSaveAppearance}
                  disabled={appearanceSaving}
                >
                  {appearanceSaving ? 'Saving…' : 'Save Appearance'}
                </button>
              </div>
            </div>
          </div>

          {/* ── Location + Backstory ── */}
          <div className="cp-lower-grid">
            <div className="db-panel cp-location-panel">
              <div className="db-panel-head"><span>📍</span> Current Location</div>
              <div className="db-panel-content cp-location-body">
                <div className="cp-location-name">{locationName}</div>
                <p className="cp-location-hint">Your character currently resides here. Travel via the World Map.</p>
              </div>
            </div>

            <div className="db-panel cp-backstory-panel">
              <div className="db-panel-head"><span>📖</span> Backstory</div>
              <div className="db-panel-content">
                <textarea
                  className="cp-backstory-textarea"
                  value={backstory}
                  onChange={e => setBackstory(e.target.value)}
                  placeholder="Write your character's origin story…"
                  rows={6}
                  maxLength={2000}
                />
                {backstoryError && <p className="cp-backstory-msg cp-backstory-error">{backstoryError}</p>}
                {backstorySaved && <p className="cp-backstory-msg cp-backstory-ok">Backstory saved.</p>}
                <div className="cp-backstory-footer">
                  <span className="cp-backstory-count">{backstory.length} / 2000</span>
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
