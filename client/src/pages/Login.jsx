import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BgScene from '../components/layout/BgScene';

export default function Login() {
  const location = useLocation();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [success]               = useState(
    location.state?.registered ? 'Account forged. You may enter the realm.' : ''
  );
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('All fields are required.'); return; }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/character-select');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split">
      <BgScene />

      <aside className="auth-lore">
        <div className="auth-lore-inner">
          <div className="auth-lore-crest">⚔</div>
          <h1 className="auth-lore-title">RPG Forum</h1>
          <p className="auth-lore-tagline">Where legends are written<br />in blood and ink</p>
          <div className="auth-lore-rule" />
          <p className="auth-lore-body">
            Enter a world forged from story and strife. Build your legacy,
            forge alliances, and leave your mark upon the realm eternal.
          </p>
          <div className="auth-lore-glyphs">
            <span>🏰</span><span>⚔</span><span>🔮</span><span>🐉</span>
          </div>
        </div>
        <div className="auth-lore-glow" />
      </aside>

      <main className="auth-form-side">
        <div className="auth-form-inner">
          <div className="auth-form-eyebrow">Portal of Return</div>
          <h2 className="auth-form-title">Enter the Realm</h2>
          <p className="auth-form-sub">Your legend awaits beyond these gates</p>

          {success && <div className="auth-alert auth-alert-success">{success}</div>}
          {error   && <div className="auth-alert auth-alert-error">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>
            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your secret passphrase"
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Opening the gates…' : 'Enter the Realm'}
            </button>
          </form>

          <div className="auth-switch">
            No account?{' '}
            <Link to="/register">Begin your legend</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
