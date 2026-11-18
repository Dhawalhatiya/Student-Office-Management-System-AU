import { deleteApp, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { createSeedDatabase, DEMO_ACCOUNTS_DISPLAY } from '../data/seed';
import { firebaseAuth, firestoreDb, getFirebaseConfig } from '../firebase/config';
import { OperationType, handleFirestoreError } from '../firebase/errors';
import type { StaffGroup, UserRole } from '../types/domain';

export interface SeedResult {
  alreadySeeded: boolean;
  message: string;
  counts?: {
    users: number;
    students: number;
    feeRecords: number;
    feePayments: number;
    results: number;
    requests: number;
    documents: number;
    scholarships: number;
    notifications: number;
  };
}

function isDevEnvironment(): boolean {
  return Boolean(import.meta.env?.DEV);
}

async function ensureDemoAuthUser(
  secondaryAuth: ReturnType<typeof getAuth>,
  email: string,
  password: string
): Promise<string> {
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    return cred.user.uid;
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: unknown }).code)
        : '';
    if (code === 'auth/email-already-in-use') {
      const cred = await signInWithEmailAndPassword(secondaryAuth, email, password);
      return cred.user.uid;
    }
    throw err;
  }
}

async function commitOperationsInBatches(
  ops: Array<(batch: ReturnType<typeof writeBatch>) => void>
): Promise<void> {
  const CHUNK = 350;
  for (let i = 0; i < ops.length; i += CHUNK) {
    const batch = writeBatch(firestoreDb);
    const slice = ops.slice(i, i + CHUNK);
    for (const op of slice) {
      op(batch);
    }
    await batch.commit();
  }
}

export async function checkIsDemoDataSeeded(): Promise<boolean> {
  try {
    const snap = await getDoc(doc(firestoreDb, 'meta', 'seedStatus'));
    return snap.exists() && snap.data()?.seeded === true;
  } catch {
    return false;
  }
}

/**
 * Development-only one-time demo data loader.
 * Must be executed while signed in as an authorized developer/STUDENT_OFFICE admin.
 */
export async function seedDemoDataOnce(): Promise<SeedResult> {
  if (!isDevEnvironment()) {
    throw new Error('Demo data seeding is only permitted in development mode.');
  }

  const caller = firebaseAuth.currentUser;
  if (!caller) {
    throw new Error('Admin sign-in is required before loading demo data.');
  }

  let alreadySeeded = false;
  try {
    const seedMetaSnap = await getDoc(doc(firestoreDb, 'meta', 'seedStatus'));
    alreadySeeded = seedMetaSnap.exists() && seedMetaSnap.data()?.seeded === true;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'meta/seedStatus');
  }

  if (alreadySeeded) {
    return {
      alreadySeeded: true,
      message: 'Demo data has already been loaded into Firestore.',
    };
  }

  // Provision or resolve the 5 demo Firebase Auth users on a secondary app instance
  // so the caller's primary Auth session stays intact.
  const secondaryApp = initializeApp(getFirebaseConfig(), `avu-dev-seeder-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  const demoUidMap = new Map<string, string>();

  try {
    for (const acc of DEMO_ACCOUNTS_DISPLAY) {
      const uid = await ensureDemoAuthUser(secondaryAuth, acc.email, acc.password);
      demoUidMap.set(acc.email.toLowerCase(), uid);
    }
    await firebaseSignOut(secondaryAuth);
  } finally {
    await deleteApp(secondaryApp);
  }

  const seed = createSeedDatabase();
  const stuIdByInternalId = new Map(seed.students.map((s) => [s.id, s.enrollmentNumber]));
  const staffById = new Map(seed.staffAccounts.map((st) => [st.id, st]));

  // Map old seed userAccountId ('user-stu-1', 'user-staff-1'..) -> real Firebase Auth UID
  const realUidBySeedAccountId = new Map<string, string>();
  for (const acc of seed.userAccounts) {
    const realUid = demoUidMap.get(acc.email.toLowerCase());
    if (realUid) {
      realUidBySeedAccountId.set(acc.id, realUid);
    }
  }

  const parentOps: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
  const subcollectionOps: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

  // 1. users/{uid} for the 5 demo users
  const demoDefinitions: Array<{
    email: string;
    name: string;
    role: UserRole;
    staffRole: StaffGroup | null;
    studentId: string | null;
    designation: string | null;
  }> = [
    {
      email: 'student.demo@example.com',
      name: 'Aarav Mehta',
      role: 'STUDENT',
      staffRole: null,
      studentId: 'AVU-DEMO-24-CSE-001',
      designation: null,
    },
    {
      email: 'staff.demo@example.com',
      name: 'Ritu Kapoor',
      role: 'STAFF',
      staffRole: 'STUDENT_OFFICE',
      studentId: null,
      designation: 'Senior Administrative Officer',
    },
    {
      email: 'finance.demo@example.com',
      name: 'Karan Malhotra',
      role: 'STAFF',
      staffRole: 'FINANCE',
      studentId: null,
      designation: 'Accounts & Fee Officer',
    },
    {
      email: 'exam.demo@example.com',
      name: 'Neha Iyer',
      role: 'STAFF',
      staffRole: 'EXAMINATION',
      studentId: null,
      designation: 'Controller of Examinations Representative',
    },
    {
      email: 'academic.demo@example.com',
      name: 'Anil Verma',
      role: 'STAFF',
      staffRole: 'ACADEMIC',
      studentId: null,
      designation: 'Academic Coordinator',
    },
  ];

  for (const def of demoDefinitions) {
    const uid = demoUidMap.get(def.email);
    if (!uid) continue;
    parentOps.push((b) =>
      b.set(doc(firestoreDb, 'users', uid), {
        name: def.name,
        role: def.role,
        staffRole: def.staffRole,
        studentId: def.studentId,
        email: def.email,
        designation: def.designation,
      })
    );
  }

  // 2. departments, programmes, academicYears
  for (const d of seed.departments) {
    parentOps.push((b) =>
      b.set(doc(firestoreDb, 'departments', d.id), {
        code: d.code,
        name: d.name,
      })
    );
  }
  for (const p of seed.programmes) {
    parentOps.push((b) =>
      b.set(doc(firestoreDb, 'programmes', p.id), {
        code: p.code,
        name: p.name,
        departmentId: p.departmentId,
        durationSemesters: Math.round(p.durationSemesters),
      })
    );
  }
  for (const ay of seed.academicYears) {
    parentOps.push((b) =>
      b.set(doc(firestoreDb, 'academicYears', ay.id), {
        label: ay.label,
        startYear: Math.round(ay.startYear),
        endYear: Math.round(ay.endYear),
        isCurrent: ay.isCurrent,
      })
    );
  }

  // 3. students keyed by enrollmentNumber
  for (const stu of seed.students) {
    parentOps.push((b) =>
      b.set(doc(firestoreDb, 'students', stu.enrollmentNumber), {
        enrollmentNumber: stu.enrollmentNumber,
        fullName: stu.fullName,
        dateOfBirth: stu.dateOfBirth,
        email: stu.email,
        phone: stu.phone,
        departmentId: stu.departmentId,
        programmeId: stu.programmeId,
        batchYear: Math.round(stu.batchYear),
        currentSemester: Math.round(stu.currentSemester),
        currentAcademicYearId: stu.currentAcademicYearId,
        enrollmentStatus: stu.enrollmentStatus,
        address: stu.address,
      })
    );
  }

  // 4. feeRecords and feePayments (whole-rupee integers, studentId = enrollmentNumber)
  for (const rec of seed.feeRecords) {
    const enrollmentNo = stuIdByInternalId.get(rec.studentId)!;
    parentOps.push((b) =>
      b.set(doc(firestoreDb, 'feeRecords', rec.id), {
        studentId: enrollmentNo,
        academicYearId: rec.academicYearId,
        totalAmountInr: Math.round(rec.totalAmountInr),
        dueDate: rec.dueDate,
      })
    );
  }
  for (const pay of seed.feePayments) {
    const enrollmentNo = stuIdByInternalId.get(pay.studentId)!;
    parentOps.push((b) =>
      b.set(doc(firestoreDb, 'feePayments', pay.id), {
        feeRecordId: pay.feeRecordId,
        studentId: enrollmentNo,
        amountInr: Math.round(pay.amountInr),
        paidAt: pay.paidAt,
        mode: pay.mode,
        referenceNumber: pay.referenceNumber,
        status: pay.status,
      })
    );
  }

  // 5. results + courses subcollection
  for (const res of seed.results) {
    const enrollmentNo = stuIdByInternalId.get(res.studentId)!;
    parentOps.push((b) =>
      b.set(doc(firestoreDb, 'results', res.id), {
        studentId: enrollmentNo,
        semesterNumber: Math.round(res.semesterNumber),
        academicYearId: res.academicYearId,
        status: res.status,
        sgpa: res.sgpa,
        ...(res.publishedAt ? { publishedAt: res.publishedAt } : {}),
      })
    );
    for (const c of res.courses) {
      subcollectionOps.push((b) =>
        b.set(doc(firestoreDb, 'results', res.id, 'courses', c.courseCode), {
          courseCode: c.courseCode,
          courseTitle: c.courseTitle,
          credits: Math.round(c.credits),
          marksObtained: Math.round(c.marksObtained),
          maxMarks: Math.round(c.maxMarks),
          grade: c.grade,
          gradePoint: Math.round(c.gradePoint),
        })
      );
    }
  }

  // 6. requests + messages subcollection
  for (const req of seed.requests) {
    const enrollmentNo = stuIdByInternalId.get(req.studentId)!;
    const assignee = req.assignedStaffId ? staffById.get(req.assignedStaffId) : undefined;
    parentOps.push((b) =>
      b.set(doc(firestoreDb, 'requests', req.id), {
        ticketNumber: req.ticketNumber,
        studentId: enrollmentNo,
        subject: req.subject,
        category: req.category,
        priority: req.priority,
        status: req.status,
        ...(req.assignedStaffId ? { assignedStaffId: req.assignedStaffId } : {}),
        ...(assignee ? { assignedStaffName: assignee.fullName } : {}),
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
      })
    );
    for (const msg of req.messages) {
      subcollectionOps.push((b) =>
        b.set(doc(firestoreDb, 'requests', req.id, 'messages', msg.id), {
          requestId: req.id,
          senderName: msg.senderName,
          senderRole: msg.senderRole,
          isInternal: msg.isInternal,
          body: msg.body,
          sentAt: msg.sentAt,
        })
      );
    }
  }

  // 7. documents
  for (const d of seed.documents) {
    const enrollmentNo = stuIdByInternalId.get(d.studentId)!;
    parentOps.push((b) =>
      b.set(doc(firestoreDb, 'documents', d.id), {
        studentId: enrollmentNo,
        title: d.title,
        category: d.category,
        fileName: d.fileName,
        uploadedAt: d.uploadedAt,
        status: d.status,
        ...(d.reviewerNote ? { reviewerNote: d.reviewerNote } : {}),
      })
    );
  }

  // 8. scholarships + requirements subcollection, studentScholarships, scholarshipDocuments
  for (const sch of seed.scholarships) {
    parentOps.push((b) =>
      b.set(doc(firestoreDb, 'scholarships', sch.id), {
        name: sch.name,
        academicYearId: sch.academicYearId,
        awardAmountInr: Math.round(sch.awardAmountInr),
        summary: sch.summary,
      })
    );
    for (const reqItem of sch.requirements) {
      subcollectionOps.push((b) =>
        b.set(doc(firestoreDb, 'scholarships', sch.id, 'requirements', reqItem.id), {
          documentName: reqItem.documentName,
          description: reqItem.description,
          mandatory: reqItem.mandatory,
        })
      );
    }
  }
  for (const ss of seed.studentScholarships) {
    const enrollmentNo = stuIdByInternalId.get(ss.studentId)!;
    parentOps.push((b) =>
      b.set(doc(firestoreDb, 'studentScholarships', ss.id), {
        studentId: enrollmentNo,
        scholarshipId: ss.scholarshipId,
        status: ss.status,
        appliedAt: ss.appliedAt,
      })
    );
  }
  for (const sd of seed.scholarshipDocuments) {
    const enrollmentNo = stuIdByInternalId.get(sd.studentId)!;
    parentOps.push((b) =>
      b.set(doc(firestoreDb, 'scholarshipDocuments', sd.id), {
        studentScholarshipId: sd.studentScholarshipId,
        studentId: enrollmentNo,
        requirementId: sd.requirementId,
        fileName: sd.fileName,
        uploadedAt: sd.uploadedAt,
        status: sd.status,
      })
    );
  }

  // 9. notifications mapped to real Firebase Auth UIDs
  let seededNotificationsCount = 0;
  for (const n of seed.notifications) {
    const realUid = realUidBySeedAccountId.get(n.userAccountId);
    if (!realUid) continue;
    seededNotificationsCount += 1;
    parentOps.push((b) =>
      b.set(doc(firestoreDb, 'notifications', n.id), {
        userId: realUid,
        title: n.title,
        body: n.body,
        category: n.category,
        createdAt: n.createdAt,
        isRead: n.isRead,
        ...(n.linkPath ? { linkPath: n.linkPath } : {}),
      })
    );
  }

  // 10. auditLogs and exportLogs
  for (const log of seed.auditLogs) {
    const realUid = log.actorAccountId
      ? realUidBySeedAccountId.get(log.actorAccountId) ?? caller.uid
      : caller.uid;
    parentOps.push((b) =>
      b.set(doc(firestoreDb, 'auditLogs', log.id), {
        timestamp: log.timestamp,
        actorUid: realUid,
        actorEmail: log.actorEmail,
        actorRole: log.actorRole ?? 'STAFF',
        action: log.action,
        ...(log.targetRoute ? { targetRoute: log.targetRoute } : {}),
        detail: log.detail,
      })
    );
  }
  for (const exp of seed.reportExportLogs) {
    const staffUid = demoUidMap.get('staff.demo@example.com') ?? caller.uid;
    parentOps.push((b) =>
      b.set(doc(firestoreDb, 'exportLogs', exp.id), {
        exportedByUid: staffUid,
        reportType: exp.reportType,
        createdAt: exp.createdAt,
        rowCount: Math.round(exp.rowCount),
      })
    );
  }

  // 11. Seed marker committed last only after all parents & subcollections succeed
  const markerOps: Array<(batch: ReturnType<typeof writeBatch>) => void> = [
    (b) =>
      b.set(doc(firestoreDb, 'meta', 'seedStatus'), {
        seeded: true,
        seededAt: new Date().toISOString(),
        seededByEmail: caller.email ?? 'dev-admin@example.com',
      }),
  ];

  try {
    await commitOperationsInBatches(parentOps);
    await commitOperationsInBatches(subcollectionOps);
    await commitOperationsInBatches(markerOps);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'batch-seed');
  }

  return {
    alreadySeeded: false,
    message: 'Fictional demo data and 5 Firebase Auth demo accounts loaded successfully.',
    counts: {
      users: demoUidMap.size,
      students: seed.students.length,
      feeRecords: seed.feeRecords.length,
      feePayments: seed.feePayments.length,
      results: seed.results.length,
      requests: seed.requests.length,
      documents: seed.documents.length,
      scholarships: seed.scholarships.length,
      notifications: seededNotificationsCount,
    },
  };
}
