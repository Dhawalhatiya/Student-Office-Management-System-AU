import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { hasPermission } from '../../auth/permissions';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { db, type StudentSearchRow } from '../../db/db';
import { MAX_SEARCH_LENGTH, sanitizeSearchQuery } from '../../utils/calculations';

export function StaffStudentSearch() {
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';

  const [inputValue, setInputValue] = useState(initialQuery);
  const [rows, setRows] = useState<StudentSearchRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const canReadFees = hasPermission(session, 'fees.read');

  const runSearch = useCallback(async (queryText: string) => {
    const check = sanitizeSearchQuery(queryText);
    if (!check.valid) {
      setValidationError(check.error ?? 'Search query is too long.');
      setRows([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setValidationError(null);
    setLoading(true);
    try {
      const res = await db.searchStudents(check.query);
      if (res.error) {
        setValidationError(res.error);
        setRows([]);
        setTotalCount(0);
      } else {
        setRows(res.rows);
        setTotalCount(res.totalCount);
        setLoadError(null);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to search students.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const qParam = searchParams.get('q') ?? '';
    setInputValue(qParam);
    void runSearch(qParam);
  }, [searchParams, runSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = sanitizeSearchQuery(inputValue);
    if (!check.valid) {
      setValidationError(check.error ?? 'Search query is too long.');
      return;
    }
    if (check.query) {
      setSearchParams({ q: check.query });
    } else {
      setSearchParams({});
    }
  };

  const handleClear = () => {
    setInputValue('');
    setValidationError(null);
    setSearchParams({});
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[#dbe4de] pb-4">
        <h1 className="font-heading text-2xl font-semibold text-[#17221c] sm:text-3xl">
          Student Search
        </h1>
        <p className="mt-1 text-sm text-[#5a6a61]">
          Search fictional student records by exact enrollment number or student name (up to 50 results shown).
        </p>
      </div>

      <section className="rounded-xl border border-[#dbe4de] bg-white p-5">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3" noValidate>
          <div className="min-w-[240px] flex-1">
            <label htmlFor="staff-search-input" className="block text-sm font-medium text-[#17221c]">
              Enrollment number or student name
            </label>
            <div className="relative mt-1.5">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#5a6a61]"
                aria-hidden="true"
              />
              <input
                id="staff-search-input"
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (validationError && e.target.value.trim().length <= MAX_SEARCH_LENGTH) {
                    setValidationError(null);
                  }
                }}
                placeholder="e.g. AVU-DEMO-24-CSE-001 or Aarav Mehta"
                aria-invalid={Boolean(validationError)}
                aria-describedby="staff-search-hint"
                className="block w-full rounded-lg border border-[#dbe4de] bg-white py-2 pr-3 pl-9 text-sm text-[#17221c] placeholder:text-[#5a6a61] focus:border-[#185a39] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#185a39]"
              />
            </div>
            <p id="staff-search-hint" className="mt-1 text-xs text-[#5a6a61]">
              Maximum {MAX_SEARCH_LENGTH} characters. Input is treated strictly as plain text.
            </p>
          </div>

          <div className="flex items-center gap-2 pb-5">
            <button
              type="submit"
              className="rounded-lg bg-[#185a39] px-4 py-2 text-sm font-medium text-white hover:bg-[#0e3623] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] whitespace-nowrap"
            >
              Search
            </button>
            {inputValue && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg border border-[#dbe4de] bg-white px-3.5 py-2 text-sm font-medium text-[#17221c] hover:bg-[#eef6f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {validationError && (
          <p role="alert" className="mt-2 text-sm text-[#b91c1c]">
            {validationError}
          </p>
        )}
      </section>

      {loading ? (
        <div className="h-56 animate-pulse rounded-xl border border-[#dbe4de] bg-white" aria-busy="true" />
      ) : loadError ? (
        <div role="alert" className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-6 text-sm text-[#b91c1c]">
          {loadError}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-[#dbe4de] bg-white p-10 text-center">
          <p className="text-base font-medium text-[#17221c]">No students match your search</p>
          <p className="mt-1 text-sm text-[#5a6a61]">
            Check the enrollment number format (for example AVU-DEMO-24-CSE-001) or clear the filter to view all students.
          </p>
        </div>
      ) : (
        <section className="rounded-xl border border-[#dbe4de] bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[#5a6a61] tabular-nums">
              Showing {rows.length} of {totalCount} matching {totalCount === 1 ? 'student' : 'students'}
            </p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#dbe4de] text-xs font-medium text-[#5a6a61]">
                  <th className="py-2.5 pr-4">Enrollment no.</th>
                  <th className="py-2.5 pr-4">Name</th>
                  <th className="py-2.5 pr-4">Programme</th>
                  <th className="py-2.5 pr-4">Batch</th>
                  <th className="py-2.5 pr-4">Semester</th>
                  <th className="py-2.5 pr-4">Enrollment status</th>
                  {canReadFees && <th className="py-2.5">Fee status</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dbe4de]">
                {rows.map((stu) => (
                  <tr key={stu.id} className="hover:bg-[#f8faf7]">
                    <td className="py-3 pr-4 font-medium text-[#17221c] tabular-nums whitespace-nowrap">
                      {stu.enrollmentNumber}
                    </td>
                    <td className="py-3 pr-4 font-medium text-[#17221c]">{stu.fullName}</td>
                    <td className="py-3 pr-4 text-[#5a6a61]">{stu.programmeName}</td>
                    <td className="py-3 pr-4 text-[#17221c] tabular-nums">{stu.batchYear}</td>
                    <td className="py-3 pr-4 text-[#17221c] tabular-nums">
                      Semester {stu.currentSemester}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={stu.enrollmentStatus} />
                    </td>
                    {canReadFees && (
                      <td className="py-3">
                        {stu.feeStatus ? <StatusBadge status={stu.feeStatus} /> : '—'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
