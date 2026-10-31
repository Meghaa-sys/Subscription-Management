import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearSession, hasSession, SESSION_EXPIRED_EVENT } from '../api/client';
import { CurrentUser } from '../types';

const CUSTOMER_NOT_SUPPORTED = 'This console is for staff and admins. The customer portal is not built yet.';

interface AuthValue {
  user: CurrentUser | null;
  isAdmin: boolean;
  checkingSession: boolean;
  login: (email: string, password: string) => Promise<void>;
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
      .then(me => (me.role === 'customer' ? logout() : setUser(me)))
      .catch(console.error)
      .finally(() => setCheckingSession(false));
  }, [logout]);

  useEffect(() => {
    const handleExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const me = await api.login(email, password);
    if (me.role === 'customer') {
      clearSession();
      throw new Error(CUSTOMER_NOT_SUPPORTED);
    }
    setUser(me);
  }, []);

  const value = useMemo(
    () => ({ user, isAdmin: user?.role === 'admin', checkingSession, login, logout }),
    [user, checkingSession, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
