import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BgScene from '../components/layout/BgScene';

const ROLE_LABELS = {
  member:     'Member',
  moderator:  'Moderator',
  admin:      'Admin',
  head_admin: 'Head Admin',
};

const CLASS_COLOR = {
  Warrior:     '#e74c3c',
  Mage:        '#9b59b6',
  Rogue:       '#2ecc71',
  Paladin:     '#f39c12',
  Ranger:      '#27ae60',
  Necromancer: '#8e44ad',
  Druid:       '#16a085',
  Bard:        '#d35400',
};

const CLASS_LORE = {
  Warrior:     'Master of arms and unyielding on the battlefield.',
  Mage:        'Wielder of arcane forces beyond mortal comprehension.',
  Rogue:       'Shadow-walker, dealer of swift and silent death.',
  Paladin:     'Holy champion sworn to an unbreakable divine cause.',
  Ranger:      'Hunter of the wilds, arrow ever true and deadly.',
  Necromancer: 'Bender of death itself, raiser of the fallen.',
  Druid:       'Voice of nature, shapeshifter of the ancient wilds.',
  Bard:        'Spinner of tales and weaver of fate through song.',
};

const STAT_ICONS = { STR: '⚔', DEX: '🏹', INT: '🔮', END: '🛡', CHA: '✨', WIS: '📜' };

export default function CharacterSelect() {
  const { user, createCharacter, logout } = useAuth();
  const navigate = useNavigate();

  const [allChars, setAllChars]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loadingChars, setLoadingChars] = useState(true);

  const [newName, setNewName]     = useState('');
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const role = user?.role || 'member';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('/api/characters/all', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        const chars = data.data || [];
        setAllChars(chars);
        const living = chars.find(c => !c.isDead);
        if (living) setSelected(living);
        else if (chars.length > 0) setSelected(chars[0]);
        setLoadingChars(false);
      })
      .catch(() => setLoadingChars(false));
  }, []);

  const livingChar = allChars.find(c => !c.isDead);
  const canForge   = !livingChar;

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!newName.trim()) { setCreateError('Your hero needs a name.'); return; }
    setCreateLoading(true);
    try {
      await createCharacter(newName.trim());
      navigate('/character-setup');
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="csr-page">
      <BgScene />

      <div className="csr-layout">

        {/* LEFT — Roster */}
        <aside className="csr-roster">
          <div className="csr-user-card">
            <div className="csr-user-avatar">
              {selected?.avatar || user?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="csr-user-info">
              <div className="csr-user-name">{user?.username}</div>
              <span className={`role-badge role-${role}`}>{ROLE_LABELS[role]}</span>
            </div>
          </div>

          <div className="csr-roster-label">Your Heroes</div>

          <div className="csr-char-list">
            {loadingChars ? (
              <div className="csr-loading">Loading roster…</div>
            ) : allChars.length === 0 ? (
              <div className="csr-empty-roster">
                <span>🗡</span>
                <p>No heroes yet</p>
              </div>
            ) : (
              allChars.map(char => (
                <button
                  key={char._id}
                  type="button"
                  className={[
                    'csr-char-row',
                    char.isDead ? 'csr-char-dead' : '',
                    selected?._id === char._id && !isCreating ? 'csr-char-active' : '',
                  ].join(' ')}
                  onClick={() => { setSelected(char); setIsCreating(false); }}
                >
                  <div className="csr-row-avatar" style={
                    !char.isDead && char.class
                      ? { borderColor: CLASS_COLOR[char.class], boxShadow: `0 0 8px ${CLASS_COLOR[char.class]}40` }
                      : {}
                  }>
                    {char.avatar || '⚔'}
                  </div>
                  <div className="csr-row-info">
                    <div className="csr-row-name">{char.name}</div>
                    <div className="csr-row-meta">
                      {char.isSetup ? `${char.class} · Lv. ${char.level}` : 'Awaiting destiny'}
                    </div>
                  </div>
                  {char.isDead && <span className="csr-skull">☠</span>}
                  {!char.isDead && !char.isSetup && (
                    <span className="csr-row-pending">•</span>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="csr-roster-footer">
            {canForge && (
              <button
                type="button"
                className="csr-forge-btn"
                onClick={() => { setIsCreating(true); setSelected(null); }}
              >
                ✦ Forge New Hero
              </button>
            )}
            <button
              type="button"
              className="csr-logout-btn"
              onClick={() => { logout(); navigate('/login'); }}
            >
              ← Leave Realm
            </button>
          </div>
        </aside>

        {/* RIGHT — Detail / Create */}
        <section className="csr-detail">
          {isCreating ? (
            <CreatePanel
              newName={newName}
              setNewName={setNewName}
              error={createError}
              loading={createLoading}
              onSubmit={handleCreate}
              onCancel={() => {
                setIsCreating(false);
                const living = allChars.find(c => !c.isDead);
                if (living) setSelected(living);
                else if (allChars.length > 0) setSelected(allChars[0]);
              }}
            />
          ) : selected ? (
            <CharacterDetail char={selected} navigate={navigate} />
          ) : (
            <EmptyDetail onForge={canForge ? () => setIsCreating(true) : null} />
          )}
        </section>

      </div>
    </div>
  );
}

function CharacterDetail({ char, navigate }) {
  const accent = char.class ? (CLASS_COLOR[char.class] || 'var(--gold)') : 'var(--gold)';
  const lore   = char.class ? (CLASS_LORE[char.class] || '') : '';

  return (
    <div className="csr-detail-inner">

      {/* Art area */}
      <div
        className="csr-art-panel"
        style={{
          background: `radial-gradient(ellipse 70% 80% at 50% 40%, ${accent}22 0%, transparent 70%), var(--bg-dark)`,
        }}
      >
        {char.isDead && (
          <div className="csr-fallen-banner">☠ Fallen Hero</div>
        )}
        <div
          className="csr-art-avatar"
          style={
            char.isDead
              ? { filter: 'grayscale(1) opacity(0.5)' }
              : { textShadow: `0 0 40px ${accent}88, 0 0 80px ${accent}44` }
          }
        >
          {char.avatar || '⚔'}
        </div>
        {char.class && (
          <div className="csr-art-class-badge" style={{ color: accent, borderColor: `${accent}66` }}>
            {char.class}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="csr-info-body">
        <h2 className="csr-char-name">{char.name}</h2>

        {char.isSetup ? (
          <>
            <div className="csr-char-identity">
              <span className="csr-tag" style={{ color: accent, borderColor: `${accent}55` }}>
                {char.race}
              </span>
              <span className="csr-tag" style={{ color: accent, borderColor: `${accent}55` }}>
                {char.class}
              </span>
              <span className="csr-tag">Level {char.level}</span>
            </div>

            {lore && <p className="csr-class-lore">{lore}</p>}

            <div className="csr-xp-section">
              <div className="csr-xp-labels">
                <span style={{ color: accent }}>
                  {(char.experience || 0).toLocaleString()} XP
                </span>
                <span>{(char.level * 1000).toLocaleString()} to next level</span>
              </div>
              <div className="csr-xp-track">
                <div
                  className="csr-xp-fill"
                  style={{
                    width: `${Math.min(100, ((char.experience || 0) / (char.level * 1000)) * 100)}%`,
                    background: `linear-gradient(90deg, ${accent}88, ${accent})`,
                  }}
                />
              </div>
            </div>

            {char.stats && (
              <div className="csr-stats-grid">
                {Object.entries(char.stats).map(([key, val]) => (
                  <div key={key} className="csr-stat-cell">
                    <div className="csr-stat-icon">{STAT_ICONS[key] || '•'}</div>
                    <div className="csr-stat-value" style={val >= 15 ? { color: accent } : {}}>{val}</div>
                    <div className="csr-stat-key">{key}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="csr-not-setup">This hero's fate is unwritten. Complete their setup to enter the realm.</p>
        )}

        {!char.isDead && (
          <button
            type="button"
            className="csr-action-btn"
            style={{
              background: char.isSetup
                ? `linear-gradient(135deg, ${accent}99, ${accent})`
                : 'linear-gradient(135deg, #7a5c1a, #c9a84c)',
              borderColor: char.isSetup ? accent : 'var(--border-gold)',
            }}
            onClick={() => navigate(char.isSetup ? '/dashboard' : '/character-setup')}
          >
            {char.isSetup ? '⚔ Enter the Realm' : '✦ Continue Setup'}
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyDetail({ onForge }) {
  return (
    <div className="csr-detail-empty">
      <div className="csr-empty-glyph">🏰</div>
      <h3>Your Roster Awaits</h3>
      <p>Select a hero from the left to view their story</p>
      {onForge && (
        <button type="button" className="csr-action-btn" onClick={onForge}
          style={{ background: 'linear-gradient(135deg, #7a5c1a, #c9a84c)', borderColor: 'var(--border-gold)' }}>
          ✦ Forge Your First Hero
        </button>
      )}
    </div>
  );
}

function CreatePanel({ newName, setNewName, error, loading, onSubmit, onCancel }) {
  return (
    <div className="csr-create-panel">
      <div className="csr-create-header">
        <div className="csr-create-glyph">🗡</div>
        <h2>Forge a New Hero</h2>
        <p>Give your hero a name. Class and race are chosen in the next step.</p>
      </div>

      {error && <div className="auth-alert auth-alert-error">{error}</div>}

      <form onSubmit={onSubmit} noValidate>
        <div className="auth-field">
          <label htmlFor="hero-name">Hero Name</label>
          <input
            type="text"
            id="hero-name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="What shall they call you?"
            maxLength={50}
            autoFocus
          />
        </div>
        <button
          type="submit"
          className="csr-action-btn"
          disabled={loading}
          style={{ background: 'linear-gradient(135deg, #7a5c1a, #c9a84c)', borderColor: 'var(--border-gold)' }}
        >
          {loading ? 'Forging…' : '✦ Begin the Journey'}
        </button>
      </form>

      <button type="button" className="csr-cancel-btn" onClick={onCancel}>
        ← Back to Roster
      </button>
    </div>
  );
}
