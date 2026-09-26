import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('travelmate_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('travelmate_token'));
  const [loading, setLoading] = useState(true);

  // Restore and verify user profile on app launch
  useEffect(() => {
    async function checkAuth() {
      const storedToken = localStorage.getItem('travelmate_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/profile');
          if (res.data.success) {
            setUser(res.data.user);
            localStorage.setItem('travelmate_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.warn('Session expired or invalid, signing out');
          logout();
        }
      }
      setLoading(false);
    }

    checkAuth();

    // Listen for unauthorized events dispatched by api interceptor
    const handleUnauthorized = () => logout();
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('travelmate_token', res.data.token);
      localStorage.setItem('travelmate_user', JSON.stringify(res.data.user));
      return res.data.user;
    }
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    if (res.data.success) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('travelmate_token', res.data.token);
      localStorage.setItem('travelmate_user', JSON.stringify(res.data.user));
      return res.data.user;
    }
  };

  const updateProfile = async (updates) => {
    const res = await api.put('/auth/profile', updates);
    if (res.data.success) {
      setUser(res.data.user);
      localStorage.setItem('travelmate_user', JSON.stringify(res.data.user));
      return res.data.user;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('travelmate_token');
    localStorage.removeItem('travelmate_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
