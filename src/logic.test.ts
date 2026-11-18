import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_FAILED_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
  checkStaffRouteAccess,
  getCurrentSession,
  requireStudentSession,
  signIn,
  signOut,
} from './auth/auth';
import {
  STAFF_GROUP_PERMISSIONS,
  canAccessStaffRoute,
  getPermissionsForRole,
  hasPermission,
} from './auth/permissions';
import { db } from './db/db';
import { loadDatabase, resetDatabaseForTests, setSimulatedDelayMs } from './db/storage';
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

setSimulatedDelayMs(0);

test('password hashing stores non-plaintext hash and verifies accurately', () => {
  const hash = hashPassword('DemoStudent123!');
  assert.notEqual(hash, 'DemoStudent123!');
  assert.ok(hash.startsWith('sha256$'));
  assert.equal(verifyPassword('DemoStudent123!', hash), true);
  assert.equal(verifyPassword('WrongPass', hash), false);

  const seeded = resetDatabaseForTests();
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
    studentId: 'stu-1',
    academicYearId: 'ay-2026-27',
    totalAmountInr: 145000,
    dueDate: '2026-11-30',
  };

  const summary = deriveFeeSummary(feeRecord, [
    {
      id: 'p1',
      feeRecordId: 'f1',
      studentId: 'stu-1',
      amountInr: 72500,
      paidAt: '2026-07-18',
      mode: 'NEFT',
      referenceNumber: 'REF1',
      status: 'VERIFIED',
    },
    {
      id: 'p2',
      feeRecordId: 'f1',
      studentId: 'stu-1',
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

test('Aarav Mehta seed data matches exact specification including hidden DRAFT semester 5 result', async () => {
  resetDatabaseForTests();
  const signInRes = await signIn('student.demo@example.com', 'DemoStudent123!');
  assert.equal(signInRes.ok, true);
  assert.equal(signInRes.redirectTo, '/student');

  const dash = await db.getStudentDashboardData();
  assert.equal(dash.student.enrollmentNumber, 'AVU-DEMO-24-CSE-001');
  assert.equal(dash.student.currentSemester, 5);
  assert.equal(dash.feeSummary.totalAmountInr, 145000);
  assert.equal(dash.feeSummary.verifiedPaidInr, 72500);
  assert.equal(dash.feeSummary.status, 'PARTIAL');
  assert.equal(dash.latestPublishedResult?.semesterNumber, 4);
  assert.equal(dash.latestPublishedResult?.sgpa, 7.83);
  assert.equal(dash.cgpa, 7.86);
  assert.equal(dash.openRequestsCount, 2);
  assert.equal(dash.attentionDocuments.length, 1);
  assert.equal(dash.attentionDocuments[0].reviewerNote, 'Bank proof - image is unclear');
  assert.equal(dash.unreadNotificationsCount, 4);

  // Student must never query another student's data
  assert.throws(() => requireStudentSession('stu-2'), /Access denied/);
  await signOut();
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

test('login validation, generic error for unknown/bad password, and 5-attempt rate limiting', async () => {
  resetDatabaseForTests();
  const invalidEmail = await signIn('not-an-email', 'anything');
  assert.equal(invalidEmail.ok, false);
  assert.equal(invalidEmail.fieldError, 'Enter a valid email address.');

  const baseTime = 1_700_000_000_000;
  const wrongPass = await signIn('student.demo@example.com', 'Wrong123!', baseTime);
  const unknownUser = await signIn('nobody@example.com', 'Wrong123!', baseTime);
  assert.equal(wrongPass.error, 'Email or password is incorrect.');
  assert.equal(unknownUser.error, 'Email or password is incorrect.');

  // Trigger 5 failed attempts on finance.demo@example.com
  for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
    const r = await signIn('finance.demo@example.com', 'BadPassword', baseTime + i * 1000);
    assert.equal(r.error, 'Email or password is incorrect.');
  }

  // 6th attempt within 15 minutes is rate-limited even with correct password
  const limited = await signIn('finance.demo@example.com', 'DemoStaff123!', baseTime + 10_000);
  assert.equal(limited.ok, false);
  assert.match(limited.error ?? '', /^Too many sign-in attempts\. Try again in about \d+ minutes\.$/);

  // After 15 minutes window passes, sign-in succeeds
  const afterWindow = await signIn(
    'finance.demo@example.com',
    'DemoStaff123!',
    baseTime + RATE_LIMIT_WINDOW_MS + 60_000
  );
  assert.equal(afterWindow.ok, true);
  assert.equal(afterWindow.redirectTo, '/staff');
  await signOut();
});

test('staff RBAC enforces least-privilege permissions and route checks', async () => {
  resetDatabaseForTests();

  // Finance staff
  const fin = await signIn('finance.demo@example.com', 'DemoStaff123!');
  assert.equal(fin.ok, true);
  assert.equal(canAccessStaffRoute(fin.session, '/staff/fees'), true);
  assert.equal(canAccessStaffRoute(fin.session, '/staff/results'), false);
  assert.equal(canAccessStaffRoute(fin.session, '/staff/documents'), false);
  assert.equal(checkStaffRouteAccess('/staff/results').allowed, false);
  await signOut();

  // Examination staff
  const exam = await signIn('exam.demo@example.com', 'DemoStaff123!');
  assert.equal(exam.ok, true);
  assert.equal(canAccessStaffRoute(exam.session, '/staff/results'), true);
  assert.equal(canAccessStaffRoute(exam.session, '/staff/fees'), false);
  assert.equal(hasPermission(exam.session, 'results.publish'), true);
  assert.equal(hasPermission(exam.session, 'fees.read'), false);
  await signOut();

  // Student Office staff search
  const so = await signIn('staff.demo@example.com', 'DemoStaff123!');
  assert.equal(so.ok, true);
  assert.deepEqual(
    getPermissionsForRole('STAFF', 'STUDENT_OFFICE'),
    STAFF_GROUP_PERMISSIONS.STUDENT_OFFICE
  );
  const searchRes = await db.searchStudents('AVU-DEMO-24-CSE-001');
  assert.equal(searchRes.rows.length, 1);
  assert.equal(searchRes.rows[0].fullName, 'Aarav Mehta');
  await signOut();
  assert.equal(getCurrentSession(), null);
});

test('search query validation enforces 64 char limit and audit logs never store passwords', () => {
  assert.equal(validateEmail('student.demo@example.com'), true);
  assert.equal(validateEmail('bad@'), false);
  assert.equal(sanitizeSearchQuery('Aarav').valid, true);
  assert.equal(sanitizeSearchQuery('x'.repeat(65)).valid, false);

  const state = loadDatabase();
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
