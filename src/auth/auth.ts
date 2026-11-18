import {
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../firebase/config';
import { OperationType, handleFirestoreError } from '../firebase/errors';
import type { AuditAction, SessionUser, StaffGroup, UserRole } from '../types/domain';
import { validateEmail } from '../utils/calculations';
import { canAccessStaffRoute, getPermissionsForRole, getPortalHomeRoute } from './permissions';
import {
  clearFailedAttempts,
  getRateLimitStatus,
  recordFailedAttempt,
} from './rateLimit';

export interface FirestoreUserProfile {
  name: string;
  role: UserRole;
  staffRole: StaffGroup | null;
  studentId: string | null;
  email?: string;
  designation?: string | null;
}

export interface SignInResult {
  ok: boolean;
  session?: SessionUser;
  redirectTo?: string;
  error?: string;
  fieldError?: string;
}

let currentSession: SessionUser | null = null;

export function getCurrentSession(): SessionUser | null {
  return currentSession;
}

export function setCurrentSession(session: SessionUser | null): void {
  currentSession = session;
}

async function writeAuditLog(params: {
  actorUid: string;
  actorEmail: string;
  actorRole: UserRole;
  action: AuditAction;
  targetRoute?: string;
  detail: string;
}): Promise<void> {
  const path = 'auditLogs';
  try {
    await addDoc(collection(firestoreDb, path), {
      timestamp: new Date().toISOString(),
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      action: params.action,
      ...(params.targetRoute ? { targetRoute: params.targetRoute } : {}),
      detail: params.detail.slice(0, 400),
    });
  } catch (error) {
    // Non-blocking for logout/audit if permissions are being verified, but still log structured info
    console.warn('Audit log write failed:', error);
  }
}

export async function fetchUserSessionFromFirestore(
  firebaseUser: User
): Promise<SessionUser | null> {
  const path = `users/${firebaseUser.uid}`;
  let snap;
  try {
    snap = await getDoc(doc(firestoreDb, 'users', firebaseUser.uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (!snap.exists()) {
    return null;
  }

  const profile = snap.data() as FirestoreUserProfile;
  if (profile.role !== 'STUDENT' && profile.role !== 'STAFF') {
    return null;
  }

  if (profile.role === 'STUDENT') {
    if (!profile.studentId) return null;
    return {
      accountId: firebaseUser.uid,
      email: firebaseUser.email ?? profile.email ?? '',
      fullName: profile.name,
      role: 'STUDENT',
      studentId: profile.studentId,
      permissions: getPermissionsForRole('STUDENT'),
    };
  }

  if (!profile.staffRole) return null;
  return {
    accountId: firebaseUser.uid,
    email: firebaseUser.email ?? profile.email ?? '',
    fullName: profile.name,
    role: 'STAFF',
    staffId: firebaseUser.uid,
    staffGroup: profile.staffRole,
    designation: profile.designation ?? undefined,
    permissions: getPermissionsForRole('STAFF', profile.staffRole),
  };
}

export async function signIn(
  rawEmail: string,
  password: string,
  nowMs: number = Date.now()
): Promise<SignInResult> {
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
    return {
      ok: false,
      error: `Too many sign-in attempts. Try again in about ${rateStatus.minutesRemaining} minutes.`,
    };
  }

  try {
    const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const session = await fetchUserSessionFromFirestore(credential.user);

    if (!session) {
      await firebaseSignOut(firebaseAuth);
      return {
        ok: false,
        error:
          'Account profile not provisioned in Firestore users/{uid}. Load demo data in development mode first.',
      };
    }

    clearFailedAttempts(email);
    setCurrentSession(session);

    await writeAuditLog({
      actorUid: session.accountId,
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
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: unknown }).code)
        : '';

    if (code === 'auth/operation-not-allowed') {
      return {
        ok: false,
        error:
          'Email/Password authentication is not enabled in Firebase Console yet. Enable Email/Password under Authentication -> Sign-in method for this project.',
      };
    }

    if (code === 'auth/too-many-requests') {
      return {
        ok: false,
        error: 'Too many sign-in attempts. Try again in about 15 minutes.',
      };
    }

    recordFailedAttempt(email, nowMs);
    return {
      ok: false,
      error: 'Email or password is incorrect.',
    };
  }
}

export async function signInWithGoogle(): Promise<SignInResult> {
  try {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(firebaseAuth, provider);
    const session = await fetchUserSessionFromFirestore(credential.user);

    if (!session) {
      await firebaseSignOut(firebaseAuth);
      return {
        ok: false,
        error:
          'Signed in with Google, but no university profile (users/{uid}) exists for this account yet. Use a provisioned account or load demo data.',
      };
    }

    setCurrentSession(session);
    await writeAuditLog({
      actorUid: session.accountId,
      actorEmail: session.email,
      actorRole: session.role,
      action: 'LOGIN_SUCCESS',
      detail:
        session.role === 'STAFF'
          ? `Signed in via Google as ${session.fullName} (${session.staffGroup}).`
          : `Signed in via Google as ${session.fullName}.`,
    });

    return {
      ok: true,
      session,
      redirectTo: getPortalHomeRoute(session.role),
    };
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: unknown }).code)
        : '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return {
        ok: false,
        error: 'Google sign-in popup was closed before completing authentication.',
      };
    }
    return {
      ok: false,
      error: 'Unable to complete Google sign-in. Check popup permissions and try again.',
    };
  }
}

export async function requestPasswordReset(
  rawEmail: string
): Promise<{ ok: boolean; message: string }> {
  const email = rawEmail.trim().toLowerCase();
  if (!validateEmail(email)) {
    return {
      ok: false,
      message: 'Enter a valid email address.',
    };
  }
  try {
    await sendPasswordResetEmail(firebaseAuth, email);
    return {
      ok: true,
      message: `If an account exists for ${email}, a password reset email has been dispatched.`,
    };
  } catch {
    return {
      ok: true,
      message: `If an account exists for ${email}, a password reset email has been dispatched.`,
    };
  }
}

export async function signOut(): Promise<void> {
  const current = currentSession;
  if (current) {
    await writeAuditLog({
      actorUid: current.accountId,
      actorEmail: current.email,
      actorRole: current.role,
      action: 'LOGOUT',
      detail: `Signed out (${current.role}).`,
    });
  }
  setCurrentSession(null);
  await firebaseSignOut(firebaseAuth);
}

export function requireSession(): SessionUser {
  if (!currentSession) {
    throw new Error('Authentication required.');
  }
  return currentSession;
}

export function requireStudentSession(requestedStudentId?: string): SessionUser {
  const session = requireSession();
  if (session.role !== 'STUDENT' || !session.studentId) {
    throw new Error('Student access required.');
  }
  if (requestedStudentId && requestedStudentId !== session.studentId) {
    void recordAccessDenied('/student', 'Attempted to read another student record.');
    throw new Error('Access denied.');
  }
  return session;
}

export function recordAccessDenied(targetRoute: string, reason?: string): void {
  const session = currentSession;
  if (!session) return;
  void writeAuditLog({
    actorUid: session.accountId,
    actorEmail: session.email,
    actorRole: session.role,
    action: 'ACCESS_DENIED',
    targetRoute,
    detail: reason ?? `Denied access to ${targetRoute}.`,
  });
}

export function checkStaffRouteAccess(pathname: string): {
  allowed: boolean;
  session: SessionUser | null;
} {
  const session = currentSession;
  if (!session || session.role !== 'STAFF') {
    return { allowed: false, session };
  }
  return {
    allowed: canAccessStaffRoute(session, pathname),
    session,
  };
}
