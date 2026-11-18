import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { DemoFooter } from '../components/DemoFooter';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

const BENEFITS = [
  {
    title: 'Centralised student information',
    detail: 'Enrollment numbers, programme details, current semester, and contact records kept in one authoritative profile.',
  },
  {
    title: 'Online administrative requests',
    detail: 'Submit certificate, verification, and correction requests with clear ticket numbers and threaded replies.',
  },
  {
    title: 'Fee and receipt access',
    detail: 'Track annual tuition balances, verified payments, pending reconciliations, and official fee receipts.',
  },
  {
    title: 'Examination result access',
    detail: 'View published semester grade cards, course credits, SGPA, and cumulative CGPA once officially released.',
  },
  {
    title: 'Document tracking',
    detail: 'Monitor verification status for identity, admission, and bank proofs with clear reviewer remarks.',
  },
  {
    title: 'Faster communication',
    detail: 'Targeted notifications and role-scoped office routing replace scattered emails and in-person follow-ups.',
  },
];

const TIMELINE_STEPS = [
  { label: 'Submitted', date: '18 Oct 2026', detail: 'Request logged by student' },
  { label: 'Under review', date: '19 Oct 2026', detail: 'Assigned to Student Office' },
  { label: 'Resolved', date: '21 Oct 2026', detail: 'Signed letter ready for collection' },
];

export function LandingPage() {
  const { session } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-[#f8faf7] text-[#17221c]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-[#0e3623] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>

      {/* Header */}
      <header className="border-b border-[#dbe4de] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            to="/"
            className="font-heading text-lg font-semibold text-[#0e3623] sm:text-xl truncate focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] rounded"
          >
            Student Office Management System
          </Link>

          <nav aria-label="Primary actions" className="flex items-center gap-2.5 shrink-0">
            {session ? (
              <Link
                to={session.role === 'STAFF' ? '/staff' : '/student'}
                className="rounded-lg bg-[#185a39] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0e3623] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] whitespace-nowrap"
              >
                Open portal
              </Link>
            ) : (
              <>
                <Link
                  to="/login?portal=student"
                  className="rounded-lg border border-[#dbe4de] bg-white px-3.5 py-2 text-sm font-medium text-[#17221c] transition-colors hover:bg-[#eef6f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] whitespace-nowrap"
                >
                  Student login
                </Link>
                <Link
                  to="/login?portal=staff"
                  className="rounded-lg bg-[#185a39] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0e3623] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] whitespace-nowrap"
                >
                  Staff login
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        {/* Dark-green Hero */}
        <section className="bg-[#0e3623] text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:items-center lg:py-16">
            <div className="lg:col-span-7">
              <p className="text-sm font-medium text-[#d9ebde]">Avantika University</p>
              <h1 className="font-heading mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl text-balance">
                Student Office Management System
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#e5efe8] sm:text-lg">
                Student records, fees, examination results, documents and administrative requests, handled in one place instead of through email, office visits and separate platforms.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  to="/login?portal=student"
                  className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#0e3623] transition-colors hover:bg-[#eef6f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white whitespace-nowrap"
                >
                  Student login
                </Link>
                <Link
                  to="/login?portal=staff"
                  className="rounded-lg border border-white/35 bg-[#185a39] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#144a2f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white whitespace-nowrap"
                >
                  Staff login
                </Link>
              </div>
            </div>

            {/* White Sample Request Timeline Card */}
            <div className="lg:col-span-5">
              <div className="rounded-xl border border-[#dbe4de] bg-white p-6 text-[#17221c] shadow-sm">
                <div className="flex items-start justify-between gap-3 border-b border-[#dbe4de] pb-4">
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-[#17221c]">
                      Enrollment verification letter
                    </h2>
                    <p className="mt-0.5 text-xs text-[#5a6a61] tabular-nums">
                      REQ-2026-0003
                    </p>
                  </div>
                  <StatusBadge status="RESOLVED" />
                </div>

                <ol className="mt-5 space-y-4" aria-label="Sample request timeline">
                  {TIMELINE_STEPS.map((step, index) => (
                    <li key={step.label} className="flex items-start gap-3">
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eef6f0] text-[#185a39]"
                        aria-hidden="true"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-[#17221c]">
                            {index + 1}. {step.label}
                          </span>
                          <span className="text-xs text-[#5a6a61] tabular-nums">
                            {step.date}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-[#5a6a61]">{step.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                <p className="mt-5 border-t border-[#dbe4de] pt-3 text-xs text-[#5a6a61]">
                  Sample with fictional data.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Two-column Benefits List */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="max-w-2xl">
            <h2 className="font-heading text-2xl font-semibold text-[#17221c] sm:text-3xl">
              What the portal brings together
            </h2>
            <p className="mt-2 text-sm text-[#5a6a61] sm:text-base">
              Built to give students clear self-service visibility while keeping administrative operations scoped to each office group.
            </p>
          </div>

          <div className="mt-8 grid gap-x-10 gap-y-6 border-t border-[#dbe4de] pt-8 md:grid-cols-2">
            {BENEFITS.map((benefit, idx) => (
              <div key={benefit.title} className="flex items-start gap-4">
                <span className="font-heading text-base font-semibold text-[#185a39] tabular-nums">
                  0{idx + 1}.
                </span>
                <div>
                  <h3 className="font-heading text-lg font-semibold text-[#17221c]">
                    {benefit.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#5a6a61]">
                    {benefit.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Two Portal Cards */}
        <section className="border-t border-[#dbe4de] bg-[#eef6f0] py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="font-heading text-2xl font-semibold text-[#17221c] sm:text-3xl">
                Choose a sign-in portal
              </h2>
              <p className="mt-2 text-sm text-[#5a6a61]">
                Note: Choosing a portal card only opens the sign-in page with that label. It does not grant access — your portal and permissions always come from your signed-in account.
              </p>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <article className="flex flex-col justify-between rounded-xl border border-[#dbe4de] bg-white p-6 sm:p-8">
                <div>
                  <h3 className="font-heading text-xl font-semibold text-[#17221c]">
                    Student Portal
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#5a6a61]">
                    Check your enrollment summary, fee balance and receipts, published semester results, submitted requests, document review status, and notifications.
                  </p>
                </div>
                <div className="mt-6">
                  <Link
                    to="/login?portal=student"
                    className="inline-flex items-center rounded-lg bg-[#185a39] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0e3623] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] whitespace-nowrap"
                  >
                    Continue to Student login
                  </Link>
                </div>
              </article>

              <article className="flex flex-col justify-between rounded-xl border border-[#dbe4de] bg-white p-6 sm:p-8">
                <div>
                  <h3 className="font-heading text-xl font-semibold text-[#17221c]">
                    Administrative Staff Portal
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#5a6a61]">
                    Access student search, fee reconciliation, examination moderation, request handling, and audit oversight strictly according to your staff group permissions.
                  </p>
                </div>
                <div className="mt-6">
                  <Link
                    to="/login?portal=staff"
                    className="inline-flex items-center rounded-lg border border-[#185a39] bg-white px-4 py-2 text-sm font-medium text-[#185a39] transition-colors hover:bg-[#eef6f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] whitespace-nowrap"
                  >
                    Continue to Staff login
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* Privacy / Demo Notice */}
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="rounded-xl border border-[#dbe4de] bg-white p-6">
            <h2 className="font-heading text-lg font-semibold text-[#17221c]">
              Privacy and academic demonstration notice
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5a6a61]">
              All student names, enrollment numbers, fee ledgers, grade sheets, and administrative tickets in this system are fictional academic demonstration data. No real student records or external servers are connected; state is simulated locally in your browser.
            </p>
          </div>
        </section>
      </main>

      <DemoFooter />
    </div>
  );
}
