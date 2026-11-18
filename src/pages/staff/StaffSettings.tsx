import { useEffect, useState } from 'react';
import { STAFF_GROUP_LABELS } from '../../auth/permissions';
import { useAuth } from '../../context/AuthContext';
import { checkIsDemoDataSeeded, seedDemoDataOnce } from '../../db/seedFirestore';
import { formatReadableFirestoreError } from '../../firebase/errors';

export function StaffSettings() {
  const { session } = useAuth();
  const isDevAdmin = Boolean(import.meta.env.DEV) && session?.staffGroup === 'STUDENT_OFFICE';

  const [checkingSeed, setCheckingSeed] = useState(isDevAdmin);
  const [alreadySeeded, setAlreadySeeded] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDevAdmin) return;
    let active = true;
    void checkIsDemoDataSeeded()
      .then((seeded) => {
        if (active) {
          setAlreadySeeded(seeded);
        }
      })
      .finally(() => {
        if (active) {
          setCheckingSeed(false);
        }
      });
    return () => {
      active = false;
    };
  }, [isDevAdmin]);

  if (!session || session.role !== 'STAFF') return null;

  const handleLoadDemoData = async () => {
    if (!isDevAdmin) return;
    setSeeding(true);
    setSeedMessage(null);
    setSeedError(null);
    try {
      const result = await seedDemoDataOnce();
      setSeedMessage(result.message);
      setAlreadySeeded(true);
    } catch (err) {
      setSeedError(
        formatReadableFirestoreError(err, 'Failed to seed demo data into Firestore.')
      );
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="border-b border-[#dbe4de] pb-4">
        <h1 className="font-heading text-2xl font-semibold text-[#17221c] sm:text-3xl">
          Settings and Access Scope
        </h1>
        <p className="mt-1 text-sm text-[#5a6a61]">
          Account identity, assigned administrative staff group, and least-privilege permissions.
        </p>
      </div>

      <section className="rounded-xl border border-[#dbe4de] bg-white p-6">
        <h2 className="font-heading text-lg font-semibold text-[#17221c]">
          Staff account profile
        </h2>
        <dl className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-[#5a6a61]">Full name</dt>
            <dd className="mt-1 text-sm font-medium text-[#17221c]">{session.fullName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[#5a6a61]">Email address</dt>
            <dd className="mt-1 text-sm font-medium text-[#17221c]">{session.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[#5a6a61]">Designation</dt>
            <dd className="mt-1 text-sm font-medium text-[#17221c]">{session.designation}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[#5a6a61]">Staff group</dt>
            <dd className="mt-1 text-sm font-medium text-[#17221c]">
              {STAFF_GROUP_LABELS[session.staffGroup!]} ({session.staffGroup})
            </dd>
          </div>
        </dl>

        <div className="mt-6 rounded-lg border border-[#dbe4de] bg-[#eef6f0] p-4 text-sm text-[#17221c]">
          This system uses least-privilege staff groups only. There is no Super Admin account or unrestricted override role.
        </div>
      </section>

      <section className="rounded-xl border border-[#dbe4de] bg-white p-6">
        <h2 className="font-heading text-lg font-semibold text-[#17221c]">
          Granted permissions ({session.permissions.length})
        </h2>
        <p className="mt-1 text-sm text-[#5a6a61]">
          Routes and dashboard widgets outside this list are hidden and blocked by the central permissions module.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {session.permissions.map((perm) => (
            <li
              key={perm}
              className="rounded-lg border border-[#dbe4de] bg-[#f8faf7] px-3.5 py-2 font-mono text-xs text-[#17221c]"
            >
              {perm}
            </li>
          ))}
        </ul>
      </section>

      {isDevAdmin && (
        <section className="rounded-xl border border-[#dbe4de] bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-heading text-lg font-semibold text-[#17221c]">
                Demo data loader (development only)
              </h2>
              <p className="mt-1 text-sm text-[#5a6a61]">
                Admin-only tool for Student Office staff in development mode. Writes the fictional demo dataset once using the meta/seedStatus guard.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleLoadDemoData()}
              disabled={checkingSeed || seeding || alreadySeeded}
              className="rounded-lg bg-[#185a39] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0e3623] disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] whitespace-nowrap"
            >
              {checkingSeed
                ? 'Checking seed status...'
                : seeding
                  ? 'Loading demo data...'
                  : alreadySeeded
                    ? 'Demo data already loaded'
                    : 'Load demo data'}
            </button>
          </div>

          {seedMessage && (
            <p role="status" className="mt-4 rounded-lg border border-[#d9ebde] bg-[#eef6f0] px-4 py-3 text-sm text-[#0e3623]">
              {seedMessage}
            </p>
          )}
          {seedError && (
            <p role="alert" className="mt-4 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
              {seedError}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
