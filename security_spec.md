# Security Specification — Student Office Management System

## 1. Data Invariants
1. **Identity & Role Authority**: Every authenticated user's `role` (`STUDENT` | `STAFF`), `staffRole` (`STUDENT_OFFICE` | `FINANCE` | `EXAMINATION` | `ACADEMIC` | `null`), and `studentId` reside exclusively in `users/{uid}`. Client-selected portal cards or UI state never grant privileges. Users cannot elevate their own `role` or `staffRole`.
2. **Student Record Scoping**: Students are keyed by unique `enrollmentNo` (`students/{enrollmentNo}`). A student may read only their own student record and only documents in `feeRecords`, `feePayments`, `requests`, `documents`, `studentScholarships`, and `scholarshipDocuments` where `studentId == users/{uid}.studentId`.
3. **Published-Only Results for Students**: Students may read `results` (and nested `courses`) only when `studentId == users/{uid}.studentId` AND `status == "PUBLISHED"`. `DRAFT`, `UNDER_REVIEW`, and `APPROVED` results are strictly inaccessible to students.
4. **Internal Request Notes Isolation**: Students may read `requests/{requestId}/messages` only when the parent request belongs to them AND `isInternal == false`.
5. **Least-Privilege Staff Matrix**:
   - `STUDENT_OFFICE`: write `students`, `requests`, `documents`, `scholarships`, `studentScholarships`, `scholarshipDocuments`; read `students`, `feeRecords`, `feePayments`, `results`, `requests`, `documents`, `scholarships`, `studentScholarships`, `scholarshipDocuments`, `auditLogs`, `exportLogs`.
   - `FINANCE`: read `students`, `feeRecords`, `feePayments`, `requests`, `exportLogs`; write `feeRecords`, `feePayments`. Denied `results`, `documents`, `scholarships`, `auditLogs`.
   - `EXAMINATION`: read `students`, `results`, `requests`, `exportLogs`; write `results`. Denied `feeRecords`, `feePayments`, `documents`, `scholarships`, `auditLogs`.
   - `ACADEMIC`: read `students`, `results`, `scholarships`, `studentScholarships`, `requests`, `exportLogs`. Denied `feeRecords`, `feePayments`, `documents`, `auditLogs`, and all writes to `results`/`feePayments`.
6. **Immutability & Non-Deletion**: Nobody may delete `students`, `feeRecords`, `feePayments`, or `results`. `auditLogs` are strictly append-only (`update` and `delete` denied).
7. **Whole-Rupee Money & Enum Validation**: Monetary fields (`totalAmountInr`, `amountInr`, `awardAmountInr`) must be integers (`>= 0`). Status and category enums are enforced on every write.

## 2. Dirty Dozen Attack Payloads (Expected: `PERMISSION_DENIED`)
1. **Self-Role Escalation**: Student writes `{ role: "STAFF", staffRole: "STUDENT_OFFICE" }` to `users/{uid}`.
2. **Cross-Student Record Read**: Student `AVU-DEMO-24-CSE-001` reads `students/AVU-DEMO-24-CSE-002` or lists `feeRecords` without matching `studentId`.
3. **Draft Result Peek**: Student reads `results/res-stu-1-sem-5` where `status == "DRAFT"`, or reads its `courses` subcollection.
4. **Internal Note Leak**: Student reads `requests/req-2/messages/msg-2-2` where `isInternal == true`.
5. **Audit Log Snooping**: Student or `FINANCE` staff reads `auditLogs`.
6. **Audit Log Tampering**: Any user updates or deletes an entry in `auditLogs`.
7. **Finance Writing Results**: `FINANCE` staff writes to `results/{id}` or reads `results/{id}`.
8. **Examination Writing Fees**: `EXAMINATION` staff writes to `feePayments/{id}` or reads `feeRecords/{id}`.
9. **Protected Collection Deletion**: `STUDENT_OFFICE` staff attempts to `delete` a document in `students`, `feeRecords`, `feePayments`, or `results`.
10. **Shadow / Ghost Field Injection**: Staff includes an unlisted field `{ isSuperAdmin: true }` in `students` or `feePayments`.
11. **Non-Integer Money / Invalid Enum**: `FINANCE` staff writes `feePayments` with `amountInr: 72500.50` or `status: "BYPASSED"`.
12. **Resource Exhaustion / ID Poisoning**: Signed-in user attempts to write a 200-character document ID or oversized 5,000-character `subject` string.
