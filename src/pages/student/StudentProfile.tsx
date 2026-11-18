import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../components/StatusBadge';
import { db, type StudentProfilePayload } from '../../db/db';
import { formatReadableFirestoreError } from '../../firebase/errors';
import { formatDate } from '../../utils/format';

export function StudentProfile() {
  const [data, setData] = useState<StudentProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    db.getStudentProfile()
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) setError(formatReadableFirestoreError(err, 'Unable to load profile.'));
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
      <div className="h-64 animate-pulse rounded-xl border border-[#dbe4de] bg-white" aria-busy="true" />
    );
  }

  if (error || !data) {
    return (
      <div role="alert" className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-6 text-sm text-[#b91c1c]">
        {error ?? 'Unable to load student profile.'}
      </div>
    );
  }

  const { student, department, programme, academicYear } = data;

  const fields: Array<{ label: string; value: string; tabular?: boolean }> = [
    { label: 'Enrollment number', value: student.enrollmentNumber, tabular: true },
    { label: 'Full name', value: student.fullName },
    { label: 'Date of birth', value: formatDate(student.dateOfBirth), tabular: true },
    { label: 'Email address', value: student.email },
    { label: 'Phone number', value: student.phone, tabular: true },
    { label: 'Department', value: department.name },
    { label: 'Programme', value: programme.name },
    { label: 'Batch', value: String(student.batchYear), tabular: true },
    { label: 'Current semester', value: `Semester ${student.currentSemester}`, tabular: true },
    { label: 'Academic year', value: academicYear.label, tabular: true },
    { label: 'Address', value: student.address },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dbe4de] pb-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-[#17221c] sm:text-3xl">
            My Profile
          </h1>
          <p className="mt-1 text-sm text-[#5a6a61]">
            Official academic and personal enrollment details on university record.
          </p>
        </div>
        <StatusBadge status={student.enrollmentStatus} />
      </div>

      <section className="rounded-xl border border-[#dbe4de] bg-white p-6">
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.label} className={field.label === 'Address' ? 'sm:col-span-2' : ''}>
              <dt className="text-xs font-medium text-[#5a6a61]">{field.label}</dt>
              <dd
                className={`mt-1 text-sm font-medium text-[#17221c] ${
                  field.tabular ? 'tabular-nums' : ''
                }`}
              >
                {field.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#dbe4de] pt-5">
          <p className="text-sm text-[#5a6a61]">
            Protected fields are read-only and can only be updated by submitting a Profile correction request.
          </p>
          <Link
            to="/student/requests"
            className="rounded-lg border border-[#185a39] bg-white px-4 py-2 text-sm font-medium text-[#185a39] hover:bg-[#eef6f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] whitespace-nowrap"
          >
            Request profile correction
          </Link>
        </div>
      </section>
    </div>
  );
}
