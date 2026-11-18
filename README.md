# Student Office Management System — Avantika University

> **Academic Demonstration Notice:** All student records, enrollment numbers, fee ledgers, examination results, documents, requests, and credentials in this repository are **100% fictional**. Access control, authentication, and persistence run locally in the browser for demonstration purposes only.

A centralised academic portal built with **React**, **TypeScript**, **Tailwind CSS**, and **React Router** to bring together student records, fee balances and receipts, published examination results, document verification tracking, and administrative requests in a single role-scoped web application.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Demo Accounts](#demo-accounts)
- [Roles & Least-Privilege Permissions](#roles--least-privilege-permissions)
- [Portal Capabilities & Phase Roadmap](#portal-capabilities--phase-roadmap)
- [Domain Rules & Seed Data](#domain-rules--seed-data)
- [Security & Audit Controls](#security--audit-controls)
- [Design System & Accessibility](#design-system--accessibility)
- [Project Structure](#project-structure)

---

## Overview

The **Student Office Management System** replaces fragmented email threads, physical office visits, and separate spreadsheets with two dedicated, permission-isolated portals:

1. **Student Portal (`/student`)** — Self-service visibility into enrollment details, verified fee balances, published semester SGPA/CGPA, document attention alerts, notifications, and FAQs.
2. **Administrative Staff Portal (`/staff`)** — Least-privilege operational workspace scoped to four distinct administrative groups (`STUDENT_OFFICE`, `FINANCE`, `EXAMINATION`, and `ACADEMIC`), with no unrestricted Super Admin role.

All data operations route through a typed asynchronous in-memory database layer (`src/db/db.ts`) persisted to `localStorage` (`avu_soms_db_v1`), with every access check enforced through one central `auth` + `permissions` boundary (`src/auth/auth.ts`, `src/auth/permissions.ts`).

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | React 19 + TypeScript |
| Routing | React Router DOM v7 (`BrowserRouter`) |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Icons | Lucide React |
| Build Tool | Vite 8 |
| Persistence | Typed async in-memory store backed by `localStorage` |
| Unit Testing | Node.js built-in `node:test` + `node:assert/strict` via `tsx` |

---

## Getting Started

### Prerequisites

- **Node.js** 20+ and **npm**

### Installation & Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start the development server on http://localhost:3000
npm run dev
```

### Verification & Build Commands

```bash
# Run pure logic, RBAC, rate-limiting, and seed unit tests
npx tsx --test src/logic.test.ts

# TypeScript type check
npm run lint

# Production build (outputs to dist/)
npm run build

# Preview production build
npm run preview
```

> **Note:** To reset the simulated browser database back to its initial fictional seed state, clear `avu_soms_db_v1` and `avu_soms_session_v1` from `localStorage` in browser DevTools and reload the page.

---

## Demo Accounts

These fictional accounts are available on the `/login` page with one-click **Fill** buttons for testing and evaluation only:

| Role / Group | Name | Email | Password | Highlights |
| --- | --- | --- | --- | --- |
| Student | Aarav Mehta | `student.demo@example.com` | `DemoStudent123!` | `AVU-DEMO-24-CSE-001`, B.Tech CSE, Batch 2024, Sem 5 |
| Student Office | Ritu Kapoor | `staff.demo@example.com` | `DemoStaff123!` | Full student office, document, request & audit read access |
| Finance | Karan Malhotra | `finance.demo@example.com` | `DemoStaff123!` | Fee ledger, requests read, reports & AI assistant |
| Examination | Neha Iyer | `exam.demo@example.com` | `DemoStaff123!` | Results write/publish, requests read & reports |
| Academic | Anil Verma | `academic.demo@example.com` | `DemoStaff123!` | Results read, scholarships read, requests & reports |

> **Portal Routing Rule:** Choosing **Student login** or **Staff login** on the landing page only opens `/login?portal=student|staff` with contextual framing. Your destination portal and permissions always come strictly from the signed-in account.

---

## Roles & Least-Privilege Permissions

Only **two roles** exist in the system: `STUDENT` and `STAFF`. There is **no Super Admin** role.

### Student Role (`STUDENT`)
- Strictly scoped to the authenticated student's own `studentId`.
- Cannot read another student's records or navigate to `/staff/*` (automatically redirected to `/student`).

### Staff Groups (`STAFF`)

| Permission | `STUDENT_OFFICE` | `FINANCE` | `EXAMINATION` | `ACADEMIC` |
| --- | :---: | :---: | :---: | :---: |
| `students.read` | Yes | Yes | Yes | Yes |
| `students.write` | Yes | — | — | — |
| `fees.read` | Yes | Yes | — | — |
| `fees.write` | — | Yes | — | — |
| `results.read` | Yes | — | Yes | Yes |
| `results.write` | — | — | Yes | — |
| `results.publish` | — | — | Yes | — |
| `requests.read` | Yes | Yes | Yes | Yes |
| `requests.manage` | Yes | — | — | — |
| `documents.review` | Yes | — | — | — |
| `scholarships.read` | Yes | — | — | Yes |
| `scholarships.manage` | Yes | — | — | — |
| `reports.export` | Yes | Yes | Yes | Yes |
| `ai.assistant` | Yes | Yes | — | — |
| `audit.read` | Yes | — | — | — |

### Route Access Behaviour
- Staff navigating to `/student/*` are redirected to `/staff`.
- Staff navigating to a `/staff/*` route outside their group's permissions (for example, Finance opening `/staff/results` or Examination opening `/staff/fees`) are shown the **Access denied** screen (`"You do not have access to this area. This attempt has been recorded."`) and an `ACCESS_DENIED` audit log entry is written.

---

## Portal Capabilities & Phase Roadmap

### Public Routes
- **`/` (Landing Page)** — Hero with fictional sample request timeline (`REQ-2026-0003`), two-column benefits summary, Student/Staff portal entry cards, privacy notice, and demo disclaimer footer.
- **`/login`** — Validated sign-in form, rate limiting, and development demo account quick-fill list.

### Student Portal (`/student/*`)
| Section | Route | Status | Details |
| --- | --- | --- | --- |
| Dashboard | `/student` | Built | Enrollment summary, fee balance & status, latest published SGPA/CGPA, open requests, document attention banner, quick actions, recent notifications |
| My Profile | `/student/profile` | Built | Read-only academic & personal record with correction request note |
| Notifications | `/student/notifications` | Built | All/Unread filters, gold unread indicators, mark-as-read actions |
| Help and FAQs | `/student/faqs` | Built | Accessible accordion covering profile, fees, results, documents & requests |
| Fees and Receipts | `/student/fees` | Planned (Phase 2) | Itemised ledger, payment breakdown, receipt downloads |
| Examination Results | `/student/results` | Planned (Phase 2) | Semester grade cards and SGPA/CGPA breakdowns |
| My Requests | `/student/requests` | Planned (Phase 2) | Ticket queue, threaded replies, new request submission form |
| My Documents | `/student/documents` | Planned (Phase 3) | Verification status checklist and replacement uploads |
| Scholarships | `/student/scholarships` | Planned (Phase 3) | Eligibility requirements and application status |

### Staff Portal (`/staff/*`)
| Section | Route | Required Permission | Status |
| --- | --- | --- | --- |
| Dashboard | `/staff` | Authenticated Staff | Built (metrics & widgets filtered per permission) |
| Student Search | `/staff/search` | `students.read` | Built (enrollment no. / name search, 64-char limit, max 50 rows) |
| Notifications | `/staff/notifications` | Authenticated Staff | Built |
| Settings | `/staff/settings` | Authenticated Staff | Built (staff profile, group, granted permissions, no-Super-Admin notice) |
| Access Denied | `/staff/access-denied` | Authenticated Staff | Built |
| Student Records | `/staff/students` | `students.write` | Planned (Phase 2) |
| Fees and Receipts | `/staff/fees` | `fees.read` | Planned (Phase 2) |
| Results | `/staff/results` | `results.read` | Planned (Phase 2) |
| Requests | `/staff/requests` | `requests.read` | Planned (Phase 2) |
| Documents | `/staff/documents` | `documents.review` | Planned (Phase 3) |
| Scholarships | `/staff/scholarships` | `scholarships.read` | Planned (Phase 3) |
| Reports and Exports | `/staff/reports` | `reports.export` | Planned (Phase 3) |
| AI Data Assistant | `/staff/ai-assistant` | `ai.assistant` | Planned (Phase 4) |

---

## Domain Rules & Seed Data

- **Fictional Seed Corpus**:
  - **3 Departments**: CSE, ECE, School of Management.
  - **4 Programmes**: B.Tech CSE, B.Tech ECE, BBA, MBA.
  - **4 Academic Years**: `2023-24` to `2026-27` (`2026-27` active).
  - **37 Fictional Students** across batches `2023`–`2026` with unique enrollment numbers (`AVU-DEMO-YY-PROG-NNN`) and computed semester `(2026 - batch) * 2 + 1`.
- **Fee Calculation Rule**:
  - Whole rupees formatted using `en-IN` (`₹1,45,000`).
  - Fee status (`PAID`, `PARTIAL`, `UNPAID`) is derived **strictly from `VERIFIED` payments**. `PENDING` or `REJECTED` payments never reduce the student's payable balance.
- **Result Visibility & Grading**:
  - Grades (`O`, `A+`, `A`, `B+`, `B`, `C`, `F`) are computed from marks; SGPA and CGPA are credit-weighted averages.
  - Result statuses are `DRAFT`, `UNDER_REVIEW`, `APPROVED`, and `PUBLISHED`. Students can **only** view `PUBLISHED` results (for example, Aarav Mehta's Semester 5 `DRAFT` result is completely hidden in the Student Portal).
- **Formatting**:
  - Dates formatted consistently as `15 Nov 2026`.
  - Status badges use sentence case (`Waiting for student`, `Under review`, `Replacement required`) with semantic green, amber, red, blue, and grey styling.

---

## Security & Audit Controls

- **Password Storage**: Passwords are stored exclusively as salted two-round SHA-256 hashes (`src/utils/crypto.ts`) and never stored in plain text in the database or audit logs.
- **Generic Authentication Errors**: Unknown email addresses and incorrect passwords both return `"Email or password is incorrect."` to prevent account enumeration.
- **Rate Limiting**: 5 failed sign-in attempts per email within a 15-minute window lock further attempts with `"Too many sign-in attempts. Try again in about N minutes."`.
- **Input Safety**: Staff student search trims and validates queries to a maximum of 64 characters and renders all results strictly as plain text.
- **Audit Log Events**: Automatically records `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOGIN_RATE_LIMITED`, `LOGOUT`, and `ACCESS_DENIED` events (visible on the Staff Dashboard only to staff with `audit.read`).

---

## Design System & Accessibility

- **Palette**: Deep green sidebar (`#0e3623`), primary green (`#185a39`), light green tints (`#eef6f0` / `#d9ebde`), page canvas (`#f8faf7`), primary ink (`#17221c`), muted text (`#5a6a61`), hairline borders (`#dbe4de`), and restrained gold accent (`#b88a2e`) for unread indicators and attention banners.
- **Typography**: Editorial serif headings (`Iowan Old Style`, `Palatino`, `Georgia`) paired with system sans-serif body prose and `tabular-nums` for aligned financial and academic metrics.
- **Responsive Layout & A11y**: Desktop sidebar with active white pill indicator, mobile top bar with slide-over navigation drawer tested down to `390px` width, skip-to-content link, `aria-current="page"`, explicit form `<label>`s, visible `focus-visible` rings, and `prefers-reduced-motion` support.

---

## Project Structure

```text
├── index.html
├── metadata.json
├── package.json
├── vite.config.ts
└── src/
    ├── App.tsx                       # Router configuration & portal routes
    ├── index.css                     # Tailwind CSS v4 & typography/motion rules
    ├── logic.test.ts                 # Node unit test suite (node:test)
    ├── auth/
    │   ├── auth.ts                   # Sign-in, rate limiting, session hydration & audit hooks
    │   └── permissions.ts            # Central staff-group RBAC matrix & route guards
    ├── components/
    │   ├── DemoFooter.tsx            # Avantika University & fictional demo disclaimer
    │   ├── PlannedPhasePanel.tsx     # Honest Phase N placeholder view
    │   ├── PortalLayout.tsx          # Sidebar, mobile drawer, topbar search & sign out
    │   ├── RouteGuards.tsx           # StudentGuard & StaffGuard with ACCESS_DENIED logging
    │   └── StatusBadge.tsx           # Semantic sentence-case pill badges
    ├── context/
    │   └── AuthContext.tsx           # React auth state & unread notification count sync
    ├── data/
    │   └── seed.ts                   # Deterministic fictional seed dataset (37 students)
    ├── db/
    │   ├── db.ts                     # Typed async query API scoped by auth & permissions
    │   └── storage.ts                # In-memory cache + localStorage persistence
    ├── pages/
    │   ├── LandingPage.tsx           # Public university overview & sample timeline
    │   ├── LoginPage.tsx             # Sign-in form, validation & demo account list
    │   ├── staff/
    │   │   ├── StaffAccessDenied.tsx
    │   │   ├── StaffDashboard.tsx
    │   │   ├── StaffNotifications.tsx
    │   │   ├── StaffPlannedSections.tsx
    │   │   ├── StaffSettings.tsx
    │   │   └── StaffStudentSearch.tsx
    │   └── student/
    │       ├── StudentDashboard.tsx
    │       ├── StudentFaqs.tsx
    │       ├── StudentNotifications.tsx
    │       ├── StudentPlannedSections.tsx
    │       └── StudentProfile.tsx
    ├── types/
    │   └── domain.ts                 # Full TypeScript domain schema
    └── utils/
        ├── calculations.ts           # Fee derivation, SGPA/CGPA, grading & validation
        ├── crypto.ts                 # Pure TypeScript SHA-256 password hashing
        └── format.ts                 # INR currency, dates & status badge formatting
```

---

**Avantika University** · Project Design  
*Demo application — all data is fictional. Access rules run in the browser for demonstration only.*
