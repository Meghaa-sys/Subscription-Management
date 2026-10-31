import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearSession, hasSession, SESSION_EXPIRED_EVENT } from '../api/client';
import { CurrentUser } from '../types';

interface AuthValue {
  user: CurrentUser | null;
  isAdmin: boolean;
  checkingSession: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  setUser: (user: CurrentUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(hasSession());

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  useEffect(() => {
    if (!hasSession()) return;
    api
      .getMe()
      .then(setUser)
      .catch(console.error)
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    const handleExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setUser(await api.login(email, password));
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    setUser(await api.signup(name, email, password));
  }, []);

  const value = useMemo(
    () => ({ user, isAdmin: user?.role === 'admin', checkingSession, login, signup, setUser, logout }),
    [user, checkingSession, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
