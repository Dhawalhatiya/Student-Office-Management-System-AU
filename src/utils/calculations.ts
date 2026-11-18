import type {
  CourseResult,
  FeePayment,
  FeeRecord,
  FeeStatus,
  LetterGrade,
  Result,
} from '../types/domain';

export interface DerivedFeeSummary {
  totalAmountInr: number;
  verifiedPaidInr: number;
  pendingAmountInr: number;
  balanceInr: number;
  status: FeeStatus;
}

/**
 * Derives fee summary strictly from VERIFIED payments.
 * PENDING or REJECTED payments never count toward the paid amount or fee status.
 */
export function deriveFeeSummary(
  feeRecord: FeeRecord,
  payments: FeePayment[]
): DerivedFeeSummary {
  const recordPayments = payments.filter((p) => p.feeRecordId === feeRecord.id);

  const verifiedPaidInr = recordPayments
    .filter((p) => p.status === 'VERIFIED')
    .reduce((sum, p) => sum + Math.round(p.amountInr), 0);

  const pendingAmountInr = recordPayments
    .filter((p) => p.status === 'PENDING')
    .reduce((sum, p) => sum + Math.round(p.amountInr), 0);

  const totalAmountInr = Math.round(feeRecord.totalAmountInr);
  const balanceInr = Math.max(0, totalAmountInr - verifiedPaidInr);

  let status: FeeStatus = 'UNPAID';
  if (verifiedPaidInr >= totalAmountInr && totalAmountInr > 0) {
    status = 'PAID';
  } else if (verifiedPaidInr > 0) {
    status = 'PARTIAL';
  }

  return {
    totalAmountInr,
    verifiedPaidInr,
    pendingAmountInr,
    balanceInr,
    status,
  };
}

export function calculateGradeFromMarks(marksObtained: number): {
  grade: LetterGrade;
  gradePoint: number;
} {
  if (marksObtained >= 90) return { grade: 'O', gradePoint: 10 };
  if (marksObtained >= 80) return { grade: 'A+', gradePoint: 9 };
  if (marksObtained >= 70) return { grade: 'A', gradePoint: 8 };
  if (marksObtained >= 60) return { grade: 'B+', gradePoint: 7 };
  if (marksObtained >= 50) return { grade: 'B', gradePoint: 6 };
  if (marksObtained >= 40) return { grade: 'C', gradePoint: 5 };
  return { grade: 'F', gradePoint: 0 };
}

export function computeSGPA(courses: CourseResult[]): number {
  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
  if (totalCredits === 0) return 0;
  const weighted = courses.reduce((sum, c) => sum + c.credits * c.gradePoint, 0);
  return Math.round((weighted / totalCredits) * 100) / 100;
}

export function computeCGPA(results: Result[]): number {
  const published = filterVisibleResultsForStudent(results);
  let totalCredits = 0;
  let totalWeighted = 0;
  for (const res of published) {
    for (const c of res.courses) {
      totalCredits += c.credits;
      totalWeighted += c.credits * c.gradePoint;
    }
  }
  if (totalCredits === 0) return 0;
  return Math.round((totalWeighted / totalCredits) * 100) / 100;
}

/**
 * Students may only ever see PUBLISHED results.
 * DRAFT, UNDER_REVIEW, and APPROVED results are hidden from students.
 */
export function filterVisibleResultsForStudent(results: Result[]): Result[] {
  return results
    .filter((r) => r.status === 'PUBLISHED')
    .sort((a, b) => a.semesterNumber - b.semesterNumber);
}

export function validateEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export const MAX_SEARCH_LENGTH = 64;

export function sanitizeSearchQuery(rawQuery: string): {
  valid: boolean;
  query: string;
  error?: string;
} {
  const trimmed = rawQuery.trim();
  if (trimmed.length > MAX_SEARCH_LENGTH) {
    return {
      valid: false,
      query: trimmed.slice(0, MAX_SEARCH_LENGTH),
      error: `Search query must be ${MAX_SEARCH_LENGTH} characters or fewer.`,
    };
  }
  return {
    valid: true,
    query: trimmed,
  };
}
