import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BgScene from '../components/layout/BgScene';
import Topbar from '../components/layout/Topbar';
import GlobalChat from '../components/GlobalChat';
import ActiveAdventurers   from '../components/ActiveAdventurers';
import PendingChallenges   from '../components/PendingChallenges';

const STAT_LABELS = {
  strength:     { label: 'STR', icon: '⚔️' },
  dexterity:    { label: 'DEX', icon: '🏹' },
  intelligence: { label: 'INT', icon: '🔮' },
  endurance:    { label: 'END', icon: '🛡️' },
  charisma:     { label: 'CHA', icon: '🎵' },
  wisdom:       { label: 'WIS', icon: '🌿' },
};

const NAV_LINKS = [
  { to: '/forum',     icon: '📜', label: 'Forum',     sub: 'Tales & chronicles' },
  { to: '/quests',    icon: '⚔️', label: 'Quests',    sub: 'Adventure awaits' },
  { to: '/map',       icon: '🗺', label: 'World Map', sub: 'Explore the realm' },
  { to: '/character', icon: '🧙', label: 'My Profile', sub: 'Stats & backstory' },
];

export default function Dashboard() {
  const { character } = useAuth();
  const stats = character?.stats || {};

  return (
    <>
      <BgScene />
      <div className="dashboard">
        <Topbar />

        <main className="dash-main">

          {/* Character banner */}
          <div className="db-hero-banner">
            <div className="db-hero-avatar">{character?.avatar || '⚔️'}</div>
            <div className="db-hero-info">
              <Link to="/character" className="db-hero-name">{character?.name}</Link>
              <p className="db-hero-meta">{character?.race} {character?.class}</p>
              <div className="db-hero-tags">
                <span className="char-tag">Level {character?.level ?? 1}</span>
                <span className="char-tag">{character?.experience ?? 0} XP</span>
                <span className="char-tag" style={{ color: '#f0d060' }}>0 Gold</span>
              </div>
            </div>
          </div>

          {/* Quick nav */}
          <div className="db-nav-grid">
            {NAV_LINKS.map(({ to, icon, label, sub }) => (
              <Link key={to} to={to} className="db-nav-card">
                <span className="db-nav-icon">{icon}</span>
                <div>
                  <div className="db-nav-label">{label}</div>
                  <div className="db-nav-sub">{sub}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* RPG Stats */}
          <div className="db-section-title">Character Stats</div>
          <div className="rpg-stats">
            {Object.entries(STAT_LABELS).map(([key, { label, icon }]) => (
              <div key={key} className="rpg-stat">
                <div className="rpg-stat-icon">{icon}</div>
                <div className="rpg-stat-value">{stats[key] ?? 10}</div>
                <div className="rpg-stat-label">{label}</div>
              </div>
            ))}
          </div>

          {/* Two-column panels */}
          <div className="db-panels">
            <div className="db-panel">
              <div className="db-panel-head"><span>🎒</span> Inventory</div>
              <div className="db-panel-empty">
                <p>Your satchel is empty.</p>
                <p className="db-panel-hint">Items and cards earned on quests will appear here.</p>
              </div>
            </div>

            <div className="db-panel">
              <div className="db-panel-head"><span>🌍</span> World & Lore</div>
              <div className="db-panel-content">
                <div className="db-location-row">
                  <span className="db-location-icon">📍</span>
                  <div>
                    <div className="db-location-name">The Starting Village</div>
                    <div className="db-location-sub">Current location</div>
                  </div>
                </div>
                <div className="db-divider-thin" />
                <div className="db-event-row">
                  <span>📜</span>
                  <span>No global events active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Battle challenges & active battles */}
          <PendingChallenges />

          {/* Active Adventurers */}
          <ActiveAdventurers />

          {/* Global Chat */}
          <GlobalChat />

        </main>
      </div>
    </>
  );
}
