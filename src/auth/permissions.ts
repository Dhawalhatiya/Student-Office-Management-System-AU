import type { Permission, SessionUser, StaffGroup, UserRole } from '../types/domain';

export const STAFF_GROUP_PERMISSIONS: Record<StaffGroup, Permission[]> = {
  STUDENT_OFFICE: [
    'students.read',
    'students.write',
    'fees.read',
    'results.read',
    'requests.read',
    'requests.manage',
    'documents.review',
    'scholarships.read',
    'scholarships.manage',
    'reports.export',
    'ai.assistant',
    'audit.read',
  ],
  FINANCE: [
    'students.read',
    'fees.read',
    'fees.write',
    'requests.read',
    'reports.export',
    'ai.assistant',
  ],
  EXAMINATION: [
    'students.read',
    'results.read',
    'results.write',
    'results.publish',
    'requests.read',
    'reports.export',
  ],
  ACADEMIC: [
    'students.read',
    'results.read',
    'scholarships.read',
    'requests.read',
    'reports.export',
  ],
};

export const STAFF_GROUP_LABELS: Record<StaffGroup, string> = {
  STUDENT_OFFICE: 'Student Office',
  FINANCE: 'Finance',
  EXAMINATION: 'Examination',
  ACADEMIC: 'Academic',
};

export function getPermissionsForRole(role: UserRole, staffGroup?: StaffGroup): Permission[] {
  if (role === 'STUDENT') {
    return [];
  }
  if (!staffGroup) {
    return [];
  }
  return [...STAFF_GROUP_PERMISSIONS[staffGroup]];
}

export function hasPermission(
  user: Pick<SessionUser, 'role' | 'permissions'> | null | undefined,
  permission: Permission
): boolean {
  if (!user || user.role !== 'STAFF') return false;
  return user.permissions.includes(permission);
}

export const STAFF_ROUTE_PERMISSIONS: Record<string, Permission | null> = {
  '/staff': null, // Any authenticated staff user
  '/staff/search': 'students.read',
  '/staff/students': 'students.write',
  '/staff/fees': 'fees.read',
  '/staff/results': 'results.read',
  '/staff/requests': 'requests.read',
  '/staff/documents': 'documents.review',
  '/staff/scholarships': 'scholarships.read',
  '/staff/reports': 'reports.export',
  '/staff/ai-assistant': 'ai.assistant',
  '/staff/notifications': null,
  '/staff/settings': null,
  '/staff/access-denied': null,
};

export function canAccessStaffRoute(
  user: SessionUser | null | undefined,
  pathname: string
): boolean {
  if (!user || user.role !== 'STAFF') return false;
  const normalized = pathname.replace(/\/+$/, '') || '/staff';
  if (!(normalized in STAFF_ROUTE_PERMISSIONS)) {
    return false;
  }
  const required = STAFF_ROUTE_PERMISSIONS[normalized];
  if (required === null) return true;
  return hasPermission(user, required);
}

export function getRequiredPermissionForRoute(pathname: string): Permission | null {
  const normalized = pathname.replace(/\/+$/, '') || '/staff';
  return STAFF_ROUTE_PERMISSIONS[normalized] ?? null;
}

export function getPortalHomeRoute(role: UserRole): string {
  return role === 'STAFF' ? '/staff' : '/student';
}

export function isStudentAllowedRoute(pathname: string): boolean {
  return pathname === '/student' || pathname.startsWith('/student/');
}

export function isStaffAllowedRoute(pathname: string): boolean {
  return pathname === '/staff' || pathname.startsWith('/staff/');
}
