import { PlannedPhasePanel } from '../../components/PlannedPhasePanel';

export function StaffStudentsPage() {
  return (
    <PlannedPhasePanel
      title="Student Records"
      phaseNumber={2}
      description="Create and update student enrollment profiles, programme transfers, and academic statuses."
      plannedItems={[
        'Create new student profiles with validated unique AVU-DEMO enrollment numbers.',
        'Update contact details, current semester progression, and enrollment status.',
        'Full profile inspection linked directly from Student Search.',
      ]}
      backTo="/staff"
      backLabel="Return to Staff Dashboard"
    />
  );
}

export function StaffFeesPage() {
  return (
    <PlannedPhasePanel
      title="Fees and Receipts"
      phaseNumber={2}
      description="Verify pending fee payments, reconcile NEFT/UPI references, and issue receipts."
      plannedItems={[
        'Review queue of Pending payments submitted by students.',
        'Verify or reject transactions with automatic fee status recalculation.',
        'Generate and audit official fee receipts.',
      ]}
      backTo="/staff"
      backLabel="Return to Staff Dashboard"
    />
  );
}

export function StaffResultsPage() {
  return (
    <PlannedPhasePanel
      title="Examination Results"
      phaseNumber={2}
      description="Manage Draft, Under review, Approved, and Published semester result batches."
      plannedItems={[
        'Enter and edit course marks with automatic letter grade and SGPA computation.',
        'Advance result batches through Draft, Under review, and Approved stages.',
        'Publish approved semester results to make them visible in the Student Portal.',
      ]}
      backTo="/staff"
      backLabel="Return to Staff Dashboard"
    />
  );
}

export function StaffRequestsPage() {
  return (
    <PlannedPhasePanel
      title="Requests"
      phaseNumber={2}
      description="Triage student tickets, post public replies, and record internal staff-only notes."
      plannedItems={[
        'Filterable administrative ticket queue by status, category, priority, and assignee.',
        'Conversation thread supporting both student-visible replies and internal staff notes.',
        'Status transitions across Submitted, Under review, Waiting for student, Resolved, and Closed.',
      ]}
      backTo="/staff"
      backLabel="Return to Staff Dashboard"
    />
  );
}

export function StaffDocumentsPage() {
  return (
    <PlannedPhasePanel
      title="Documents"
      phaseNumber={3}
      description="Review student identity, admission, and bank proof submissions."
      plannedItems={[
        'Document review queue covering Uploaded and Under review submissions.',
        'Verify, reject, or mark documents as Replacement required with mandatory reviewer remarks.',
        'Trigger automated student notifications upon status changes.',
      ]}
      backTo="/staff"
      backLabel="Return to Staff Dashboard"
    />
  );
}

export function StaffScholarshipsPage() {
  return (
    <PlannedPhasePanel
      title="Scholarships"
      phaseNumber={3}
      description="Configure scholarship document requirements and review student applications."
      plannedItems={[
        'Configure required document checklists for each university scholarship.',
        'Review submitted scholarship documents and application eligibility.',
        'Approve or reject applications with audit logging.',
      ]}
      backTo="/staff"
      backLabel="Return to Staff Dashboard"
    />
  );
}

export function StaffReportsPage() {
  return (
    <PlannedPhasePanel
      title="Reports and Exports"
      phaseNumber={3}
      description="Generate CSV summaries of student enrollment, fee compliance, and request turnaround."
      plannedItems={[
        'Permission-scoped report exports for enrollment, fees, results, and requests.',
        'Downloadable CSV exports formatted with Indian Rupee figures and ISO dates.',
        'Automatic recording in the Report Export Log.',
      ]}
      backTo="/staff"
      backLabel="Return to Staff Dashboard"
    />
  );
}

export function StaffAiAssistantPage() {
  return (
    <PlannedPhasePanel
      title="AI Data Assistant"
      phaseNumber={4}
      description="Natural-language query assistant scoped strictly to your staff group's permitted records."
      plannedItems={[
        'Summarise fee collection status or open request bottlenecks in plain English.',
        'Permission-gated data grounding ensuring Finance and Student Office queries remain isolated.',
        'Read-only analytical responses with no direct mutation of student records.',
      ]}
      backTo="/staff"
      backLabel="Return to Staff Dashboard"
    />
  );
}
