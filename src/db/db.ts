import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  getCurrentSession,
  requireSession,
  requireStudentSession,
} from '../auth/auth';
import { hasPermission } from '../auth/permissions';
import { firestoreDb } from '../firebase/config';
import { OperationType, handleFirestoreError } from '../firebase/errors';
import type {
  AcademicYear,
  AuditLog,
  CourseResult,
  Department,
  Document,
  FeePayment,
  FeeRecord,
  FeeStatus,
  Notification,
  Programme,
  RequestPriority,
  RequestStatus,
  Result,
  ScholarshipDocument,
  SessionUser,
  Student,
  StudentRequest,
} from '../types/domain';
import {
  computeCGPA,
  deriveFeeSummary,
  filterVisibleResultsForStudent,
  sanitizeSearchQuery,
  type DerivedFeeSummary,
} from '../utils/calculations';

export interface StudentDashboardPayload {
  student: Student;
  department: Department;
  programme: Programme;
  academicYear: AcademicYear;
  feeSummary: DerivedFeeSummary;
  feeDueDate: string;
  latestPublishedResult: Result | null;
  cgpa: number;
  openRequestsCount: number;
  totalRequestsCount: number;
  attentionDocuments: Document[];
  recentNotifications: Notification[];
  unreadNotificationsCount: number;
}

export interface StudentProfilePayload {
  student: Student;
  department: Department;
  programme: Programme;
  academicYear: AcademicYear;
}

export interface StaffDashboardMetrics {
  totalStudents?: number;
  feeCounts?: {
    paid: number;
    partial: number;
    unpaid: number;
  };
  pendingRequestsCount?: number;
  documentsAwaitingReviewCount?: number;
  scholarshipDocsAwaitingReviewCount?: number;
}

export interface StaffRecentRequestRow {
  id: string;
  ticketNumber: string;
  subject: string;
  category: StudentRequest['category'];
  priority: RequestPriority;
  status: RequestStatus;
  studentName: string;
  enrollmentNumber: string;
  assigneeName: string;
  updatedAt: string;
}

export interface StaffDashboardPayload {
  user: SessionUser;
  metrics: StaffDashboardMetrics;
  requestsByStatus?: Array<{ status: RequestStatus; count: number }>;
  openRequestsByPriority?: Array<{ priority: RequestPriority; count: number }>;
  recentRequests?: StaffRecentRequestRow[];
  recentAuditLogs?: AuditLog[];
}

export interface StudentSearchRow {
  id: string;
  enrollmentNumber: string;
  fullName: string;
  programmeName: string;
  departmentCode: string;
  batchYear: number;
  currentSemester: number;
  enrollmentStatus: Student['enrollmentStatus'];
  feeStatus?: FeeStatus;
}

async function safeGetDoc<T>(collectionName: string, docId: string): Promise<T & { id: string }> {
  const path = `${collectionName}/${docId}`;
  try {
    const snap = await getDoc(doc(firestoreDb, collectionName, docId));
    if (!snap.exists()) {
      throw new Error(`Record not found at ${path}.`);
    }
    return { id: snap.id, ...(snap.data() as T) };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Record not found')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, path);
  }
}

async function safeGetDocs<T>(
  path: string,
  q: ReturnType<typeof query> | ReturnType<typeof collection>
): Promise<Array<T & { id: string }>> {
  try {
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export const db = {
  async getStudentDashboardData(): Promise<StudentDashboardPayload> {
    const session = requireStudentSession();
    const enrollmentNo = session.studentId!;

    const student = await safeGetDoc<Student>('students', enrollmentNo);
    const [department, programme, academicYear, feeRecords, feePayments, publishedResultHeaders, requests, documents, notifications] =
      await Promise.all([
        safeGetDoc<Department>('departments', student.departmentId),
        safeGetDoc<Programme>('programmes', student.programmeId),
        safeGetDoc<AcademicYear>('academicYears', student.currentAcademicYearId),
        safeGetDocs<FeeRecord>(
          'feeRecords',
          query(collection(firestoreDb, 'feeRecords'), where('studentId', '==', enrollmentNo))
        ),
        safeGetDocs<FeePayment>(
          'feePayments',
          query(collection(firestoreDb, 'feePayments'), where('studentId', '==', enrollmentNo))
        ),
        // Security rule requires status == 'PUBLISHED' on student results queries
        safeGetDocs<Omit<Result, 'courses'>>(
          'results',
          query(
            collection(firestoreDb, 'results'),
            where('studentId', '==', enrollmentNo),
            where('status', '==', 'PUBLISHED')
          )
        ),
        safeGetDocs<Omit<StudentRequest, 'messages'>>(
          'requests',
          query(collection(firestoreDb, 'requests'), where('studentId', '==', enrollmentNo))
        ),
        safeGetDocs<Document>(
          'documents',
          query(collection(firestoreDb, 'documents'), where('studentId', '==', enrollmentNo))
        ),
        safeGetDocs<Notification>(
          'notifications',
          query(collection(firestoreDb, 'notifications'), where('userId', '==', session.accountId))
        ),
      ]);

    const currentFeeRecord =
      feeRecords.find((f) => f.academicYearId === academicYear.id) ?? feeRecords[0];

    const feeSummary: DerivedFeeSummary = currentFeeRecord
      ? deriveFeeSummary(currentFeeRecord, feePayments)
      : {
          totalAmountInr: 0,
          verifiedPaidInr: 0,
          pendingAmountInr: 0,
          balanceInr: 0,
          status: 'UNPAID',
        };

    // Hydrate courses subcollection for each published result
    const publishedResultsWithCourses: Result[] = await Promise.all(
      publishedResultHeaders.map(async (hdr) => {
        const courses = await safeGetDocs<CourseResult>(
          `results/${hdr.id}/courses`,
          collection(firestoreDb, 'results', hdr.id, 'courses')
        );
        return {
          ...hdr,
          courses,
        };
      })
    );

    const visiblePublished = filterVisibleResultsForStudent(publishedResultsWithCourses);
    const latestPublishedResult =
      visiblePublished.length > 0
        ? visiblePublished[visiblePublished.length - 1]
        : null;
    const cgpa = computeCGPA(visiblePublished);

    const openRequestsCount = requests.filter(
      (r) => r.status !== 'RESOLVED' && r.status !== 'CLOSED'
    ).length;

    const attentionDocuments = documents.filter(
      (d) => d.status === 'REJECTED' || d.status === 'REPLACEMENT_REQUIRED'
    );

    const sortedNotifications = [...notifications].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );

    return {
      student,
      department,
      programme,
      academicYear,
      feeSummary,
      feeDueDate: currentFeeRecord?.dueDate ?? '2026-11-30',
      latestPublishedResult,
      cgpa,
      openRequestsCount,
      totalRequestsCount: requests.length,
      attentionDocuments,
      recentNotifications: sortedNotifications.slice(0, 5),
      unreadNotificationsCount: sortedNotifications.filter((n) => !n.isRead).length,
    };
  },

  async getStudentProfile(): Promise<StudentProfilePayload> {
    const session = requireStudentSession();
    const student = await safeGetDoc<Student>('students', session.studentId!);
    const [department, programme, academicYear] = await Promise.all([
      safeGetDoc<Department>('departments', student.departmentId),
      safeGetDoc<Programme>('programmes', student.programmeId),
      safeGetDoc<AcademicYear>('academicYears', student.currentAcademicYearId),
    ]);
    return { student, department, programme, academicYear };
  },

  async getNotifications(): Promise<{ items: Notification[]; unreadCount: number }> {
    const session = requireSession();
    const items = await safeGetDocs<Notification>(
      'notifications',
      query(collection(firestoreDb, 'notifications'), where('userId', '==', session.accountId))
    );
    const sorted = items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      items: sorted,
      unreadCount: sorted.filter((n) => !n.isRead).length,
    };
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    requireSession();
    const path = `notifications/${notificationId}`;
    try {
      await updateDoc(doc(firestoreDb, 'notifications', notificationId), {
        isRead: true,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async markAllNotificationsRead(): Promise<void> {
    const session = requireSession();
    const unread = await safeGetDocs<Notification>(
      'notifications',
      query(
        collection(firestoreDb, 'notifications'),
        where('userId', '==', session.accountId),
        where('isRead', '==', false)
      )
    );
    if (unread.length === 0) return;

    try {
      const batch = writeBatch(firestoreDb);
      for (const item of unread) {
        batch.update(doc(firestoreDb, 'notifications', item.id), { isRead: true });
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  },

  async getUnreadNotificationCount(): Promise<number> {
    const session = getCurrentSession();
    if (!session) return 0;
    try {
      const unread = await safeGetDocs<Notification>(
        'notifications',
        query(
          collection(firestoreDb, 'notifications'),
          where('userId', '==', session.accountId),
          where('isRead', '==', false)
        )
      );
      return unread.length;
    } catch {
      return 0;
    }
  },

  async getStaffDashboardData(): Promise<StaffDashboardPayload> {
    const session = requireSession();
    if (session.role !== 'STAFF') {
      throw new Error('Staff access required.');
    }

    const metrics: StaffDashboardMetrics = {};
    const payload: StaffDashboardPayload = {
      user: session,
      metrics,
    };

    const academicYears = await safeGetDocs<AcademicYear>(
      'academicYears',
      collection(firestoreDb, 'academicYears')
    );
    const currentAy = academicYears.find((y) => y.isCurrent) ?? academicYears[0];

    let studentsList: Array<Student & { id: string }> = [];
    if (hasPermission(session, 'students.read')) {
      studentsList = await safeGetDocs<Student>(
        'students',
        collection(firestoreDb, 'students')
      );
      metrics.totalStudents = studentsList.length;
    }

    if (hasPermission(session, 'fees.read') && currentAy) {
      const [feeRecords, feePayments] = await Promise.all([
        safeGetDocs<FeeRecord>(
          'feeRecords',
          query(
            collection(firestoreDb, 'feeRecords'),
            where('academicYearId', '==', currentAy.id)
          )
        ),
        safeGetDocs<FeePayment>('feePayments', collection(firestoreDb, 'feePayments')),
      ]);

      let paid = 0;
      let partial = 0;
      let unpaid = 0;
      for (const rec of feeRecords) {
        const payments = feePayments.filter((p) => p.feeRecordId === rec.id);
        const derived = deriveFeeSummary(rec, payments);
        if (derived.status === 'PAID') paid += 1;
        else if (derived.status === 'PARTIAL') partial += 1;
        else unpaid += 1;
      }
      metrics.feeCounts = { paid, partial, unpaid };
    }

    if (hasPermission(session, 'requests.read')) {
      const requests = await safeGetDocs<
        Omit<StudentRequest, 'messages'> & { assignedStaffName?: string }
      >('requests', collection(firestoreDb, 'requests'));

      metrics.pendingRequestsCount = requests.filter(
        (r) => r.status !== 'RESOLVED' && r.status !== 'CLOSED'
      ).length;

      const statuses: RequestStatus[] = [
        'SUBMITTED',
        'UNDER_REVIEW',
        'WAITING_FOR_STUDENT',
        'RESOLVED',
        'CLOSED',
      ];
      payload.requestsByStatus = statuses.map((status) => ({
        status,
        count: requests.filter((r) => r.status === status).length,
      }));

      const openReqs = requests.filter(
        (r) => r.status !== 'RESOLVED' && r.status !== 'CLOSED'
      );
      const priorities: RequestPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
      payload.openRequestsByPriority = priorities.map((priority) => ({
        priority,
        count: openReqs.filter((r) => r.priority === priority).length,
      }));

      const studentById = new Map(studentsList.map((s) => [s.id, s]));
      const sorted = [...requests].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt)
      );

      payload.recentRequests = sorted.slice(0, 8).map((r) => {
        const stu = studentById.get(r.studentId);
        return {
          id: r.id,
          ticketNumber: r.ticketNumber,
          subject: r.subject,
          category: r.category,
          priority: r.priority,
          status: r.status,
          studentName: stu?.fullName ?? r.studentId,
          enrollmentNumber: stu?.enrollmentNumber ?? r.studentId,
          assigneeName: r.assignedStaffName ?? 'Unassigned',
          updatedAt: r.updatedAt,
        };
      });
    }

    if (hasPermission(session, 'documents.review')) {
      const docs = await safeGetDocs<Document>(
        'documents',
        collection(firestoreDb, 'documents')
      );
      metrics.documentsAwaitingReviewCount = docs.filter(
        (d) => d.status === 'UPLOADED' || d.status === 'UNDER_REVIEW'
      ).length;
    }

    if (hasPermission(session, 'scholarships.read')) {
      const schDocs = await safeGetDocs<ScholarshipDocument>(
        'scholarshipDocuments',
        collection(firestoreDb, 'scholarshipDocuments')
      );
      metrics.scholarshipDocsAwaitingReviewCount = schDocs.filter(
        (d) => d.status === 'UPLOADED' || d.status === 'UNDER_REVIEW'
      ).length;
    }

    if (hasPermission(session, 'audit.read')) {
      const logs = await safeGetDocs<AuditLog>(
        'auditLogs',
        collection(firestoreDb, 'auditLogs')
      );
      payload.recentAuditLogs = logs
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 8);
    }

    return payload;
  },

  async searchStudents(rawQuery: string): Promise<{
    rows: StudentSearchRow[];
    error?: string;
    totalCount: number;
  }> {
    const session = requireSession();
    if (!hasPermission(session, 'students.read')) {
      throw new Error('Permission students.read required.');
    }

    const sanitized = sanitizeSearchQuery(rawQuery);
    if (!sanitized.valid) {
      return {
        rows: [],
        error: sanitized.error,
        totalCount: 0,
      };
    }

    const canReadFees = hasPermission(session, 'fees.read');
    const [students, programmes, departments, academicYears] = await Promise.all([
      safeGetDocs<Student>('students', collection(firestoreDb, 'students')),
      safeGetDocs<Programme>('programmes', collection(firestoreDb, 'programmes')),
      safeGetDocs<Department>('departments', collection(firestoreDb, 'departments')),
      safeGetDocs<AcademicYear>('academicYears', collection(firestoreDb, 'academicYears')),
    ]);

    const currentAy = academicYears.find((y) => y.isCurrent) ?? academicYears[0];
    const progMap = new Map(programmes.map((p) => [p.id, p]));
    const deptMap = new Map(departments.map((d) => [d.id, d]));

    let feeRecords: Array<FeeRecord & { id: string }> = [];
    let feePayments: Array<FeePayment & { id: string }> = [];
    if (canReadFees && currentAy) {
      [feeRecords, feePayments] = await Promise.all([
        safeGetDocs<FeeRecord>(
          'feeRecords',
          query(
            collection(firestoreDb, 'feeRecords'),
            where('academicYearId', '==', currentAy.id)
          )
        ),
        safeGetDocs<FeePayment>('feePayments', collection(firestoreDb, 'feePayments')),
      ]);
    }

    const q = sanitized.query.toLowerCase();
    const matched = (q
      ? students.filter(
          (s) =>
            s.enrollmentNumber.toLowerCase().includes(q) ||
            s.fullName.toLowerCase().includes(q)
        )
      : students
    ).sort((a, b) => a.enrollmentNumber.localeCompare(b.enrollmentNumber));

    const rows: StudentSearchRow[] = matched.slice(0, 50).map((s) => {
      const prog = progMap.get(s.programmeId);
      const dept = deptMap.get(s.departmentId);

      let feeStatus: FeeStatus | undefined;
      if (canReadFees) {
        const rec = feeRecords.find((f) => f.studentId === s.enrollmentNumber);
        if (rec) {
          const payments = feePayments.filter((p) => p.feeRecordId === rec.id);
          feeStatus = deriveFeeSummary(rec, payments).status;
        }
      }

      return {
        id: s.id,
        enrollmentNumber: s.enrollmentNumber,
        fullName: s.fullName,
        programmeName: prog?.name ?? s.programmeId,
        departmentCode: dept?.code ?? s.departmentId,
        batchYear: s.batchYear,
        currentSemester: s.currentSemester,
        enrollmentStatus: s.enrollmentStatus,
        feeStatus,
      };
    });

    return {
      rows,
      totalCount: matched.length,
    };
  },
};
