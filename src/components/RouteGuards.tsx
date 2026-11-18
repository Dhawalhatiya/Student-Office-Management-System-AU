import React, { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { recordAccessDenied } from '../auth/auth';
import { canAccessStaffRoute } from '../auth/permissions';
import { useAuth } from '../context/AuthContext';
import { StaffAccessDenied } from '../pages/staff/StaffAccessDenied';
import { PortalLayout } from './PortalLayout';

function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8faf7] px-4 text-[#17221c]">
      <div
        role="status"
        aria-live="polite"
        className="w-full max-w-sm rounded-xl border border-[#dbe4de] bg-white p-6 text-center"
      >
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#d9ebde] border-t-[#185a39]" />
        <p className="mt-3 font-heading text-base font-semibold text-[#17221c]">
          Restoring portal session
        </p>
        <p className="mt-1 text-xs text-[#5a6a61]">
          Verifying credentials and role permissions...
        </p>
      </div>
    </div>
  );
}

export function StudentGuard() {
  const { session, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return <AuthLoadingScreen />;
  }

  if (!session) {
    return <Navigate to="/login?portal=student" state={{ from: location.pathname }} replace />;
  }

  if (session.role !== 'STUDENT') {
    return <Navigate to="/staff" replace />;
  }

  return (
    <PortalLayout>
      <Outlet />
    </PortalLayout>
  );
}

export function StaffGuard() {
  const { session, authReady } = useAuth();
  const location = useLocation();
  const lastLoggedRef = useRef<string | null>(null);

  const isStaff = session?.role === 'STAFF';
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/staff';
  const allowed = isStaff ? canAccessStaffRoute(session, normalizedPath) : false;

  useEffect(() => {
    if (!authReady || !session || !isStaff) return;
    if (!allowed && normalizedPath !== '/staff/access-denied') {
      const key = `${session.accountId}:${normalizedPath}`;
      if (lastLoggedRef.current !== key) {
        lastLoggedRef.current = key;
        recordAccessDenied(
          normalizedPath,
          `Staff group ${session.staffGroup} lacks permission for ${normalizedPath}.`
        );
      }
    } else {
      lastLoggedRef.current = null;
    }
  }, [authReady, session, isStaff, allowed, normalizedPath]);

  if (!authReady) {
    return <AuthLoadingScreen />;
  }

  if (!session) {
    return <Navigate to="/login?portal=staff" state={{ from: location.pathname }} replace />;
  }

  if (session.role !== 'STAFF') {
    return <Navigate to="/student" replace />;
  }

  if (!allowed && normalizedPath !== '/staff/access-denied') {
    return (
      <PortalLayout>
        <StaffAccessDenied />
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <Outlet />
    </PortalLayout>
  );
}
