'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthSession, LoginResponse } from '../types/auth';
import { clearSession as clearStoredSession, loadSession, saveSession } from '../lib/session';

interface AuthContextValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setSessionFromLogin: (response: LoginResponse) => AuthSession;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthSession(response: LoginResponse): AuthSession {
  const menus =
    response.user.role?.menus
      ?.map((entry) => entry.menu.path)
      .filter((path): path is string => Boolean(path)) ?? [];
  const roleLabel = response.user.role?.name ?? 'Usuario';
  const avatar = response.user.name.slice(0, 2).toUpperCase();

  return {
    accessToken: response.accessToken,
    user: response.user,
    menus,
    roleLabel,
    avatar,
  };
}

function normalizeStoredSession(session: AuthSession | null): AuthSession | null {
  if (!session) return null;

  return {
    ...session,
    menus: Array.isArray(session.menus) ? session.menus : [],
    roleLabel: session.roleLabel || session.user?.role?.name || 'Usuario',
    avatar: session.avatar || session.user?.name?.slice(0, 2).toUpperCase() || 'US',
  };
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const storedSession = loadSession<AuthSession>();
    const normalizedSession = normalizeStoredSession(storedSession);

    if (normalizedSession) {
      setSession(normalizedSession);
      saveSession(normalizedSession);
    }
    setIsHydrated(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session?.accessToken),
      isHydrated,
      setSessionFromLogin: (response: LoginResponse) => {
        const nextSession = toAuthSession(response);
        setSession(nextSession);
        saveSession(nextSession);
        return nextSession;
      },
      clearSession: () => {
        setSession(null);
        clearStoredSession();
      },
    }),
    [isHydrated, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }

  return context;
}
