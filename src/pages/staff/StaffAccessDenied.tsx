import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { STAFF_GROUP_LABELS } from '../../auth/permissions';
import { useAuth } from '../../context/AuthContext';

export function StaffAccessDenied() {
  const { session } = useAuth();
  const location = useLocation();
  const state = location.state as { attemptedPath?: string } | null;
  const attemptedPath =
    state?.attemptedPath ??
    (location.pathname !== '/staff/access-denied' ? location.pathname : undefined);

  return (
    <div className="mx-auto max-w-2xl py-6">
      <section
        role="alert"
        className="rounded-xl border border-[#fecaca] bg-white p-6 sm:p-8"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#fef2f2] text-[#b91c1c]">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold text-[#17221c]">
              Access denied
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#17221c]">
              You do not have access to this area. This attempt has been recorded.
            </p>
            {attemptedPath && (
              <p className="mt-2 text-xs text-[#5a6a61] tabular-nums">
                Requested area: {attemptedPath}
              </p>
            )}
            {session?.staffGroup && (
              <p className="mt-1 text-xs text-[#5a6a61]">
                Signed-in group: {STAFF_GROUP_LABELS[session.staffGroup]}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#dbe4de] pt-5">
          <Link
            to="/staff"
            className="rounded-lg bg-[#185a39] px-4 py-2 text-sm font-medium text-white hover:bg-[#0e3623] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] whitespace-nowrap"
          >
            Return to Staff Dashboard
          </Link>
          <Link
            to="/staff/settings"
            className="rounded-lg border border-[#dbe4de] bg-white px-4 py-2 text-sm font-medium text-[#17221c] hover:bg-[#eef6f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] whitespace-nowrap"
          >
            View my permissions
          </Link>
        </div>
      </section>
    </div>
  );
}
