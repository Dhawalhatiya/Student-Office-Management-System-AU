import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { DemoFooter } from '../components/DemoFooter';
import { useAuth } from '../context/AuthContext';
import { DEMO_ACCOUNTS_DISPLAY } from '../data/seed';
import { validateEmail } from '../utils/calculations';

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const portalParam = searchParams.get('portal');
  const isStaffHint = portalParam === 'staff';

  const { session, signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session) {
      navigate(session.role === 'STAFF' ? '/staff' : '/student', { replace: true });
    }
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    setFormError(null);

    if (!validateEmail(email)) {
      setFieldError('Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn(email, password);
      if (!result.ok) {
        if (result.fieldError) {
          setFieldError(result.fieldError);
        } else {
          setFormError(result.error ?? 'Email or password is incorrect.');
        }
        return;
      }

      navigate(result.redirectTo ?? '/', { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setFieldError(null);
    setFormError(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f8faf7] text-[#17221c]">
      <header className="border-b border-[#dbe4de] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            to="/"
            className="font-heading text-lg font-semibold text-[#0e3623] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] rounded"
          >
            Student Office Management System
          </Link>
          <Link
            to="/"
            className="text-sm font-medium text-[#185a39] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] rounded whitespace-nowrap"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:grid lg:grid-cols-12 lg:items-start">
        {/* Sign-In Form */}
        <section className="rounded-xl border border-[#dbe4de] bg-white p-6 sm:p-8 lg:col-span-6">
          <h1 className="font-heading text-2xl font-semibold text-[#17221c]">
            {isStaffHint ? 'Administrative Staff sign in' : 'Student Portal sign in'}
          </h1>
          <p className="mt-1.5 text-sm text-[#5a6a61]">
            Enter your university credentials. Your portal access is determined by your account role, regardless of which sign-in link you followed.
          </p>

          {formError && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]"
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-[#17221c]"
              >
                Email address
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldError) setFieldError(null);
                }}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? 'login-email-error' : undefined}
                placeholder="name@example.com"
                className="mt-1.5 block w-full rounded-lg border border-[#dbe4de] bg-white px-3.5 py-2.5 text-sm text-[#17221c] placeholder:text-[#5a6a61] focus:border-[#185a39] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#185a39]"
              />
              {fieldError && (
                <p id="login-email-error" role="alert" className="mt-1.5 text-xs text-[#b91c1c]">
                  {fieldError}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-[#17221c]"
              >
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="mt-1.5 block w-full rounded-lg border border-[#dbe4de] bg-white px-3.5 py-2.5 text-sm text-[#17221c] placeholder:text-[#5a6a61] focus:border-[#185a39] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#185a39]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[#185a39] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0e3623] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39]"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </section>

        {/* Demo Accounts List */}
        <aside className="rounded-xl border border-[#dbe4de] bg-[#eef6f0] p-6 sm:p-7 lg:col-span-6">
          <h2 className="font-heading text-lg font-semibold text-[#17221c]">
            Demo accounts (development only)
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[#5a6a61]">
            These fictional accounts are provided for demonstration and evaluation only and are not production credentials.
          </p>

          <ul className="mt-4 divide-y divide-[#dbe4de] rounded-lg border border-[#dbe4de] bg-white">
            {DEMO_ACCOUNTS_DISPLAY.map((acc) => (
              <li
                key={acc.email}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#17221c]">{acc.label}</p>
                  <p className="mt-0.5 text-xs text-[#5a6a61] tabular-nums">
                    {acc.email} · {acc.password}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleFillDemo(acc.email, acc.password)}
                  className="rounded-lg border border-[#dbe4de] bg-[#f8faf7] px-3 py-1.5 text-xs font-medium text-[#185a39] transition-colors hover:bg-[#d9ebde] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] whitespace-nowrap"
                >
                  Fill
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </main>

      <DemoFooter compact />
    </div>
  );
}
