import React, { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { recordAccessDenied } from '../auth/auth';
import { canAccessStaffRoute } from '../auth/permissions';
import { useAuth } from '../context/AuthContext';
import { StaffAccessDenied } from '../pages/staff/StaffAccessDenied';
import { PortalLayout } from './PortalLayout';

export function StudentGuard() {
  const { session } = useAuth();
  const location = useLocation();

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
  const { session } = useAuth();
  const location = useLocation();
  const lastLoggedRef = useRef<string | null>(null);

  const isStaff = session?.role === 'STAFF';
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/staff';
  const allowed = isStaff ? canAccessStaffRoute(session, normalizedPath) : false;

  useEffect(() => {
    if (!session || !isStaff) return;
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
  }, [session, isStaff, allowed, normalizedPath]);

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
