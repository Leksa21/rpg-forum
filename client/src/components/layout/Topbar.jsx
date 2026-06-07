import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/dashboard', label: 'Home' },
  { to: '/forum',     label: 'Forum' },
  { to: '/quests',    label: 'Quests' },
  { to: '/map',       label: 'Map' },
  { to: '/character', label: 'Profile' },
];

export default function Topbar() {
  const { character, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'head_admin';

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span>⚔</span> RPG Forum
      </div>

      <nav className="topbar-nav">
        {NAV.map(({ to, label }) => (
          <Link key={to} to={to} className="topbar-nav-link">{label}</Link>
        ))}
        {isAdmin && <Link to="/admin" className="topbar-nav-link topbar-nav-admin">Admin</Link>}
      </nav>

      <div className="topbar-right">
        <div className="topbar-user">
          <span className="topbar-avatar">{character?.avatar || '⚔️'}</span>
          <strong>{character?.name || 'Adventurer'}</strong>
          {character?.class && (
            <span className="topbar-class">· {character.race} {character.class}</span>
          )}
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
