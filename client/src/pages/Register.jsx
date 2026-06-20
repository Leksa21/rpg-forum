import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BgScene from '../components/layout/BgScene';
import AuthHero from '../components/layout/AuthHero';

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

      <AuthHero />

      <main className="auth-form-side">
        <div className="auth-form-inner">
          <div className="auth-intro">
            <span className="auth-intro-eyebrow">⚔ A new chapter begins</span>
            <h1 className="auth-intro-title">Forge your<br />destiny.</h1>
            <p className="auth-intro-lead">
              Every legend starts with a single strike. Create your account
              and carve your name into the annals of Aldermere.
            </p>
          </div>

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
