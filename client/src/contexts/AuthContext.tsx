import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '@/lib/api';

interface User {
  id: number; name: string; email: string;
  plan: string; api_key: string;
  credits_remaining: number; credits_used: number;
  credits_reset_at: string;
  is_admin: boolean; email_verified: boolean;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]     = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const { data } = await authApi.me();
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => { refresh().finally(() => setLoading(false)); }, []);

  async function login(email: string, password: string) {
    const { data } = await authApi.login({ email, password });
    setUser(data.user);
  }

  async function logout() {
    await authApi.logout();
    setUser(null);
    window.location.href = '/';
  }

  return <Ctx.Provider value={{ user, loading, login, logout, refresh }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
