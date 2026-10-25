import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('organ_ease_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize demo user if no token exists
  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await api.getCurrentUser();
          if (res.success && res.user) {
            setUser(res.user);
          } else {
            logout();
          }
        } catch (err) {
          console.error('Failed to load user:', err);
        }
      } else {
        // Auto-login default demo user (Dr. Sarah Lin - Transplant Surgeon)
        loginDemoUser('surgeon');
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    if (res.success) {
      localStorage.setItem('organ_ease_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return { success: true };
    }
    return { success: false, message: res.message };
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    if (res.success) {
      localStorage.setItem('organ_ease_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return { success: true };
    }
    return { success: false, message: res.message };
  };

  const logout = () => {
    localStorage.removeItem('organ_ease_token');
    setToken(null);
    setUser(null);
  };

  // Convenient demo persona switcher
  const loginDemoUser = async (roleType = 'surgeon') => {
    const credentials = {
      surgeon: { email: 'sarah.lin@stjudetx.org', password: 'OrganEase2026!' },
      coordinator: { email: 'marcus.brody@metrohealth.org', password: 'OrganEase2026!' },
      dispatcher: { email: 'dispatch@organ-ease.io', password: 'OrganEase2026!' }
    }[roleType] || { email: 'sarah.lin@stjudetx.org', password: 'OrganEase2026!' };

    return login(credentials.email, credentials.password);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, loginDemoUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
