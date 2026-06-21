import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { connectRealtime, disconnectRealtime } from '../utils/realtime';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('sm_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sm_token');
    if (token) {
      api.get('/users/me')
        .then(res => { setUser(res.data); localStorage.setItem('sm_user', JSON.stringify(res.data)); })
        .catch(() => { localStorage.removeItem('sm_token'); localStorage.removeItem('sm_user'); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('sm_token');
    if (!user?._id || !token) {
      disconnectRealtime();
      return undefined;
    }

    connectRealtime(token);
    return () => disconnectRealtime();
  }, [user?._id]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('sm_token', res.data.token);
    localStorage.setItem('sm_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    localStorage.setItem('sm_token', res.data.token);
    localStorage.setItem('sm_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const googleLogin = async (credential) => {
    const res = await api.post('/auth/google', { credential });
    localStorage.setItem('sm_token', res.data.token);
    localStorage.setItem('sm_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const resetPassword = async ({ email, token, password }) => {
    const res = await api.post('/auth/reset-password', { email, token, password });
    localStorage.setItem('sm_token', res.data.token);
    localStorage.setItem('sm_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('sm_token');
    localStorage.removeItem('sm_user');
    setUser(null);
  };

  const updateUser = (data) => {
    const updated = { ...user, ...data };
    setUser(updated);
    localStorage.setItem('sm_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleLogin, resetPassword, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
