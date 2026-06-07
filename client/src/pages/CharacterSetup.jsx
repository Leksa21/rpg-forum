import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BgScene from '../components/layout/BgScene';

const CLASSES = [
  { id: 'Warrior',     icon: '⚔️',  desc: 'Master of arms and steel' },
  { id: 'Mage',        icon: '🔮',  desc: 'Wielder of arcane forces' },
  { id: 'Rogue',       icon: '🗡️',  desc: 'Shadow and deception' },
  { id: 'Paladin',     icon: '🛡️',  desc: 'Holy warrior of light' },
  { id: 'Ranger',      icon: '🏹',  desc: 'Hunter of the wilds' },
  { id: 'Necromancer', icon: '💀',  desc: 'Master of death' },
  { id: 'Druid',       icon: '🌿',  desc: 'Guardian of nature' },
  { id: 'Bard',        icon: '🎵',  desc: 'Master of lore and song' },
];

const RACES = [
  { id: 'Human',      icon: '👤',  desc: 'Versatile and ambitious' },
  { id: 'Elf',        icon: '🌟',  desc: 'Ancient and graceful' },
  { id: 'Dwarf',      icon: '⛏️',  desc: 'Strong and resilient' },
  { id: 'Orc',        icon: '💪',  desc: 'Fierce and powerful' },
  { id: 'Halfling',   icon: '🍀',  desc: 'Lucky and nimble' },
  { id: 'Tiefling',   icon: '👹',  desc: 'Touched by darkness' },
  { id: 'Dragonborn', icon: '🐉',  desc: 'Proud and draconic' },
  { id: 'Gnome',      icon: '⚙️',  desc: 'Inventive and curious' },
];

const AVATARS = [
  '⚔️','🔮','🗡️','🛡️','🏹','💀','🌿','🎵',
  '🐉','👹','🌟','⛏️','🍀','💪','🧙','🧝',
];

export default function CharacterSetup() {
  const { character, setupCharacter, logout } = useAuth();
  const navigate = useNavigate();

  const [selectedClass,  setClass]  = useState('');
  const [selectedRace,   setRace]   = useState('');
  const [selectedAvatar, setAvatar] = useState(AVATARS[0]);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = selectedClass && selectedRace;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      await setupCharacter(selectedClass, selectedRace, selectedAvatar);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <BgScene />
      <div className="setup-page">
        <div className="setup-header">
          <div className="setup-avatar-preview">{selectedAvatar}</div>
          <h1 className="setup-title">
            {character?.name || 'Your Hero'}
          </h1>
          <p className="setup-subtitle">Define your destiny</p>
          <button
            type="button"
            className="setup-logout"
            onClick={() => { logout(); navigate('/login'); }}
          >
            ← Log out
          </button>
        </div>

        <div className="setup-body">

          {/* Avatar */}
          <section className="pick-section">
            <h2 className="pick-heading">Choose Avatar</h2>
            <div className="avatar-grid">
              {AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  className={`avatar-btn ${selectedAvatar === av ? 'selected' : ''}`}
                  onClick={() => setAvatar(av)}
                >
                  {av}
                </button>
              ))}
            </div>
          </section>

          {/* Class */}
          <section className="pick-section">
            <h2 className="pick-heading">Choose Class</h2>
            <div className="pick-grid">
              {CLASSES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`pick-card ${selectedClass === c.id ? 'selected' : ''}`}
                  onClick={() => setClass(c.id)}
                >
                  <div className="pick-icon">{c.icon}</div>
                  <div className="pick-name">{c.id}</div>
                  <div className="pick-desc">{c.desc}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Race */}
          <section className="pick-section">
            <h2 className="pick-heading">Choose Race</h2>
            <div className="pick-grid">
              {RACES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`pick-card ${selectedRace === r.id ? 'selected' : ''}`}
                  onClick={() => setRace(r.id)}
                >
                  <div className="pick-icon">{r.icon}</div>
                  <div className="pick-name">{r.id}</div>
                  <div className="pick-desc">{r.desc}</div>
                </button>
              ))}
            </div>
          </section>

          {error && <div className="alert error visible">{error}</div>}

          <button
            className="btn-primary setup-submit"
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
          >
            {loading
              ? 'Entering the realm...'
              : canSubmit
                ? `Begin as ${selectedRace} ${selectedClass}`
                : 'Select class and race to continue'}
          </button>
        </div>
      </div>
    </>
  );
}
