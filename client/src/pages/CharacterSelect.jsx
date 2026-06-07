import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BgScene from '../components/layout/BgScene';

const ROLE_LABELS = {
  member:     'Member',
  moderator:  'Moderator',
  admin:      'Admin',
  head_admin: 'Head Admin',
};

export default function CharacterSelect() {
  const { user, character, createCharacter, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName]     = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const role = user?.role || 'member';
  const isPrivileged = role === 'admin' || role === 'head_admin' || role === 'moderator';

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Your hero needs a name.'); return; }

    setLoading(true);
    try {
      await createCharacter(name.trim());
      navigate('/character-setup');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <BgScene />
      <div className="page-center" style={{ padding: '2rem 1rem' }}>
        <div className="cs-wrapper">

          {/* Header */}
          <div className="cs-header">
            <div className="crest-icon" style={{ margin: '0 auto 1rem' }}>🏰</div>
            <h1 className="cs-title">Choose Your Fate</h1>
            <p className="cs-sub">
              Welcome back, <strong style={{ color: 'var(--text)' }}>{user?.username}</strong>
            </p>
            <span className={`role-badge role-${role}`}>{ROLE_LABELS[role]}</span>
            <button
              type="button"
              className="setup-logout"
              onClick={() => { logout(); navigate('/login'); }}
            >
              ← Log out
            </button>
          </div>

          {/* Character state */}
          {character ? (
            <CharacterCard character={character} navigate={navigate} />
          ) : (
            <CreateForm
              name={name}
              setName={setName}
              error={error}
              loading={loading}
              onSubmit={handleCreate}
            />
          )}

          {/* Admin/Mod panel link */}
          {isPrivileged && (
            <div className="cs-admin-panel">
              <div className="cs-admin-label">
                <span>⚙</span> {ROLE_LABELS[role]} Panel
              </div>
              <p className="cs-admin-desc">
                Manage characters, NPCs, and world events.
              </p>
              <button className="btn-secondary" disabled>
                Open Panel — Coming Soon
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function CharacterCard({ character, navigate }) {
  const canCreate = character.isDead;

  return (
    <div className="cs-char-card">
      {character.isDead && (
        <div className="cs-dead-banner">☠ This hero has fallen</div>
      )}

      <div className="cs-char-avatar">
        {character.avatar || '⚔️'}
      </div>

      <div className="cs-char-name">{character.name}</div>

      <div className="cs-char-meta">
        {character.isSetup
          ? `${character.race} ${character.class} · Level ${character.level}`
          : 'Awaiting destiny...'}
      </div>

      {character.isSetup && !character.isDead && (
        <div className="cs-char-tags">
          <span className="char-tag">{character.class}</span>
          <span className="char-tag">{character.race}</span>
          <span className="char-tag">Lv. {character.level}</span>
        </div>
      )}

      <div className="cs-char-actions">
        {!character.isSetup && !character.isDead && (
          <button className="btn-primary" onClick={() => navigate('/character-setup')}>
            Continue Setup
          </button>
        )}
        {character.isSetup && !character.isDead && (
          <button className="btn-primary" onClick={() => navigate('/dashboard')}>
            Enter the Realm
          </button>
        )}
        {canCreate && (
          <button
            className="btn-primary"
            style={{ marginTop: '0.75rem' }}
            onClick={() => navigate('/character-select', { replace: true })}
          >
            Forge New Hero
          </button>
        )}
      </div>

      {!canCreate && (
        <p className="cs-locked-note">
          🔒 A new hero can only be forged after this one falls.
        </p>
      )}
    </div>
  );
}

function CreateForm({ name, setName, error, loading, onSubmit }) {
  return (
    <div className="cs-create">
      <div className="cs-empty-icon">🗡</div>
      <h2 className="cs-empty-title">Your story hasn't begun yet</h2>
      <p className="cs-empty-desc">
        Give your hero a name to begin the journey. Class and race follow next.
      </p>

      {error && <div className="alert error visible">{error}</div>}

      <form onSubmit={onSubmit} className="cs-name-form" noValidate>
        <div className="form-group">
          <label htmlFor="char-name">Hero Name</label>
          <input
            type="text"
            id="char-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What shall they call you?"
            maxLength={50}
            autoFocus
          />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Forging...' : 'Forge Your Hero'}
        </button>
      </form>
    </div>
  );
}
