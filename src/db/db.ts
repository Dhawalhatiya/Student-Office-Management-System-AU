import {
  getCurrentSession,
  requireSession,
  requireStudentSession,
} from '../auth/auth';
import { hasPermission } from '../auth/permissions';
import type {
  AcademicYear,
  AuditLog,
  Department,
  Document,
  FeeStatus,
  Notification,
  Programme,
  RequestPriority,
  RequestStatus,
  Result,
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
import { loadDatabase, saveDatabase, waitDelay } from './storage';

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

export const db = {
  async getStudentDashboardData(): Promise<StudentDashboardPayload> {
    await waitDelay();
    const session = requireStudentSession();
    const state = loadDatabase();
    const student = state.students.find((s) => s.id === session.studentId)!;
    const department = state.departments.find((d) => d.id === student.departmentId)!;
    const programme = state.programmes.find((p) => p.id === student.programmeId)!;
    const academicYear = state.academicYears.find(
      (y) => y.id === student.currentAcademicYearId
    )!;

    const feeRecord = state.feeRecords.find(
      (f) => f.studentId === student.id && f.academicYearId === academicYear.id
    )!;
    const studentPayments = state.feePayments.filter((p) => p.studentId === student.id);
    const feeSummary = deriveFeeSummary(feeRecord, studentPayments);

    const studentResults = state.results.filter((r) => r.studentId === student.id);
    const publishedResults = filterVisibleResultsForStudent(studentResults);
    const latestPublishedResult =
      publishedResults.length > 0
        ? publishedResults[publishedResults.length - 1]
        : null;
    const cgpa = computeCGPA(studentResults);

    const studentRequests = state.requests.filter((r) => r.studentId === student.id);
    const openRequestsCount = studentRequests.filter(
      (r) => r.status !== 'RESOLVED' && r.status !== 'CLOSED'
    ).length;

    const attentionDocuments = state.documents.filter(
      (d) =>
        d.studentId === student.id &&
        (d.status === 'REJECTED' || d.status === 'REPLACEMENT_REQUIRED')
    );

    const myNotifications = state.notifications
      .filter((n) => n.userAccountId === session.accountId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return {
      student,
      department,
      programme,
      academicYear,
      feeSummary,
      feeDueDate: feeRecord.dueDate,
      latestPublishedResult,
      cgpa,
      openRequestsCount,
      totalRequestsCount: studentRequests.length,
      attentionDocuments,
      recentNotifications: myNotifications.slice(0, 5),
      unreadNotificationsCount: myNotifications.filter((n) => !n.isRead).length,
    };
  },

  async getStudentProfile(): Promise<StudentProfilePayload> {
    await waitDelay();
    const session = requireStudentSession();
    const state = loadDatabase();
    const student = state.students.find((s) => s.id === session.studentId)!;
    const department = state.departments.find((d) => d.id === student.departmentId)!;
    const programme = state.programmes.find((p) => p.id === student.programmeId)!;
    const academicYear = state.academicYears.find(
      (y) => y.id === student.currentAcademicYearId
    )!;

    return { student, department, programme, academicYear };
  },

  async getNotifications(): Promise<{ items: Notification[]; unreadCount: number }> {
    await waitDelay();
    const session = requireSession();
    const state = loadDatabase();
    const items = state.notifications
      .filter((n) => n.userAccountId === session.accountId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return {
      items,
      unreadCount: items.filter((n) => !n.isRead).length,
    };
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    await waitDelay();
    const session = requireSession();
    const state = loadDatabase();
    const target = state.notifications.find(
      (n) => n.id === notificationId && n.userAccountId === session.accountId
    );
    if (target) {
      target.isRead = true;
      saveDatabase(state);
    }
  },

  async markAllNotificationsRead(): Promise<void> {
    await waitDelay();
    const session = requireSession();
    const state = loadDatabase();
    let changed = false;
    for (const n of state.notifications) {
      if (n.userAccountId === session.accountId && !n.isRead) {
        n.isRead = true;
        changed = true;
      }
    }
    if (changed) {
      saveDatabase(state);
    }
  },

  async getUnreadNotificationCount(): Promise<number> {
    const session = getCurrentSession();
    if (!session) return 0;
    const state = loadDatabase();
    return state.notifications.filter(
      (n) => n.userAccountId === session.accountId && !n.isRead
    ).length;
  },

  async getStaffDashboardData(): Promise<StaffDashboardPayload> {
    await waitDelay();
    const session = requireSession();
    if (session.role !== 'STAFF') {
      throw new Error('Staff access required.');
    }

    const state = loadDatabase();
    const currentAy = state.academicYears.find((y) => y.isCurrent)!;
    const metrics: StaffDashboardMetrics = {};

    if (hasPermission(session, 'students.read')) {
      metrics.totalStudents = state.students.length;
    }

    if (hasPermission(session, 'fees.read')) {
      let paid = 0;
      let partial = 0;
      let unpaid = 0;
      const currentFees = state.feeRecords.filter(
        (f) => f.academicYearId === currentAy.id
      );
      for (const rec of currentFees) {
        const payments = state.feePayments.filter((p) => p.feeRecordId === rec.id);
        const derived = deriveFeeSummary(rec, payments);
        if (derived.status === 'PAID') paid += 1;
        else if (derived.status === 'PARTIAL') partial += 1;
        else unpaid += 1;
      }
      metrics.feeCounts = { paid, partial, unpaid };
    }

    if (hasPermission(session, 'requests.read')) {
      metrics.pendingRequestsCount = state.requests.filter(
        (r) => r.status !== 'RESOLVED' && r.status !== 'CLOSED'
      ).length;
    }

    if (hasPermission(session, 'documents.review')) {
      metrics.documentsAwaitingReviewCount = state.documents.filter(
        (d) => d.status === 'UPLOADED' || d.status === 'UNDER_REVIEW'
      ).length;
    }

    if (hasPermission(session, 'scholarships.read')) {
      metrics.scholarshipDocsAwaitingReviewCount = state.scholarshipDocuments.filter(
        (d) => d.status === 'UPLOADED' || d.status === 'UNDER_REVIEW'
      ).length;
    }

    const payload: StaffDashboardPayload = {
      user: session,
      metrics,
    };

    if (hasPermission(session, 'requests.read')) {
      const statuses: RequestStatus[] = [
        'SUBMITTED',
        'UNDER_REVIEW',
        'WAITING_FOR_STUDENT',
        'RESOLVED',
        'CLOSED',
      ];
      payload.requestsByStatus = statuses.map((status) => ({
        status,
        count: state.requests.filter((r) => r.status === status).length,
      }));

      const openReqs = state.requests.filter(
        (r) => r.status !== 'RESOLVED' && r.status !== 'CLOSED'
      );
      const priorities: RequestPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
      payload.openRequestsByPriority = priorities.map((priority) => ({
        priority,
        count: openReqs.filter((r) => r.priority === priority).length,
      }));

      const sorted = [...state.requests].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt)
      );
      payload.recentRequests = sorted.slice(0, 8).map((r) => {
        const stu = state.students.find((s) => s.id === r.studentId);
        const assignee = r.assignedStaffId
          ? state.staffAccounts.find((st) => st.id === r.assignedStaffId)
          : undefined;
        return {
          id: r.id,
          ticketNumber: r.ticketNumber,
          subject: r.subject,
          category: r.category,
          priority: r.priority,
          status: r.status,
          studentName: stu?.fullName ?? 'Unknown student',
          enrollmentNumber: stu?.enrollmentNumber ?? '—',
          assigneeName: assignee?.fullName ?? 'Unassigned',
          updatedAt: r.updatedAt,
        };
      });
    }

    if (hasPermission(session, 'audit.read')) {
      payload.recentAuditLogs = state.auditLogs.slice(0, 8);
    }

    return payload;
  },

  async searchStudents(rawQuery: string): Promise<{
    rows: StudentSearchRow[];
    error?: string;
    totalCount: number;
  }> {
    await waitDelay();
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

    const state = loadDatabase();
    const currentAy = state.academicYears.find((y) => y.isCurrent)!;
    const canReadFees = hasPermission(session, 'fees.read');
    const q = sanitized.query.toLowerCase();

    const matched = q
      ? state.students.filter(
          (s) =>
            s.enrollmentNumber.toLowerCase().includes(q) ||
            s.fullName.toLowerCase().includes(q)
        )
      : state.students;

    const rows: StudentSearchRow[] = matched.slice(0, 50).map((s) => {
      const prog = state.programmes.find((p) => p.id === s.programmeId)!;
      const dept = state.departments.find((d) => d.id === s.departmentId)!;

      let feeStatus: FeeStatus | undefined;
      if (canReadFees) {
        const rec = state.feeRecords.find(
          (f) => f.studentId === s.id && f.academicYearId === currentAy.id
        );
        if (rec) {
          const payments = state.feePayments.filter((p) => p.feeRecordId === rec.id);
          feeStatus = deriveFeeSummary(rec, payments).status;
        }
      }

      return {
        id: s.id,
        enrollmentNumber: s.enrollmentNumber,
        fullName: s.fullName,
        programmeName: prog.name,
        departmentCode: dept.code,
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
