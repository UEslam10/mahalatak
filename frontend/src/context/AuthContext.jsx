import { createContext, useContext, useEffect, useState } from 'react';
import { api, saveToken, clearToken, getToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api.me()
      .then(({ user }) => setUser(user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(phone, password) {
    const { token, user } = await api.login({ phone, password });
    saveToken(token);
    setUser(user);
    return user;
  }

  async function register(payload) {
    const { token, user } = await api.register(payload);
    saveToken(token);
    setUser(user);
    return user;
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  async function refreshUser() {
    const { user } = await api.me();
    setUser(user);
    return user;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
