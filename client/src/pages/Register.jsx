import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BgScene from '../components/layout/BgScene';

export default function Register() {
  const [form, setForm]       = useState({ username: '', email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate     = useNavigate();

  const handleChange = (e) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username || !form.email || !form.password) {
      setError('All fields are required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      navigate('/login', { state: { registered: true } });
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
          <div className="auth-lore-crest">🗡</div>
          <h1 className="auth-lore-title">RPG Forum</h1>
          <p className="auth-lore-tagline">Carve your name into<br />the annals of history</p>
          <div className="auth-lore-rule" />
          <p className="auth-lore-body">
            Every legend begins with a single choice. Step forward, traveller,
            and claim your place among heroes and villains alike.
          </p>
          <div className="auth-lore-glyphs">
            <span>⚔</span><span>🛡</span><span>📜</span><span>🔥</span>
          </div>
        </div>
        <div className="auth-lore-glow" />
      </aside>

      <main className="auth-form-side">
        <div className="auth-form-inner">
          <div className="auth-form-eyebrow">New Arrival</div>
          <h2 className="auth-form-title">Begin Your Legend</h2>
          <p className="auth-form-sub">Create your account and enter the realm</p>

          {error && <div className="auth-alert auth-alert-error">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="YourHeroName"
                autoComplete="username"
              />
            </div>
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>
            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min. 6 characters"
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Entering the realm…' : 'Forge Your Account'}
            </button>
          </form>

          <div className="auth-switch">
            Already a legend?{' '}
            <Link to="/login">Return to your realm</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
