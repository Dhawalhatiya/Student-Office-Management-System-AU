import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { deleteApp, initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, getFirestore, writeBatch } from 'firebase/firestore';
import { createSeedDatabase, DEMO_ACCOUNTS_DISPLAY } from '../src/data/seed';
import type { StaffGroup, UserRole } from '../src/types/domain';

interface AppletFirebaseConfig extends FirebaseOptions {
  firestoreDatabaseId?: string;
}

function loadConfig(): AppletFirebaseConfig {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  const fileConfig = fs.existsSync(configPath)
    ? (JSON.parse(fs.readFileSync(configPath, 'utf8')) as AppletFirebaseConfig)
    : {};

  return {
    apiKey: process.env.VITE_FIREBASE_API_KEY || fileConfig.apiKey,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || fileConfig.authDomain,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || fileConfig.projectId,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || fileConfig.storageBucket,
    messagingSenderId:
      process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fileConfig.messagingSenderId,
    appId: process.env.VITE_FIREBASE_APP_ID || fileConfig.appId,
    firestoreDatabaseId:
      process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || fileConfig.firestoreDatabaseId,
  };
}

async function ensureAuthUser(
  auth: ReturnType<typeof getAuth>,
  email: string,
  password: string
): Promise<string> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user.uid;
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: unknown }).code)
        : '';
    if (code === 'auth/email-already-in-use') {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return cred.user.uid;
    }
    throw err;
  }
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo data seeding script may only run in development environments.');
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error(
      'Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in your environment, or use the dev-only Load demo data button in the UI.'
    );
  }

  const config = loadConfig();
  const app = initializeApp(config, 'avu-cli-seeder');
  const auth = getAuth(app);
  const db = config.firestoreDatabaseId
    ? getFirestore(app, config.firestoreDatabaseId)
    : getFirestore(app);

  try {
    const callerCred = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    const marker = await getDoc(doc(db, 'meta', 'seedStatus'));
    if (marker.exists() && marker.data()?.seeded === true) {
      console.log('Demo data is already loaded in Firestore (meta/seedStatus.seeded == true).');
      return;
    }

    const secondaryApp = initializeApp(config, 'avu-cli-secondary');
    const secondaryAuth = getAuth(secondaryApp);
    const demoUidMap = new Map<string, string>();
    try {
      for (const acc of DEMO_ACCOUNTS_DISPLAY) {
        const uid = await ensureAuthUser(secondaryAuth, acc.email, acc.password);
        demoUidMap.set(acc.email.toLowerCase(), uid);
      }
      await signOut(secondaryAuth);
    } finally {
      await deleteApp(secondaryApp);
    }

    const seed = createSeedDatabase();
    const stuIdByInternalId = new Map(seed.students.map((s) => [s.id, s.enrollmentNumber]));
    const staffById = new Map(seed.staffAccounts.map((st) => [st.id, st]));
    const realUidBySeedAccountId = new Map<string, string>();
    for (const acc of seed.userAccounts) {
      const uid = demoUidMap.get(acc.email.toLowerCase());
      if (uid) realUidBySeedAccountId.set(acc.id, uid);
    }

    const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

    const demoUsers: Array<{
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

    for (const u of demoUsers) {
      const uid = demoUidMap.get(u.email);
      if (!uid) continue;
      ops.push((b) =>
        b.set(doc(db, 'users', uid), {
          name: u.name,
          role: u.role,
          staffRole: u.staffRole,
          studentId: u.studentId,
          email: u.email,
          designation: u.designation,
        })
      );
    }

    for (const d of seed.departments) {
      ops.push((b) => b.set(doc(db, 'departments', d.id), { code: d.code, name: d.name }));
    }
    for (const p of seed.programmes) {
      ops.push((b) =>
        b.set(doc(db, 'programmes', p.id), {
          code: p.code,
          name: p.name,
          departmentId: p.departmentId,
          durationSemesters: Math.round(p.durationSemesters),
        })
      );
    }
    for (const ay of seed.academicYears) {
      ops.push((b) =>
        b.set(doc(db, 'academicYears', ay.id), {
          label: ay.label,
          startYear: Math.round(ay.startYear),
          endYear: Math.round(ay.endYear),
          isCurrent: ay.isCurrent,
        })
      );
    }
    for (const stu of seed.students) {
      ops.push((b) =>
        b.set(doc(db, 'students', stu.enrollmentNumber), {
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
    for (const rec of seed.feeRecords) {
      ops.push((b) =>
        b.set(doc(db, 'feeRecords', rec.id), {
          studentId: stuIdByInternalId.get(rec.studentId)!,
          academicYearId: rec.academicYearId,
          totalAmountInr: Math.round(rec.totalAmountInr),
          dueDate: rec.dueDate,
        })
      );
    }
    for (const pay of seed.feePayments) {
      ops.push((b) =>
        b.set(doc(db, 'feePayments', pay.id), {
          feeRecordId: pay.feeRecordId,
          studentId: stuIdByInternalId.get(pay.studentId)!,
          amountInr: Math.round(pay.amountInr),
          paidAt: pay.paidAt,
          mode: pay.mode,
          referenceNumber: pay.referenceNumber,
          status: pay.status,
        })
      );
    }
    for (const res of seed.results) {
      ops.push((b) =>
        b.set(doc(db, 'results', res.id), {
          studentId: stuIdByInternalId.get(res.studentId)!,
          semesterNumber: Math.round(res.semesterNumber),
          academicYearId: res.academicYearId,
          status: res.status,
          sgpa: res.sgpa,
          ...(res.publishedAt ? { publishedAt: res.publishedAt } : {}),
        })
      );
      for (const c of res.courses) {
        ops.push((b) =>
          b.set(doc(db, 'results', res.id, 'courses', c.courseCode), {
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
    for (const req of seed.requests) {
      const assignee = req.assignedStaffId ? staffById.get(req.assignedStaffId) : undefined;
      ops.push((b) =>
        b.set(doc(db, 'requests', req.id), {
          ticketNumber: req.ticketNumber,
          studentId: stuIdByInternalId.get(req.studentId)!,
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
        ops.push((b) =>
          b.set(doc(db, 'requests', req.id, 'messages', msg.id), {
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
    for (const d of seed.documents) {
      ops.push((b) =>
        b.set(doc(db, 'documents', d.id), {
          studentId: stuIdByInternalId.get(d.studentId)!,
          title: d.title,
          category: d.category,
          fileName: d.fileName,
          uploadedAt: d.uploadedAt,
          status: d.status,
          ...(d.reviewerNote ? { reviewerNote: d.reviewerNote } : {}),
        })
      );
    }
    for (const sch of seed.scholarships) {
      ops.push((b) =>
        b.set(doc(db, 'scholarships', sch.id), {
          name: sch.name,
          academicYearId: sch.academicYearId,
          awardAmountInr: Math.round(sch.awardAmountInr),
          summary: sch.summary,
        })
      );
      for (const reqItem of sch.requirements) {
        ops.push((b) =>
          b.set(doc(db, 'scholarships', sch.id, 'requirements', reqItem.id), {
            documentName: reqItem.documentName,
            description: reqItem.description,
            mandatory: reqItem.mandatory,
          })
        );
      }
    }
    for (const ss of seed.studentScholarships) {
      ops.push((b) =>
        b.set(doc(db, 'studentScholarships', ss.id), {
          studentId: stuIdByInternalId.get(ss.studentId)!,
          scholarshipId: ss.scholarshipId,
          status: ss.status,
          appliedAt: ss.appliedAt,
        })
      );
    }
    for (const sd of seed.scholarshipDocuments) {
      ops.push((b) =>
        b.set(doc(db, 'scholarshipDocuments', sd.id), {
          studentScholarshipId: sd.studentScholarshipId,
          studentId: stuIdByInternalId.get(sd.studentId)!,
          requirementId: sd.requirementId,
          fileName: sd.fileName,
          uploadedAt: sd.uploadedAt,
          status: sd.status,
        })
      );
    }
    for (const n of seed.notifications) {
      const uid = realUidBySeedAccountId.get(n.userAccountId);
      if (!uid) continue;
      ops.push((b) =>
        b.set(doc(db, 'notifications', n.id), {
          userId: uid,
          title: n.title,
          body: n.body,
          category: n.category,
          createdAt: n.createdAt,
          isRead: n.isRead,
          ...(n.linkPath ? { linkPath: n.linkPath } : {}),
        })
      );
    }
    for (const log of seed.auditLogs) {
      ops.push((b) =>
        b.set(doc(db, 'auditLogs', log.id), {
          timestamp: log.timestamp,
          actorUid: log.actorAccountId
            ? realUidBySeedAccountId.get(log.actorAccountId) ?? callerCred.user.uid
            : callerCred.user.uid,
          actorEmail: log.actorEmail,
          actorRole: log.actorRole ?? 'STAFF',
          action: log.action,
          ...(log.targetRoute ? { targetRoute: log.targetRoute } : {}),
          detail: log.detail,
        })
      );
    }
    for (const exp of seed.reportExportLogs) {
      ops.push((b) =>
        b.set(doc(db, 'exportLogs', exp.id), {
          exportedByUid: demoUidMap.get('staff.demo@example.com') ?? callerCred.user.uid,
          reportType: exp.reportType,
          createdAt: exp.createdAt,
          rowCount: Math.round(exp.rowCount),
        })
      );
    }

    ops.push((b) =>
      b.set(doc(db, 'meta', 'seedStatus'), {
        seeded: true,
        seededAt: new Date().toISOString(),
        seededByEmail: callerCred.user.email ?? adminEmail,
      })
    );

    const CHUNK = 350;
    for (let i = 0; i < ops.length; i += CHUNK) {
      const batch = writeBatch(db);
      for (const op of ops.slice(i, i + CHUNK)) {
        op(batch);
      }
      await batch.commit();
    }

    console.log(`Seeded Firestore with ${ops.length} operations.`);
  } finally {
    await signOut(auth);
    await deleteApp(app);
  }
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
