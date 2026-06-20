import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/dashboard', label: 'Home' },
  { to: '/map',       label: '🗺 Map (the Realm)' },
  { to: '/world/areas', label: 'Areas' },
  { to: '/quests',    label: 'Quests' },
  { to: '/forum',     label: 'Off-Topic' },
  { to: '/character', label: 'Profile' },
];

export default function Topbar() {
  const { character, user, logout } = useAuth();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const [charOpen, setCharOpen] = useState(false);
  const navRef = useRef(null);
  const charRef = useRef(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'head_admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    function onClickOutside(e) {
      if (navRef.current && !navRef.current.contains(e.target)) setNavOpen(false);
      if (charRef.current && !charRef.current.contains(e.target)) setCharOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <header className="topbar">
      {/* Left: brand + nav dropdown */}
      <div className="topbar-left" ref={navRef}>
        <Link to="/dashboard" className="topbar-brand">
          <span>⚔</span> RPG Forum
        </Link>
        <button
          className={`topbar-menu-btn${navOpen ? ' open' : ''}`}
          onClick={() => { setNavOpen(o => !o); setCharOpen(false); }}
          aria-label="Navigation menu"
        >
          <span className="topbar-menu-icon">
            <span /><span /><span />
          </span>
        </button>
        {navOpen && (
          <div className="topbar-dropdown topbar-dropdown--nav">
            {NAV.map(({ to, label }) => (
              <Link key={to} to={to} className="topbar-dd-link" onClick={() => setNavOpen(false)}>
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" className="topbar-dd-link topbar-dd-admin" onClick={() => setNavOpen(false)}>
                Admin
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Center: persistent "you are here" indicator */}
      <div className="topbar-center">
        {character?.currentLocation ? (
          <Link to={`/world/areas/${character.currentLocation._id}`} className="topbar-here" title="Open the forum where you are">
            <span className="topbar-here-icon">{character.currentLocation.icon || '📍'}</span>
            <span className="topbar-here-text">
              <span className="topbar-here-label">You are in</span>
              <span className="topbar-here-name">{character.currentLocation.name}</span>
            </span>
          </Link>
        ) : (
          <Link to="/map" className="topbar-here topbar-here--muted" title="Open the map">
            <span className="topbar-here-icon">🧭</span>
            <span className="topbar-here-text">
              <span className="topbar-here-name">Enter the Realm</span>
            </span>
          </Link>
        )}
      </div>

      {/* Right: character dropdown */}
      <div className="topbar-right" ref={charRef}>
        <button
          className={`topbar-char-btn${charOpen ? ' open' : ''}`}
          onClick={() => { setCharOpen(o => !o); setNavOpen(false); }}
          aria-label="Character menu"
        >
          <span className="topbar-avatar">{character?.avatar || '⚔️'}</span>
          <strong className="topbar-char-name">{character?.name || 'Adventurer'}</strong>
          <span className="topbar-caret">▾</span>
        </button>
        {charOpen && (
          <div className="topbar-dropdown topbar-dropdown--char">
            <div className="topbar-char-header">
              <span className="topbar-char-avatar-lg">{character?.avatar || '⚔️'}</span>
              <div className="topbar-char-meta">
                <div className="topbar-char-fullname">{character?.name || 'Adventurer'}</div>
                {character?.class && (
                  <div className="topbar-char-sub">{character.race} {character.class}</div>
                )}
                {character?.level != null && (
                  <div className="topbar-char-sub">Level {character.level}</div>
                )}
              </div>
            </div>
            <div className="topbar-dd-divider" />
            <Link to="/character" className="topbar-dd-link" onClick={() => setCharOpen(false)}>
              View Profile
            </Link>
            <button className="topbar-dd-link topbar-dd-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
