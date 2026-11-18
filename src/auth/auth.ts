import {
  appendAuditEntry,
  loadDatabase,
  saveDatabase,
  SESSION_STORAGE_KEY,
  waitDelay,
} from '../db/storage';
import type { SessionUser } from '../types/domain';
import { validateEmail } from '../utils/calculations';
import { verifyPassword } from '../utils/crypto';
import {
  canAccessStaffRoute,
  getPermissionsForRole,
  getPortalHomeRoute,
} from './permissions';

export const MAX_FAILED_ATTEMPTS = 5;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

let memorySession: SessionUser | null = null;

function getSessionStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Non-browser context
  }
  return null;
}

export function getRateLimitStatus(
  emailNormalized: string,
  nowMs: number = Date.now()
): { limited: boolean; minutesRemaining: number; recentAttempts: number[] } {
  const db = loadDatabase();
  const bucket = db.loginAttempts[emailNormalized];
  if (!bucket) {
    return { limited: false, minutesRemaining: 0, recentAttempts: [] };
  }

  const cutoff = nowMs - RATE_LIMIT_WINDOW_MS;
  const recent = bucket.failedTimestamps.filter((ts) => ts > cutoff);

  if (recent.length >= MAX_FAILED_ATTEMPTS) {
    const oldestRelevant = recent[recent.length - MAX_FAILED_ATTEMPTS];
    const msLeft = Math.max(60_000, oldestRelevant + RATE_LIMIT_WINDOW_MS - nowMs);
    const minutesRemaining = Math.max(1, Math.ceil(msLeft / 60_000));
    return { limited: true, minutesRemaining, recentAttempts: recent };
  }

  return { limited: false, minutesRemaining: 0, recentAttempts: recent };
}

function recordFailedAttempt(emailNormalized: string, nowMs: number = Date.now()): void {
  const db = loadDatabase();
  const cutoff = nowMs - RATE_LIMIT_WINDOW_MS;
  const existing = db.loginAttempts[emailNormalized]?.failedTimestamps ?? [];
  const pruned = existing.filter((ts) => ts > cutoff);
  pruned.push(nowMs);
  db.loginAttempts[emailNormalized] = {
    email: emailNormalized,
    failedTimestamps: pruned,
  };
  saveDatabase(db);
}

function clearFailedAttempts(emailNormalized: string): void {
  const db = loadDatabase();
  if (db.loginAttempts[emailNormalized]) {
    delete db.loginAttempts[emailNormalized];
    saveDatabase(db);
  }
}

export interface SignInResult {
  ok: boolean;
  session?: SessionUser;
  redirectTo?: string;
  error?: string;
  fieldError?: string;
}

export async function signIn(
  rawEmail: string,
  password: string,
  nowMs: number = Date.now()
): Promise<SignInResult> {
  await waitDelay();

  const email = rawEmail.trim().toLowerCase();
  if (!validateEmail(email)) {
    return {
      ok: false,
      fieldError: 'Enter a valid email address.',
    };
  }

  if (!password) {
    return {
      ok: false,
      error: 'Email or password is incorrect.',
    };
  }

  const rateStatus = getRateLimitStatus(email, nowMs);
  if (rateStatus.limited) {
    appendAuditEntry({
      actorEmail: email,
      action: 'LOGIN_RATE_LIMITED',
      detail: `Rate limit reached after ${MAX_FAILED_ATTEMPTS} failed sign-in attempts.`,
    });
    return {
      ok: false,
      error: `Too many sign-in attempts. Try again in about ${rateStatus.minutesRemaining} minutes.`,
    };
  }

  const db = loadDatabase();
  const account = db.userAccounts.find((u) => u.email.toLowerCase() === email);

  if (!account || !verifyPassword(password, account.passwordHash)) {
    recordFailedAttempt(email, nowMs);
    appendAuditEntry({
      actorAccountId: account?.id,
      actorEmail: email,
      actorRole: account?.role,
      action: 'LOGIN_FAILURE',
      detail: 'Failed sign-in attempt due to invalid credentials.',
    });
    return {
      ok: false,
      error: 'Email or password is incorrect.',
    };
  }

  clearFailedAttempts(email);

  let session: SessionUser;
  if (account.role === 'STUDENT') {
    const student = db.students.find((s) => s.id === account.studentId);
    if (!student) {
      return { ok: false, error: 'Email or password is incorrect.' };
    }
    session = {
      accountId: account.id,
      email: account.email,
      fullName: student.fullName,
      role: 'STUDENT',
      studentId: student.id,
      permissions: getPermissionsForRole('STUDENT'),
    };
  } else {
    const staff = db.staffAccounts.find((s) => s.id === account.staffId);
    if (!staff) {
      return { ok: false, error: 'Email or password is incorrect.' };
    }
    session = {
      accountId: account.id,
      email: account.email,
      fullName: staff.fullName,
      role: 'STAFF',
      staffId: staff.id,
      staffGroup: staff.staffGroup,
      designation: staff.designation,
      permissions: getPermissionsForRole('STAFF', staff.staffGroup),
    };
  }

  setSession(session);

  appendAuditEntry({
    actorAccountId: session.accountId,
    actorEmail: session.email,
    actorRole: session.role,
    action: 'LOGIN_SUCCESS',
    detail:
      session.role === 'STAFF'
        ? `Signed in as ${session.fullName} (${session.staffGroup}).`
        : `Signed in as ${session.fullName}.`,
  });

  return {
    ok: true,
    session,
    redirectTo: getPortalHomeRoute(session.role),
  };
}

export function setSession(session: SessionUser | null): void {
  memorySession = session;
  const storage = getSessionStorage();
  if (storage) {
    try {
      if (session) {
        storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ accountId: session.accountId }));
      } else {
        storage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  }
}

/**
 * Re-hydrates session from the authoritative database account record so
 * permissions and roles are never trusted from stale client cache alone.
 */
export function getCurrentSession(): SessionUser | null {
  if (memorySession) return memorySession;

  const storage = getSessionStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { accountId?: string };
    if (!parsed?.accountId) return null;

    const db = loadDatabase();
    const account = db.userAccounts.find((u) => u.id === parsed.accountId);
    if (!account) {
      storage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    if (account.role === 'STUDENT') {
      const student = db.students.find((s) => s.id === account.studentId);
      if (!student) return null;
      memorySession = {
        accountId: account.id,
        email: account.email,
        fullName: student.fullName,
        role: 'STUDENT',
        studentId: student.id,
        permissions: getPermissionsForRole('STUDENT'),
      };
      return memorySession;
    }

    const staff = db.staffAccounts.find((s) => s.id === account.staffId);
    if (!staff) return null;
    memorySession = {
      accountId: account.id,
      email: account.email,
      fullName: staff.fullName,
      role: 'STAFF',
      staffId: staff.id,
      staffGroup: staff.staffGroup,
      designation: staff.designation,
      permissions: getPermissionsForRole('STAFF', staff.staffGroup),
    };
    return memorySession;
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  const current = getCurrentSession();
  await waitDelay();
  if (current) {
    appendAuditEntry({
      actorAccountId: current.accountId,
      actorEmail: current.email,
      actorRole: current.role,
      action: 'LOGOUT',
      detail: `Signed out (${current.role}).`,
    });
  }
  setSession(null);
}

export function requireSession(): SessionUser {
  const session = getCurrentSession();
  if (!session) {
    throw new Error('Authentication required.');
  }
  return session;
}

export function requireStudentSession(requestedStudentId?: string): SessionUser {
  const session = requireSession();
  if (session.role !== 'STUDENT' || !session.studentId) {
    throw new Error('Student access required.');
  }
  if (requestedStudentId && requestedStudentId !== session.studentId) {
    appendAuditEntry({
      actorAccountId: session.accountId,
      actorEmail: session.email,
      actorRole: session.role,
      action: 'ACCESS_DENIED',
      detail: 'Attempted to read another student record.',
    });
    throw new Error('Access denied.');
  }
  return session;
}

export function recordAccessDenied(targetRoute: string, reason?: string): void {
  const session = getCurrentSession();
  appendAuditEntry({
    actorAccountId: session?.accountId,
    actorEmail: session?.email ?? 'anonymous',
    actorRole: session?.role,
    action: 'ACCESS_DENIED',
    targetRoute,
    detail: reason ?? `Denied access to ${targetRoute}.`,
  });
}

export function checkStaffRouteAccess(pathname: string): {
  allowed: boolean;
  session: SessionUser | null;
} {
  const session = getCurrentSession();
  if (!session || session.role !== 'STAFF') {
    return { allowed: false, session };
  }
  const allowed = canAccessStaffRoute(session, pathname);
  return { allowed, session };
}
