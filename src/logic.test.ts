import assert from 'node:assert/strict';
import test from 'node:test';
import {
  STAFF_GROUP_PERMISSIONS,
  canAccessStaffRoute,
  getPermissionsForRole,
  getPortalHomeRoute,
  hasPermission,
} from './auth/permissions';
import {
  MAX_FAILED_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
  clearFailedAttempts,
  getRateLimitStatus,
  recordFailedAttempt,
  resetRateLimitsForTests,
} from './auth/rateLimit';
import { createSeedDatabase } from './data/seed';
import type { SessionUser } from './types/domain';
import {
  computeCGPA,
  computeSGPA,
  deriveFeeSummary,
  filterVisibleResultsForStudent,
  sanitizeSearchQuery,
  validateEmail,
} from './utils/calculations';
import { hashPassword, verifyPassword } from './utils/crypto';
import { formatDate, formatINR, getStatusDisplay } from './utils/format';

test('password hashing stores non-plaintext hash and verifies accurately', () => {
  const hash = hashPassword('DemoStudent123!');
  assert.notEqual(hash, 'DemoStudent123!');
  assert.ok(hash.startsWith('sha256$'));
  assert.equal(verifyPassword('DemoStudent123!', hash), true);
  assert.equal(verifyPassword('WrongPass', hash), false);

  const seeded = createSeedDatabase();
  for (const acc of seeded.userAccounts) {
    assert.ok(acc.passwordHash.startsWith('sha256$'));
    assert.ok(!acc.passwordHash.includes('DemoStudent123!'));
    assert.ok(!acc.passwordHash.includes('DemoStaff123!'));
  }
});

test('formatting helpers format INR in en-IN and dates like 15 Nov 2026', () => {
  assert.equal(formatINR(145000), '₹1,45,000');
  assert.equal(formatINR(72500), '₹72,500');
  assert.equal(formatDate('2026-11-15'), '15 Nov 2026');
  assert.equal(getStatusDisplay('WAITING_FOR_STUDENT').label, 'Waiting for student');
  assert.equal(getStatusDisplay('WAITING_FOR_STUDENT').tone, 'amber');
  assert.equal(getStatusDisplay('PAID').tone, 'green');
  assert.equal(getStatusDisplay('REJECTED').tone, 'red');
});

test('fee status derives strictly from VERIFIED payments and ignores PENDING payments', () => {
  const feeRecord = {
    id: 'f1',
    studentId: 'AVU-DEMO-24-CSE-001',
    academicYearId: 'ay-2026-27',
    totalAmountInr: 145000,
    dueDate: '2026-11-30',
  };

  const summary = deriveFeeSummary(feeRecord, [
    {
      id: 'p1',
      feeRecordId: 'f1',
      studentId: 'AVU-DEMO-24-CSE-001',
      amountInr: 72500,
      paidAt: '2026-07-18',
      mode: 'NEFT',
      referenceNumber: 'REF1',
      status: 'VERIFIED',
    },
    {
      id: 'p2',
      feeRecordId: 'f1',
      studentId: 'AVU-DEMO-24-CSE-001',
      amountInr: 72500,
      paidAt: '2026-11-12',
      mode: 'UPI',
      referenceNumber: 'REF2',
      status: 'PENDING',
    },
  ]);

  assert.equal(summary.verifiedPaidInr, 72500);
  assert.equal(summary.pendingAmountInr, 72500);
  assert.equal(summary.balanceInr, 72500);
  assert.equal(summary.status, 'PARTIAL');
});

test('Aarav Mehta seed data matches exact specification including hidden DRAFT semester 5 result', () => {
  const seed = createSeedDatabase();
  const aarav = seed.students.find((s) => s.enrollmentNumber === 'AVU-DEMO-24-CSE-001');
  assert.ok(aarav);
  assert.equal(aarav.fullName, 'Aarav Mehta');
  assert.equal(aarav.currentSemester, 5);

  const feeRec = seed.feeRecords.find(
    (f) => f.studentId === aarav.id && f.academicYearId === aarav.currentAcademicYearId
  );
  assert.ok(feeRec);
  const payments = seed.feePayments.filter((p) => p.feeRecordId === feeRec.id);
  const summary = deriveFeeSummary(feeRec, payments);
  assert.equal(summary.totalAmountInr, 145000);
  assert.equal(summary.verifiedPaidInr, 72500);
  assert.equal(summary.pendingAmountInr, 35000);
  assert.equal(summary.balanceInr, 72500);
  assert.equal(summary.status, 'PARTIAL');

  const aaravResults = seed.results.filter((r) => r.studentId === aarav.id);
  const visible = filterVisibleResultsForStudent(aaravResults);
  assert.equal(visible.length, 4);
  assert.equal(visible[visible.length - 1].semesterNumber, 4);
  assert.equal(visible[visible.length - 1].sgpa, 7.83);
  assert.equal(computeCGPA(visible), 7.86);

  const sem5 = aaravResults.find((r) => r.semesterNumber === 5);
  assert.equal(sem5?.status, 'DRAFT');

  const aaravReqs = seed.requests.filter((r) => r.studentId === aarav.id);
  const openCount = aaravReqs.filter((r) => r.status !== 'RESOLVED' && r.status !== 'CLOSED').length;
  assert.equal(openCount, 2);

  const attentionDocs = seed.documents.filter(
    (d) => d.studentId === aarav.id && (d.status === 'REJECTED' || d.status === 'REPLACEMENT_REQUIRED')
  );
  assert.equal(attentionDocs.length, 1);
  assert.equal(attentionDocs[0].reviewerNote, 'Bank proof - image is unclear');

  const unreadNotifs = seed.notifications.filter(
    (n) => n.userAccountId === 'user-stu-1' && !n.isRead
  );
  assert.equal(unreadNotifs.length, 4);
});

test('filterVisibleResultsForStudent hides DRAFT, UNDER_REVIEW, and APPROVED results', () => {
  const sample = [
    { id: '1', studentId: 's1', semesterNumber: 1, academicYearId: 'ay', status: 'PUBLISHED' as const, courses: [], sgpa: 8 },
    { id: '2', studentId: 's1', semesterNumber: 2, academicYearId: 'ay', status: 'DRAFT' as const, courses: [], sgpa: 9 },
    { id: '3', studentId: 's1', semesterNumber: 3, academicYearId: 'ay', status: 'UNDER_REVIEW' as const, courses: [], sgpa: 9 },
    { id: '4', studentId: 's1', semesterNumber: 4, academicYearId: 'ay', status: 'APPROVED' as const, courses: [], sgpa: 9 },
  ];
  const visible = filterVisibleResultsForStudent(sample);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].id, '1');
});

test('rate limiter locks after 5 failed attempts in 15 minutes and resets after window or success', () => {
  resetRateLimitsForTests();
  const email = 'finance.demo@example.com';
  const baseTime = 1_700_000_000_000;

  for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
    assert.equal(getRateLimitStatus(email, baseTime + i * 1000).limited, false);
    recordFailedAttempt(email, baseTime + i * 1000);
  }

  const locked = getRateLimitStatus(email, baseTime + 10_000);
  assert.equal(locked.limited, true);
  assert.ok(locked.minutesRemaining >= 1 && locked.minutesRemaining <= 15);

  const expired = getRateLimitStatus(email, baseTime + RATE_LIMIT_WINDOW_MS + 60_000);
  assert.equal(expired.limited, false);

  clearFailedAttempts(email);
  assert.equal(getRateLimitStatus(email, baseTime + 10_000).limited, false);
});

test('staff RBAC enforces least-privilege permissions and portal routes without Super Admin', () => {
  assert.equal(getPortalHomeRoute('STUDENT'), '/student');
  assert.equal(getPortalHomeRoute('STAFF'), '/staff');

  const makeStaff = (staffGroup: SessionUser['staffGroup']): SessionUser => ({
    accountId: `uid-${staffGroup}`,
    email: 'staff@example.com',
    fullName: 'Staff User',
    role: 'STAFF',
    staffGroup,
    permissions: getPermissionsForRole('STAFF', staffGroup),
  });

  const finance = makeStaff('FINANCE');
  assert.equal(canAccessStaffRoute(finance, '/staff/fees'), true);
  assert.equal(canAccessStaffRoute(finance, '/staff/results'), false);
  assert.equal(canAccessStaffRoute(finance, '/staff/documents'), false);

  const exam = makeStaff('EXAMINATION');
  assert.equal(canAccessStaffRoute(exam, '/staff/results'), true);
  assert.equal(canAccessStaffRoute(exam, '/staff/fees'), false);
  assert.equal(hasPermission(exam, 'results.publish'), true);
  assert.equal(hasPermission(exam, 'fees.read'), false);

  const so = makeStaff('STUDENT_OFFICE');
  assert.deepEqual(so.permissions, STAFF_GROUP_PERMISSIONS.STUDENT_OFFICE);
  assert.equal(hasPermission(so, 'audit.read'), true);
  assert.equal(hasPermission(so, 'fees.write'), false);
  assert.equal(hasPermission(so, 'results.publish'), false);
});

test('search query validation enforces 64 char limit and audit logs never store passwords', () => {
  assert.equal(validateEmail('student.demo@example.com'), true);
  assert.equal(validateEmail('bad@'), false);
  assert.equal(sanitizeSearchQuery('Aarav').valid, true);
  assert.equal(sanitizeSearchQuery('x'.repeat(65)).valid, false);

  const state = createSeedDatabase();
  for (const log of state.auditLogs) {
    assert.ok(!log.detail.includes('DemoStudent123!'));
    assert.ok(!log.detail.includes('DemoStaff123!'));
  }
});

test('SGPA and CGPA calculations work accurately', () => {
  const sgpa = computeSGPA([
    { courseCode: 'C1', courseTitle: 'A', credits: 4, marksObtained: 85, maxMarks: 100, grade: 'A+', gradePoint: 9 },
    { courseCode: 'C2', courseTitle: 'B', credits: 4, marksObtained: 75, maxMarks: 100, grade: 'A', gradePoint: 8 },
  ]);
  assert.equal(sgpa, 8.5);
  const cgpa = computeCGPA([
    {
      id: 'r1',
      studentId: 's1',
      semesterNumber: 1,
      academicYearId: 'ay1',
      status: 'PUBLISHED',
      courses: [
        { courseCode: 'C1', courseTitle: 'A', credits: 4, marksObtained: 85, maxMarks: 100, grade: 'A+', gradePoint: 9 },
      ],
      sgpa: 9,
    },
    {
      id: 'r2',
      studentId: 's1',
      semesterNumber: 2,
      academicYearId: 'ay1',
      status: 'DRAFT',
      courses: [
        { courseCode: 'C2', courseTitle: 'B', credits: 4, marksObtained: 50, maxMarks: 100, grade: 'B', gradePoint: 6 },
      ],
      sgpa: 6,
    },
  ]);
  assert.equal(cgpa, 9);
});
