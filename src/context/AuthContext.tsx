import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getCurrentSession,
  signIn as authSignIn,
  signOut as authSignOut,
  type SignInResult,
} from '../auth/auth';
import { db } from '../db/db';
import type { SessionUser } from '../types/domain';

interface AuthContextValue {
  session: SessionUser | null;
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionUser | null>(() => getCurrentSession());
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const refreshUnreadCount = useCallback(async () => {
    const count = await db.getUnreadNotificationCount();
    setUnreadCount(count);
  }, []);

  useEffect(() => {
    if (session) {
      void refreshUnreadCount();
    } else {
      setUnreadCount(0);
    }
  }, [session, refreshUnreadCount]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await authSignIn(email, password);
    if (result.ok && result.session) {
      setSession(result.session);
    }
    return result;
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setSession(null);
    setUnreadCount(0);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        unreadCount,
        refreshUnreadCount,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
