import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { STAFF_GROUP_LABELS, hasPermission } from '../../auth/permissions';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { db, type StaffDashboardPayload } from '../../db/db';
import type { Permission } from '../../types/domain';
import { formatDate, formatDateTime } from '../../utils/format';

interface QuickActionDef {
  label: string;
  to: string;
  permission?: Permission;
}

const STAFF_QUICK_ACTIONS: QuickActionDef[] = [
  { label: 'Search students', to: '/staff/search', permission: 'students.read' },
  { label: 'Manage student records', to: '/staff/students', permission: 'students.write' },
  { label: 'Review fee ledger', to: '/staff/fees', permission: 'fees.read' },
  { label: 'Moderate results', to: '/staff/results', permission: 'results.read' },
  { label: 'Handle requests', to: '/staff/requests', permission: 'requests.read' },
  { label: 'Review documents', to: '/staff/documents', permission: 'documents.review' },
  { label: 'Scholarship review', to: '/staff/scholarships', permission: 'scholarships.read' },
  { label: 'Export reports', to: '/staff/reports', permission: 'reports.export' },
];

export function StaffDashboard() {
  const { session } = useAuth();
  const [data, setData] = useState<StaffDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    db.getStaffDashboardData()
      .then((res) => {
        if (active) {
          setData(res);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load staff dashboard.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session?.accountId]);

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading staff dashboard">
        <div className="h-20 animate-pulse rounded-xl border border-[#dbe4de] bg-white" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-[#dbe4de] bg-white" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data || !session) {
    return (
      <div role="alert" className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-6 text-sm text-[#b91c1c]">
        {error ?? 'Unable to load staff dashboard.'}
      </div>
    );
  }

  const { metrics, requestsByStatus, openRequestsByPriority, recentRequests, recentAuditLogs } = data;
  const permittedQuickActions = STAFF_QUICK_ACTIONS.filter(
    (a) => !a.permission || hasPermission(session, a.permission)
  );

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <section className="rounded-xl border border-[#dbe4de] bg-white p-6">
        <h1 className="font-heading text-2xl font-semibold text-[#17221c] sm:text-3xl">
          Staff Dashboard
        </h1>
        <p className="mt-1 text-sm text-[#5a6a61]">
          {session.fullName} · {session.designation} · {STAFF_GROUP_LABELS[session.staffGroup!]} group
        </p>
      </section>

      {/* Permission-Scoped Metric Cards */}
      <section
        aria-label="Permitted operational metrics"
        className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]"
      >
        {metrics.totalStudents !== undefined && (
          <article className="rounded-xl border border-[#dbe4de] bg-white p-5">
            <p className="text-sm font-medium text-[#5a6a61]">Total students</p>
            <p className="font-heading mt-2 text-3xl font-semibold text-[#17221c] tabular-nums">
              {metrics.totalStudents}
            </p>
            <p className="mt-1.5 text-xs text-[#5a6a61]">
              Across 4 programmes (Batches 2023–2026)
            </p>
          </article>
        )}

        {metrics.feeCounts !== undefined && (
          <article className="rounded-xl border border-[#dbe4de] bg-white p-5">
            <p className="text-sm font-medium text-[#5a6a61]">
              Fee accounts (Academic year 2026-27)
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm tabular-nums">
              <div>
                <span className="font-semibold text-[#185a39]">{metrics.feeCounts.paid}</span>{' '}
                <span className="text-[#5a6a61]">Paid</span>
              </div>
              <div>
                <span className="font-semibold text-[#8a6111]">{metrics.feeCounts.partial}</span>{' '}
                <span className="text-[#5a6a61]">Partial</span>
              </div>
              <div>
                <span className="font-semibold text-[#b91c1c]">{metrics.feeCounts.unpaid}</span>{' '}
                <span className="text-[#5a6a61]">Unpaid</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-[#5a6a61]">
              Derived strictly from verified payments.
            </p>
          </article>
        )}

        {metrics.pendingRequestsCount !== undefined && (
          <article className="rounded-xl border border-[#dbe4de] bg-white p-5">
            <p className="text-sm font-medium text-[#5a6a61]">Pending requests</p>
            <p className="font-heading mt-2 text-3xl font-semibold text-[#17221c] tabular-nums">
              {metrics.pendingRequestsCount}
            </p>
            <p className="mt-1.5 text-xs text-[#5a6a61]">
              Submitted, Under review, or Waiting for student
            </p>
          </article>
        )}

        {metrics.documentsAwaitingReviewCount !== undefined && (
          <article className="rounded-xl border border-[#dbe4de] bg-white p-5">
            <p className="text-sm font-medium text-[#5a6a61]">Documents awaiting review</p>
            <p className="font-heading mt-2 text-3xl font-semibold text-[#17221c] tabular-nums">
              {metrics.documentsAwaitingReviewCount}
            </p>
            <p className="mt-1.5 text-xs text-[#5a6a61]">
              Uploaded or currently Under review
            </p>
          </article>
        )}

        {metrics.scholarshipDocsAwaitingReviewCount !== undefined && (
          <article className="rounded-xl border border-[#dbe4de] bg-white p-5">
            <p className="text-sm font-medium text-[#5a6a61]">
              Scholarship documents awaiting review
            </p>
            <p className="font-heading mt-2 text-3xl font-semibold text-[#17221c] tabular-nums">
              {metrics.scholarshipDocsAwaitingReviewCount}
            </p>
            <p className="mt-1.5 text-xs text-[#5a6a61]">
              Submitted under 2026-27 scholarship applications
            </p>
          </article>
        )}
      </section>

      {/* Breakdowns + Permitted Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-12">
        {requestsByStatus && openRequestsByPriority && (
          <section className="rounded-xl border border-[#dbe4de] bg-white p-6 lg:col-span-7">
            <h2 className="font-heading text-lg font-semibold text-[#17221c]">
              Request queues
            </h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold text-[#5a6a61]">Requests by status</h3>
                <ul className="mt-3 space-y-2.5">
                  {requestsByStatus.map((row) => (
                    <li key={row.status} className="flex items-center justify-between gap-2">
                      <StatusBadge status={row.status} />
                      <span className="text-sm font-semibold text-[#17221c] tabular-nums">
                        {row.count}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-[#5a6a61]">
                  Open requests by priority
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {openRequestsByPriority.map((row) => (
                    <li key={row.priority} className="flex items-center justify-between gap-2">
                      <StatusBadge status={row.priority} />
                      <span className="text-sm font-semibold text-[#17221c] tabular-nums">
                        {row.count}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        <section
          className={`rounded-xl border border-[#dbe4de] bg-white p-6 ${
            requestsByStatus ? 'lg:col-span-5' : 'lg:col-span-12'
          }`}
        >
          <h2 className="font-heading text-lg font-semibold text-[#17221c]">
            Permitted quick actions
          </h2>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
            {permittedQuickActions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="flex items-center justify-between rounded-lg border border-[#dbe4de] bg-[#f8faf7] px-4 py-2.5 text-sm font-medium text-[#17221c] transition-colors hover:border-[#185a39] hover:bg-[#eef6f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39]"
              >
                <span>{action.label}</span>
                <span aria-hidden="true" className="text-[#185a39]">→</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Recent Requests Table */}
      {recentRequests && (
        <section className="rounded-xl border border-[#dbe4de] bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-semibold text-[#17221c]">
              Recent requests
            </h2>
            <Link
              to="/staff/requests"
              className="text-sm font-medium text-[#185a39] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] rounded"
            >
              Open Requests queue
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#dbe4de] text-xs font-medium text-[#5a6a61]">
                  <th className="py-2.5 pr-4">Ticket &amp; subject</th>
                  <th className="py-2.5 pr-4">Student</th>
                  <th className="py-2.5 pr-4">Category</th>
                  <th className="py-2.5 pr-4">Priority</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 pr-4">Assignee</th>
                  <th className="py-2.5 text-right">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dbe4de]">
                {recentRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-[#f8faf7]">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-[#17221c]">{req.subject}</p>
                      <p className="text-xs text-[#5a6a61] tabular-nums">{req.ticketNumber}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-[#17221c]">{req.studentName}</p>
                      <p className="text-xs text-[#5a6a61] tabular-nums">{req.enrollmentNumber}</p>
                    </td>
                    <td className="py-3 pr-4 text-[#5a6a61]">{req.category}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={req.priority} />
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="py-3 pr-4 text-[#17221c]">{req.assigneeName}</td>
                    <td className="py-3 text-right text-xs text-[#5a6a61] tabular-nums whitespace-nowrap">
                      {formatDate(req.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent Administrative Activity (audit.read only) */}
      {recentAuditLogs && (
        <section className="rounded-xl border border-[#dbe4de] bg-white p-6">
          <h2 className="font-heading text-lg font-semibold text-[#17221c]">
            Recent administrative activity
          </h2>
          <p className="mt-1 text-xs text-[#5a6a61]">
            Recorded authentication and access control events (visible only to staff with audit permission).
          </p>
          {recentAuditLogs.length === 0 ? (
            <p className="mt-4 text-sm text-[#5a6a61]">No audit entries recorded yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-[#dbe4de]">
              {recentAuditLogs.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-baseline justify-between gap-3 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-[#17221c]">{entry.action}</span>
                    <span className="mx-2 text-[#5a6a61]" aria-hidden="true">·</span>
                    <span className="text-[#17221c]">{entry.actorEmail}</span>
                    <p className="mt-0.5 text-xs text-[#5a6a61]">{entry.detail}</p>
                  </div>
                  <span className="text-xs text-[#5a6a61] tabular-nums whitespace-nowrap">
                    {formatDateTime(entry.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
