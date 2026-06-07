import { createContext, useContext, useState, useEffect } from 'react';
import { get, post, put } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,      setUser]      = useState(null);
  const [character, setCharacter] = useState(null);
  const [token,     setToken]     = useState(() => localStorage.getItem('token'));
  const [isLoading, setLoading]   = useState(true);

  // Runs once on mount — restores session from localStorage token
  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) { setLoading(false); return; }

    (async () => {
      try {
        const userData = await get('/api/auth/me', stored);
        setUser(userData.data);

        try {
          const charData = await get('/api/characters/me', stored);
          setCharacter(charData.data);
        } catch {
          setCharacter(null);
        }
      } catch {
        localStorage.removeItem('token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const data = await post('/api/auth/login', { email, password });
    const t = data.data.token;
    localStorage.setItem('token', t);
    setToken(t);
    setUser(data.data.user);

    try {
      const charData = await get('/api/characters/me', t);
      setCharacter(charData.data);
    } catch {
      setCharacter(null);
    }
  };

  // Register only creates the account — caller must redirect to /login
  const register = async (username, email, password) => {
    await post('/api/auth/register', { username, email, password });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setCharacter(null);
  };

  const createCharacter = async (name) => {
    const data = await post('/api/characters', { name }, token);
    setCharacter(data.data);
    return data.data;
  };

  const setupCharacter = async (charClass, race, avatar) => {
    const data = await put('/api/characters/setup', { class: charClass, race, avatar }, token);
    setCharacter(data.data);
    return data.data;
  };

  return (
    <AuthContext.Provider value={{
      user, character, token, isLoading,
      login, register, logout, createCharacter, setupCharacter,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
