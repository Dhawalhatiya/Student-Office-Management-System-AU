import { STAFF_GROUP_LABELS } from '../../auth/permissions';
import { useAuth } from '../../context/AuthContext';

export function StaffSettings() {
  const { session } = useAuth();
  if (!session || session.role !== 'STAFF') return null;

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
    </div>
  );
}
