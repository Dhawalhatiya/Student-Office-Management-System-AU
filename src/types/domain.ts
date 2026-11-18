export type UserRole = 'STUDENT' | 'STAFF';

export type StaffGroup =
  | 'STUDENT_OFFICE'
  | 'FINANCE'
  | 'EXAMINATION'
  | 'ACADEMIC';

export type Permission =
  | 'students.read'
  | 'students.write'
  | 'fees.read'
  | 'fees.write'
  | 'results.read'
  | 'results.write'
  | 'results.publish'
  | 'requests.read'
  | 'requests.manage'
  | 'documents.review'
  | 'scholarships.read'
  | 'scholarships.manage'
  | 'reports.export'
  | 'ai.assistant'
  | 'audit.read';

export type EnrollmentStatus = 'ACTIVE' | 'ON_LEAVE' | 'GRADUATED' | 'WITHDRAWN';
export type FeeStatus = 'PAID' | 'PARTIAL' | 'UNPAID';
export type PaymentStatus = 'VERIFIED' | 'PENDING' | 'REJECTED';
export type ResultStatus = 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'PUBLISHED';
export type RequestStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'WAITING_FOR_STUDENT'
  | 'RESOLVED'
  | 'CLOSED';
export type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type DocumentReviewStatus =
  | 'UPLOADED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'REPLACEMENT_REQUIRED';

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGIN_RATE_LIMITED'
  | 'LOGOUT'
  | 'ACCESS_DENIED';

export interface Department {
  id: string;
  code: string;
  name: string;
}

export interface Programme {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  durationSemesters: number;
}

export interface AcademicYear {
  id: string;
  label: string; // e.g., '2026-27'
  startYear: number;
  endYear: number;
  isCurrent: boolean;
}

export interface Semester {
  id: string;
  number: number;
  academicYearId: string;
  term: 'Odd' | 'Even';
}

export interface Student {
  id: string;
  enrollmentNumber: string; // AVU-DEMO-YY-PROG-NNN
  fullName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  departmentId: string;
  programmeId: string;
  batchYear: number;
  currentSemester: number;
  currentAcademicYearId: string;
  enrollmentStatus: EnrollmentStatus;
  address: string;
}

export interface StaffAccount {
  id: string;
  fullName: string;
  email: string;
  designation: string;
  staffGroup: StaffGroup;
}

export interface UserAccount {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  studentId?: string;
  staffId?: string;
}

export interface SessionUser {
  accountId: string;
  email: string;
  fullName: string;
  role: UserRole;
  studentId?: string;
  staffId?: string;
  staffGroup?: StaffGroup;
  designation?: string;
  permissions: Permission[];
}

export interface FeeRecord {
  id: string;
  studentId: string;
  academicYearId: string;
  totalAmountInr: number;
  dueDate: string;
}

export interface FeePayment {
  id: string;
  feeRecordId: string;
  studentId: string;
  amountInr: number;
  paidAt: string;
  mode: 'NEFT' | 'UPI' | 'Card' | 'Demand Draft';
  referenceNumber: string;
  status: PaymentStatus;
}

export interface FeeReceipt {
  id: string;
  paymentId: string;
  studentId: string;
  receiptNumber: string;
  issuedAt: string;
  amountInr: number;
}

export type LetterGrade = 'O' | 'A+' | 'A' | 'B+' | 'B' | 'C' | 'F';

export interface CourseResult {
  courseCode: string;
  courseTitle: string;
  credits: number;
  marksObtained: number;
  maxMarks: number;
  grade: LetterGrade;
  gradePoint: number;
}

export interface Result {
  id: string;
  studentId: string;
  semesterNumber: number;
  academicYearId: string;
  status: ResultStatus;
  courses: CourseResult[];
  sgpa: number;
  publishedAt?: string;
}

export interface RequestMessage {
  id: string;
  requestId: string;
  senderName: string;
  senderRole: UserRole;
  isInternal: boolean;
  body: string;
  sentAt: string;
}

export interface StudentRequest {
  id: string;
  ticketNumber: string;
  studentId: string;
  subject: string;
  category:
    | 'Certificate / Letter'
    | 'Profile Correction'
    | 'Fee Clarification'
    | 'Examination & Results'
    | 'Scholarship Query'
    | 'General Administration';
  priority: RequestPriority;
  status: RequestStatus;
  assignedStaffId?: string;
  createdAt: string;
  updatedAt: string;
  messages: RequestMessage[];
}

export interface Document {
  id: string;
  studentId: string;
  title: string;
  category:
    | 'Identity Proof'
    | 'Academic Transcript'
    | 'Bank & Fee Proof'
    | 'Scholarship Document'
    | 'Admission Record';
  fileName: string;
  uploadedAt: string;
  status: DocumentReviewStatus;
  reviewerNote?: string;
}

export interface ScholarshipRequirement {
  id: string;
  documentName: string;
  description: string;
  mandatory: boolean;
}

export interface Scholarship {
  id: string;
  name: string;
  academicYearId: string;
  awardAmountInr: number;
  summary: string;
  requirements: ScholarshipRequirement[];
}

export interface StudentScholarship {
  id: string;
  studentId: string;
  scholarshipId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  appliedAt: string;
}

export interface ScholarshipDocument {
  id: string;
  studentScholarshipId: string;
  studentId: string;
  requirementId: string;
  fileName: string;
  uploadedAt: string;
  status: DocumentReviewStatus;
}

export interface Notification {
  id: string;
  userAccountId: string;
  title: string;
  body: string;
  category: 'Fees' | 'Results' | 'Requests' | 'Documents' | 'General';
  createdAt: string;
  isRead: boolean;
  linkPath?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorAccountId?: string;
  actorEmail: string;
  actorRole?: UserRole;
  action: AuditAction;
  targetRoute?: string;
  detail: string;
}

export interface ReportExportLog {
  id: string;
  exportedByStaffId: string;
  reportType: string;
  createdAt: string;
  rowCount: number;
}

export interface LoginAttemptBucket {
  email: string;
  failedTimestamps: number[];
}

export interface DatabaseState {
  departments: Department[];
  programmes: Programme[];
  academicYears: AcademicYear[];
  semesters: Semester[];
  students: Student[];
  staffAccounts: StaffAccount[];
  userAccounts: UserAccount[];
  feeRecords: FeeRecord[];
  feePayments: FeePayment[];
  feeReceipts: FeeReceipt[];
  results: Result[];
  requests: StudentRequest[];
  documents: Document[];
  scholarships: Scholarship[];
  studentScholarships: StudentScholarship[];
  scholarshipDocuments: ScholarshipDocument[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  reportExportLogs: ReportExportLog[];
  loginAttempts: Record<string, LoginAttemptBucket>;
}
