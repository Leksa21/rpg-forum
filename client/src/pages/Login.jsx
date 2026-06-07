import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BgScene from '../components/layout/BgScene';

export default function Login() {
  const location = useLocation();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [success]               = useState(location.state?.registered ? 'Account created! Please log in.' : '');
  const [loading, setLoading]   = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('All fields are required.');
      return;
    }

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
    <>
      <BgScene />
      <div className="page-center">
        <div className="card">
          <div className="crest">
            <div className="crest-icon">🏰</div>
            <h1>RPG Forum</h1>
            <p>Return to your realm</p>
          </div>

          <div className="divider">Enter the Realm</div>

          {success && <div className="alert success visible">{success}</div>}
          {error   && <div className="alert error visible">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="email">Scroll Address (Email)</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Secret Passphrase</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Opening the gates...' : 'Enter the Realm'}
            </button>
          </form>

          <div className="form-footer">
            No account yet? <Link to="/register">Begin your legend</Link>
          </div>
        </div>
      </div>
    </>
  );
}
