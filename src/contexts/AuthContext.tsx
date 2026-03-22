import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Separate axios instance for auth calls (bypasses the main interceptor)
const authApi = axios.create({
  baseURL: API_BASE.replace(/\/api\/v1\/?$/, ''),
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check existing session cookie on mount
  useEffect(() => {
    authApi
      .get('/api/v1/auth/status')
      .then((res) => setIsAuthenticated(res.data?.authenticated === true))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setLoading(false));
  }, []);

  const login = async (password: string): Promise<boolean> => {
    try {
      await authApi.post('/api/v1/auth/login', { password });
      setIsAuthenticated(true);
      return true;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    try {
      await authApi.post('/api/v1/auth/logout');
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
