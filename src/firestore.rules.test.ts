import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { createSeedDatabase } from './data/seed';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
const rulesText = fs.readFileSync(rulesPath, 'utf8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8')) as {
  entities: Record<string, { required?: string[]; properties?: Record<string, { type?: string }> }>;
  firestore: Record<string, { schema?: { $ref?: string } }>;
};

test('firestore.rules begins with global default-deny catch-all', () => {
  assert.match(rulesText, /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/);
});

test('firestore.rules forbids deletion of students, feeRecords, feePayments, results, and auditLogs', () => {
  const immutableCollections = ['students', 'feeRecords', 'feePayments', 'results', 'auditLogs'];
  for (const col of immutableCollections) {
    const idx = rulesText.indexOf(`match /${col}/`);
    assert.ok(idx !== -1, `Expected rule block for /${col}/`);
    const block = rulesText.slice(idx, idx + 1200);
    assert.match(
      block,
      /allow (update,\s*)?delete: if false;/,
      `Expected delete: if false in ${col}`
    );
  }
});

test('firestore.rules enforces append-only auditLogs and restricts audit reads to STUDENT_OFFICE', () => {
  assert.match(
    rulesText,
    /function canReadAudit\(\)\s*\{\s*return isStaff\(\) && staffRole\(\) == 'STUDENT_OFFICE';\s*\}/
  );
  assert.match(
    rulesText,
    /match \/auditLogs\/\{auditId\}[\s\S]*allow get, list: if isSignedIn\(\) && canReadAudit\(\);[\s\S]*allow update, delete: if false;/
  );
});

test('firestore.rules restricts student result reads to PUBLISHED and hides internal request messages', () => {
  assert.match(
    rulesText,
    /match \/results\/\{resultId\}[\s\S]*existing\(\)\.studentId == myStudentId\(\) && existing\(\)\.status == 'PUBLISHED'/
  );
  assert.match(
    rulesText,
    /match \/messages\/\{messageId\}[\s\S]*existing\(\)\.isInternal == false/
  );
});

test('firestore.rules isolates FINANCE writes to fees and EXAMINATION writes to results', () => {
  assert.match(
    rulesText,
    /function canWriteFees\(\)\s*\{\s*return isStaff\(\) && staffRole\(\) == 'FINANCE';\s*\}/
  );
  assert.match(
    rulesText,
    /function canWriteResults\(\)\s*\{\s*return isStaff\(\) && staffRole\(\) == 'EXAMINATION';\s*\}/
  );
  assert.doesNotMatch(rulesText, /match \/results\/\{resultId\}[\s\S]{0,600}canWriteFees\(\)/);
  assert.doesNotMatch(rulesText, /match \/feePayments\/\{paymentId\}[\s\S]{0,600}canWriteResults\(\)/);
});

test('firestore.rules validates all Dirty Dozen schema guards with hasAll and hasOnly', () => {
  const validators = [
    'isValidUserAccount',
    'isValidStudent',
    'isValidFeeRecord',
    'isValidFeePayment',
    'isValidResult',
    'isValidCourseResult',
    'isValidRequest',
    'isValidRequestMessage',
    'isValidDocument',
    'isValidScholarship',
    'isValidScholarshipRequirement',
    'isValidStudentScholarship',
    'isValidScholarshipDocument',
    'isValidNotification',
    'isValidAuditLog',
    'isValidExportLog',
  ];

  for (const fn of validators) {
    assert.ok(rulesText.includes(`function ${fn}(data)`), `Missing validator ${fn}`);
    const body = rulesText.slice(rulesText.indexOf(`function ${fn}(data)`), rulesText.indexOf(`function ${fn}(data)`) + 1400);
    assert.ok(body.includes('data.keys().hasAll('), `${fn} must check hasAll`);
    assert.ok(body.includes('data.keys().hasOnly('), `${fn} must check hasOnly`);
  }
});

test('all seeded money values are whole-rupee integers and enrollment numbers are unique document IDs', () => {
  const seed = createSeedDatabase();
  const enrollments = new Set<string>();
  for (const stu of seed.students) {
    assert.ok(!enrollments.has(stu.enrollmentNumber), `Duplicate enrollment ${stu.enrollmentNumber}`);
    enrollments.add(stu.enrollmentNumber);
    assert.match(stu.enrollmentNumber, /^AVU-DEMO-\d{2}-[A-Z]+-\d{3}$/);
  }
  for (const rec of seed.feeRecords) {
    assert.equal(Number.isInteger(rec.totalAmountInr), true);
  }
  for (const pay of seed.feePayments) {
    assert.equal(Number.isInteger(pay.amountInr), true);
    assert.ok(pay.amountInr > 0);
  }
  for (const sch of seed.scholarships) {
    assert.equal(Number.isInteger(sch.awardAmountInr), true);
  }
});

test('firebase-blueprint.json references valid entities across all 20 Firestore paths', () => {
  const paths = Object.keys(blueprint.firestore);
  assert.ok(paths.includes('/users/{uid}'));
  assert.ok(paths.includes('/students/{enrollmentNo}'));
  assert.ok(paths.includes('/results/{resultId}/courses/{courseCode}'));
  assert.ok(paths.includes('/requests/{requestId}/messages/{messageId}'));
  assert.ok(paths.includes('/scholarships/{scholarshipId}/requirements/{requirementId}'));

  for (const [colPath, entry] of Object.entries(blueprint.firestore)) {
    const ref = entry.schema?.$ref ?? '';
    const entityName = ref.replace('#/entities/', '');
    assert.ok(
      Boolean(blueprint.entities[entityName]),
      `Path ${colPath} references missing entity ${entityName}`
    );
  }
});
