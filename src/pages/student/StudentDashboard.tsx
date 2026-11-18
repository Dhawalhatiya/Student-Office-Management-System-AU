import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bell } from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';
import { db, type StudentDashboardPayload } from '../../db/db';
import { formatReadableFirestoreError } from '../../firebase/errors';
import { formatDate, formatINR } from '../../utils/format';

export function StudentDashboard() {
  const [data, setData] = useState<StudentDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    db.getStudentDashboardData()
      .then((res) => {
        if (active) {
          setData(res);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(formatReadableFirestoreError(err, 'Unable to load dashboard.'));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading student dashboard">
        <div className="h-24 animate-pulse rounded-xl border border-[#dbe4de] bg-white" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-[#dbe4de] bg-white" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div role="alert" className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-6 text-sm text-[#b91c1c]">
        {error ?? 'Unable to load student dashboard.'}
      </div>
    );
  }

  const {
    student,
    department,
    programme,
    academicYear,
    feeSummary,
    feeDueDate,
    latestPublishedResult,
    cgpa,
    openRequestsCount,
    totalRequestsCount,
    attentionDocuments,
    recentNotifications,
  } = data;

  const docCount = attentionDocuments.length;
  const attentionText =
    docCount === 1
      ? '1 document needs your attention'
      : `${docCount} documents need your attention`;

  const quickActions = [
    { label: 'Submit a request', to: '/student/requests' },
    { label: 'View fee status', to: '/student/fees' },
    { label: 'View results', to: '/student/results' },
    { label: 'Track requests', to: '/student/requests' },
    { label: 'Upload a document', to: '/student/documents' },
    { label: 'View scholarship checklist', to: '/student/scholarships' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome & Student Summary Panel */}
      <section className="rounded-xl border border-[#dbe4de] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-[#17221c] sm:text-3xl">
              Welcome, {student.fullName}
            </h1>
            <p className="mt-1 text-sm text-[#5a6a61] tabular-nums">
              {student.enrollmentNumber} · {programme.name} · {department.name}
            </p>
            <p className="mt-1 text-sm text-[#5a6a61] tabular-nums">
              Semester {student.currentSemester} · Academic year {academicYear.label}
            </p>
          </div>
          <StatusBadge status={student.enrollmentStatus} />
        </div>
      </section>

      {/* Gold Attention Banner */}
      {docCount > 0 && (
        <section
          role="region"
          aria-label="Document attention notice"
          className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-[#e3c678] bg-[#fdf7e8] px-5 py-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#b88a2e]" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-[#6e4c0b]">{attentionText}</p>
              <p className="mt-0.5 text-sm text-[#7a540b]">
                {attentionDocuments[0].reviewerNote ?? attentionDocuments[0].title}
              </p>
            </div>
          </div>
          <Link
            to="/student/documents"
            className="rounded-lg border border-[#b88a2e] bg-white px-3.5 py-1.5 text-sm font-medium text-[#6e4c0b] hover:bg-[#faf0d2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b88a2e] whitespace-nowrap"
          >
            Review documents
          </Link>
        </section>
      )}

      {/* Four Metric Cards */}
      <section aria-label="Academic and fee summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-[#dbe4de] bg-white p-5">
          <p className="text-sm font-medium text-[#5a6a61]">Fee balance</p>
          <p className="font-heading mt-2 text-2xl font-semibold text-[#17221c] tabular-nums">
            {formatINR(feeSummary.balanceInr)}
          </p>
          <p className="mt-2 text-xs text-[#5a6a61] tabular-nums">
            Due date: {formatDate(feeDueDate)}
          </p>
          {feeSummary.pendingAmountInr > 0 && (
            <p className="mt-1 text-xs text-[#8a6111] tabular-nums">
              {formatINR(feeSummary.pendingAmountInr)} pending verification (not counted)
            </p>
          )}
        </article>

        <article className="rounded-xl border border-[#dbe4de] bg-white p-5">
          <p className="text-sm font-medium text-[#5a6a61]">Payment status</p>
          <div className="mt-2.5">
            <StatusBadge status={feeSummary.status} />
          </div>
          <p className="mt-3 text-sm text-[#17221c] tabular-nums">
            {formatINR(feeSummary.verifiedPaidInr)} of {formatINR(feeSummary.totalAmountInr)} paid
          </p>
        </article>

        <article className="rounded-xl border border-[#dbe4de] bg-white p-5">
          <p className="text-sm font-medium text-[#5a6a61]">Latest published result</p>
          {latestPublishedResult ? (
            <>
              <p className="font-heading mt-2 text-2xl font-semibold text-[#17221c] tabular-nums">
                {latestPublishedResult.sgpa.toFixed(2)} SGPA
              </p>
              <p className="mt-2 text-xs text-[#5a6a61] tabular-nums">
                Semester {latestPublishedResult.semesterNumber} · CGPA {cgpa.toFixed(2)}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-[#5a6a61]">No published results yet.</p>
          )}
        </article>

        <article className="rounded-xl border border-[#dbe4de] bg-white p-5">
          <p className="text-sm font-medium text-[#5a6a61]">Open requests</p>
          <p className="font-heading mt-2 text-2xl font-semibold text-[#17221c] tabular-nums">
            {openRequestsCount}
          </p>
          <p className="mt-2 text-xs text-[#5a6a61] tabular-nums">
            {totalRequestsCount} total requests on record
          </p>
        </article>
      </section>

      {/* Quick Actions + Recent Notifications */}
      <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
        <section className="flex flex-col rounded-xl border border-[#dbe4de] bg-white p-6 lg:col-span-5">
          <h2 className="font-heading text-lg font-semibold text-[#17221c]">
            Quick actions
          </h2>
          <div className="mt-4 grid flex-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="flex items-center justify-between rounded-lg border border-[#dbe4de] bg-[#f8faf7] px-4 py-2 text-sm font-medium text-[#17221c] transition-colors hover:border-[#185a39] hover:bg-[#eef6f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39]"
              >
                <span>{action.label}</span>
                <span aria-hidden="true" className="text-[#185a39]">→</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[#dbe4de] bg-white p-6 lg:col-span-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-semibold text-[#17221c]">
              Recent notifications
            </h2>
            <Link
              to="/student/notifications"
              className="text-sm font-medium text-[#185a39] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] rounded"
            >
              View all
            </Link>
          </div>

          {recentNotifications.length === 0 ? (
            <p className="mt-4 text-sm text-[#5a6a61]">No notifications to show.</p>
          ) : (
            <ul className="mt-4 divide-y divide-[#dbe4de]">
              {recentNotifications.map((notif) => (
                <li key={notif.id} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    {!notif.isRead ? (
                      <Bell
                        className="mt-0.5 h-4 w-4 shrink-0 text-[#b88a2e]"
                        aria-label="Unread notification"
                      />
                    ) : (
                      <Bell
                        className="mt-0.5 h-4 w-4 shrink-0 text-[#5a6a61]/50"
                        aria-hidden="true"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p
                          className={`text-sm text-[#17221c] ${
                            !notif.isRead ? 'font-semibold' : 'font-normal'
                          }`}
                        >
                          {notif.title}
                        </p>
                        <span className="text-xs text-[#5a6a61] tabular-nums">
                          {formatDate(notif.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-[#5a6a61]">
                        {notif.body}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
