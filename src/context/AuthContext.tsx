import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  fetchUserSessionFromFirestore,
  getCurrentSession,
  setCurrentSession,
  signIn as authSignIn,
  signInWithGoogle as authSignInWithGoogle,
  signOut as authSignOut,
  type SignInResult,
} from '../auth/auth';
import { db } from '../db/db';
import { firebaseAuth } from '../firebase/config';
import type { SessionUser } from '../types/domain';

interface AuthContextValue {
  session: SessionUser | null;
  authReady: boolean;
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signInWithGoogle: () => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionUser | null>(() => getCurrentSession());
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (!active) return;

      if (!firebaseUser) {
        setCurrentSession(null);
        setSession(null);
        setUnreadCount(0);
        setAuthReady(true);
        return;
      }

      try {
        const resolved = await fetchUserSessionFromFirestore(firebaseUser);
        if (!active) return;
        setCurrentSession(resolved);
        setSession(resolved);
      } catch {
        if (!active) return;
        setCurrentSession(null);
        setSession(null);
      } finally {
        if (active) {
          setAuthReady(true);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!getCurrentSession()) {
      setUnreadCount(0);
      return;
    }
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
      setCurrentSession(result.session);
      setSession(result.session);
      setAuthReady(true);
    }
    return result;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const result = await authSignInWithGoogle();
    if (result.ok && result.session) {
      setCurrentSession(result.session);
      setSession(result.session);
      setAuthReady(true);
    }
    return result;
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setCurrentSession(null);
    setSession(null);
    setUnreadCount(0);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        authReady,
        unreadCount,
        refreshUnreadCount,
        signIn,
        signInWithGoogle,
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
