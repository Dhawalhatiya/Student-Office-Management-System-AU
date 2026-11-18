const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatINR(amount: number): string {
  const whole = Math.round(amount);
  return inrFormatter.format(whole);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return '—';
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatDateTime(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return '—';
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${formatDate(d)}, ${hours}:${mins}`;
}

export type BadgeTone = 'green' | 'amber' | 'red' | 'blue' | 'grey';

const STATUS_MAP: Record<string, { label: string; tone: BadgeTone }> = {
  // Green
  PAID: { label: 'Paid', tone: 'green' },
  VERIFIED: { label: 'Verified', tone: 'green' },
  PUBLISHED: { label: 'Published', tone: 'green' },
  RESOLVED: { label: 'Resolved', tone: 'green' },
  ACTIVE: { label: 'Active', tone: 'green' },

  // Amber
  PARTIAL: { label: 'Partial', tone: 'amber' },
  UNDER_REVIEW: { label: 'Under review', tone: 'amber' },
  WAITING_FOR_STUDENT: { label: 'Waiting for student', tone: 'amber' },
  PENDING: { label: 'Pending', tone: 'amber' },
  IN_PROGRESS: { label: 'In progress', tone: 'amber' },
  HIGH: { label: 'High', tone: 'amber' },
  ON_LEAVE: { label: 'On leave', tone: 'amber' },

  // Red
  UNPAID: { label: 'Unpaid', tone: 'red' },
  REJECTED: { label: 'Rejected', tone: 'red' },
  REPLACEMENT_REQUIRED: { label: 'Replacement required', tone: 'red' },
  URGENT: { label: 'Urgent', tone: 'red' },
  WITHDRAWN: { label: 'Withdrawn', tone: 'red' },

  // Blue
  SUBMITTED: { label: 'Submitted', tone: 'blue' },
  UPLOADED: { label: 'Uploaded', tone: 'blue' },
  APPROVED: { label: 'Approved', tone: 'blue' },
  MEDIUM: { label: 'Medium', tone: 'blue' },
  GRADUATED: { label: 'Graduated', tone: 'blue' },

  // Grey
  DRAFT: { label: 'Draft', tone: 'grey' },
  CLOSED: { label: 'Closed', tone: 'grey' },
  LOW: { label: 'Low', tone: 'grey' },
};

export function getStatusDisplay(rawStatus: string): { label: string; tone: BadgeTone } {
  const key = rawStatus.toUpperCase().replace(/\s+/g, '_');
  if (STATUS_MAP[key]) {
    return STATUS_MAP[key];
  }
  const sentence = rawStatus
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
  return { label: sentence, tone: 'grey' };
}
