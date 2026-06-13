import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

// Same-origin only (see api.ts). Auth calls hit /api/v1/auth/* on this origin,
// which is proxied to the backend by Vercel (prod) / Vite (dev) so the session
// cookie stays first-party and works on mobile.
const authApi = axios.create({
  baseURL: '',
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
      // Confirm the session cookie actually persisted (mobile browsers may
      // reject it). Don't trust the login response alone — verify via status,
      // otherwise the app renders but every data request 401s.
      const res = await authApi.get('/api/v1/auth/status');
      const ok = res.data?.authenticated === true;
      setIsAuthenticated(ok);
      return ok;
    } catch {
      setIsAuthenticated(false);
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
