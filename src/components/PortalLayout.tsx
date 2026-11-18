import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, X } from 'lucide-react';
import { STAFF_GROUP_LABELS, hasPermission } from '../auth/permissions';
import { useAuth } from '../context/AuthContext';
import type { Permission } from '../types/domain';
import { MAX_SEARCH_LENGTH, sanitizeSearchQuery } from '../utils/calculations';
import { DemoFooter } from './DemoFooter';

interface NavItem {
  label: string;
  to: string;
  requiredPermission?: Permission;
  showUnreadBadge?: boolean;
}

const STUDENT_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/student' },
  { label: 'My Profile', to: '/student/profile' },
  { label: 'Fees and Receipts', to: '/student/fees' },
  { label: 'Examination Results', to: '/student/results' },
  { label: 'My Requests', to: '/student/requests' },
  { label: 'My Documents', to: '/student/documents' },
  { label: 'Scholarships', to: '/student/scholarships' },
  { label: 'Notifications', to: '/student/notifications', showUnreadBadge: true },
  { label: 'Help and FAQs', to: '/student/faqs' },
];

const STAFF_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/staff' },
  { label: 'Student Search', to: '/staff/search', requiredPermission: 'students.read' },
  { label: 'Student Records', to: '/staff/students', requiredPermission: 'students.write' },
  { label: 'Fees and Receipts', to: '/staff/fees', requiredPermission: 'fees.read' },
  { label: 'Results', to: '/staff/results', requiredPermission: 'results.read' },
  { label: 'Requests', to: '/staff/requests', requiredPermission: 'requests.read' },
  { label: 'Documents', to: '/staff/documents', requiredPermission: 'documents.review' },
  { label: 'Scholarships', to: '/staff/scholarships', requiredPermission: 'scholarships.read' },
  { label: 'Reports and Exports', to: '/staff/reports', requiredPermission: 'reports.export' },
  { label: 'AI Data Assistant', to: '/staff/ai-assistant', requiredPermission: 'ai.assistant' },
  { label: 'Notifications', to: '/staff/notifications', showUnreadBadge: true },
  { label: 'Settings', to: '/staff/settings' },
];

export function PortalLayout({ children }: { children: React.ReactNode }) {
  const { session, unreadCount, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  if (!session) return null;

  const isStaff = session.role === 'STAFF';
  const navItems = isStaff
    ? STAFF_NAV.filter(
        (item) => !item.requiredPermission || hasPermission(session, item.requiredPermission)
      )
    : STUDENT_NAV;

  const roleLabel = isStaff
    ? `${STAFF_GROUP_LABELS[session.staffGroup!]} staff`
    : 'Student';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleStaffSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const check = sanitizeSearchQuery(searchInput);
    if (!check.valid) {
      setSearchError(check.error ?? 'Search query is too long.');
      return;
    }
    setSearchError(null);
    const qs = check.query ? `?q=${encodeURIComponent(check.query)}` : '';
    navigate(`/staff/search${qs}`);
  };

  const renderNavLinks = (onNavigate?: () => void) => (
    <nav aria-label="Portal navigation" className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
      {navItems.map((item) => {
        const isRoot = item.to === '/student' || item.to === '/staff';
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={isRoot}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-full px-4 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                isActive
                  ? 'bg-white font-semibold text-[#0e3623]'
                  : 'text-[#e5efe8] hover:bg-[#185a39] hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span aria-current={isActive ? 'page' : undefined} className="truncate">
                  {item.label}
                </span>
                {item.showUnreadBadge && unreadCount > 0 && (
                  <span
                    className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-[#b88a2e] px-1.5 py-0.5 text-xs font-semibold text-white tabular-nums"
                    aria-label={`${unreadCount} unread notifications`}
                  >
                    {unreadCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[#f8faf7] text-[#17221c]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-[#0e3623] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:outline-2 focus:outline-[#b88a2e]"
      >
        Skip to content
      </a>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col bg-[#0e3623] text-white">
        <div className="border-b border-white/15 px-5 py-5">
          <Link
            to={isStaff ? '/staff' : '/student'}
            className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
          >
            <span className="font-heading block text-base font-semibold leading-snug text-white">
              Student Office Management System
            </span>
            <span className="mt-1 block text-xs text-[#cde0d3]">
              Avantika University
            </span>
          </Link>
        </div>
        {renderNavLinks()}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 flex w-72 max-w-[85vw] flex-col bg-[#0e3623] text-white shadow-xl">
            <div className="flex items-center justify-between border-b border-white/15 px-5 py-4">
              <div>
                <span className="font-heading block text-sm font-semibold text-white">
                  Student Office Management System
                </span>
                <span className="block text-xs text-[#cde0d3]">Avantika University</span>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-[#185a39] focus-visible:outline-2 focus-visible:outline-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderNavLinks(() => setDrawerOpen(false))}
          </div>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-[#dbe4de] bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation menu"
                aria-expanded={drawerOpen}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#dbe4de] bg-white text-[#17221c] hover:bg-[#eef6f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              {!isStaff && (
                <span className="text-sm font-medium text-[#5a6a61]">
                  Student Portal
                </span>
              )}
              {isStaff && !hasPermission(session, 'students.read') && (
                <span className="text-sm font-medium text-[#5a6a61]">
                  Administrative Staff Portal
                </span>
              )}
            </div>

            {isStaff && hasPermission(session, 'students.read') && (
              <form
                onSubmit={handleStaffSearch}
                className="order-3 flex w-full items-center gap-2 sm:order-none sm:w-auto sm:flex-1 sm:max-w-md"
                role="search"
                aria-label="Search students"
              >
                <label htmlFor="topbar-student-search" className="sr-only">
                  Search by enrollment number or student name
                </label>
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#5a6a61]"
                    aria-hidden="true"
                  />
                  <input
                    id="topbar-student-search"
                    type="search"
                    value={searchInput}
                    maxLength={MAX_SEARCH_LENGTH + 10}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      if (searchError) setSearchError(null);
                    }}
                    placeholder="Enrollment no. or name"
                    className="w-full rounded-lg border border-[#dbe4de] bg-[#f8faf7] py-1.5 pr-3 pl-9 text-sm text-[#17221c] placeholder:text-[#5a6a61] focus:border-[#185a39] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#185a39]"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg border border-[#dbe4de] bg-[#eef6f0] px-3 py-1.5 text-sm font-medium text-[#185a39] hover:bg-[#d9ebde] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] whitespace-nowrap shrink-0"
                >
                  Search
                </button>
                {searchError && (
                  <span className="text-xs text-[#b91c1c]" role="alert">
                    {searchError}
                  </span>
                )}
              </form>
            )}

            <div className="flex items-center gap-4 ml-auto">
              <div className="text-right min-w-0">
                <p className="truncate text-sm font-medium text-[#17221c]">
                  {session.fullName}
                </p>
                <p className="truncate text-xs text-[#5a6a61]">{roleLabel}</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-lg border border-[#dbe4de] bg-white px-3.5 py-2 text-sm font-medium text-[#17221c] transition-colors hover:bg-[#eef6f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#185a39] whitespace-nowrap shrink-0"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>

        <DemoFooter compact />
      </div>
    </div>
  );
}
