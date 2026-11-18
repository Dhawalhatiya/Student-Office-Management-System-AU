import { PlannedPhasePanel } from '../../components/PlannedPhasePanel';

export function StudentFeesPage() {
  return (
    <PlannedPhasePanel
      title="Fees and Receipts"
      phaseNumber={2}
      description="Academic year tuition ledger, verified payment history, and downloadable receipts."
      plannedItems={[
        'Itemised tuition and institutional fee breakdown for the current academic year.',
        'Payment history separating Verified transactions from Pending reconciliations.',
        'Printable and downloadable official fee receipts with receipt reference numbers.',
      ]}
      backTo="/student"
      backLabel="Return to Dashboard"
    />
  );
}

export function StudentResultsPage() {
  return (
    <PlannedPhasePanel
      title="Examination Results"
      phaseNumber={2}
      description="Published semester grade sheets, course-wise marks, SGPA, and cumulative CGPA."
      plannedItems={[
        'Semester-by-semester published grade cards with course code, credits, marks, and letter grade.',
        'Computed SGPA per published semester and cumulative CGPA across completed semesters.',
        'Strict visibility control ensuring Draft, Under review, and Approved results remain hidden until Published.',
      ]}
      backTo="/student"
      backLabel="Return to Dashboard"
    />
  );
}

export function StudentRequestsPage() {
  return (
    <PlannedPhasePanel
      title="My Requests"
      phaseNumber={2}
      description="Track existing administrative tickets and submit new requests to the Student Office."
      plannedItems={[
        'Filterable list of your submitted requests with ticket numbers, category, priority, and status.',
        'Full conversation thread with staff replies (excluding internal staff-only notes).',
        'New request submission form for certificates, profile corrections, and fee clarifications.',
      ]}
      backTo="/student"
      backLabel="Return to Dashboard"
    />
  );
}

export function StudentDocumentsPage() {
  return (
    <PlannedPhasePanel
      title="My Documents"
      phaseNumber={3}
      description="Upload identity, admission, and fee proofs and track office verification status."
      plannedItems={[
        'Document checklist showing Uploaded, Under review, Verified, Rejected, and Replacement required states.',
        'Reviewer feedback notes for rejected or replacement-required submissions.',
        'Replacement upload workflow for flagged documents such as unclear bank proofs.',
      ]}
      backTo="/student"
      backLabel="Return to Dashboard"
    />
  );
}

export function StudentScholarshipsPage() {
  return (
    <PlannedPhasePanel
      title="Scholarships"
      phaseNumber={3}
      description="University scholarship programmes, eligibility checklists, and application tracking."
      plannedItems={[
        'Active Avantika University scholarship programmes for the 2026-27 academic year.',
        'Configurable required-document checklist per scholarship showing verification progress.',
        'Application submission and disbursement status updates.',
      ]}
      backTo="/student"
      backLabel="Return to Dashboard"
    />
  );
}
