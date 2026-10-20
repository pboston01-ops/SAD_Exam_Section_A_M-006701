# SAD Exam Section A — Part I: Analysis and Design
**Student Scholarship Monitoring and Academic Compliance System**

| | |
|---|---|
| **Name** | Phrence Kyle M. Boston |
| **Student ID** | M-006701 |
| **Program & Year** | BSIT 3 |
| **Date** | October 20, 2026 |

---

## A1 — Investigation and Planning

### Problem Statement
The Scholarship Office manually administers Merit Scholar and Community Scholar grants using spreadsheets, email attachments, and paper grade records. This fragmented approach causes duplicate semester entries, unverified grades, missed deadlines, and inconsistent renewal decisions. Scholars lack visibility into their submission status, and staff cannot efficiently enforce compliance policies across multiple programs.

### Cause–Effect Analysis

| ID | Cause | Effect |
|----|-------|--------|
| CE01 | Manual spreadsheet-based tracking | Duplicate semester entries go undetected; data inconsistency |
| CE02 | Email/paper evidence submission | Unverified grades enter the evaluation pipeline; audit trail lost |
| CE03 | No automated deadline monitoring | Late submissions treated as on-time; unfair renewal outcomes |
| CE04 | No centralized decision record | Inconsistent renewal decisions across staff; scholars cannot verify status |

### Scope
**In scope:** Scholar registration and program assignment, semester grade submission with evidence reference, staff verification (Verified/Returned), policy compliance evaluation, renewal decision (Approved/Held), dashboard with search/filter, audit history, role-based access control.

**Exclusions:** Live Registrar API integration, SMS/email notification gateway, payment processing, official grade modification, full appeal workflow, machine learning models.

### Development Tasks

| ID | Task | Duration |
|----|------|----------|
| DT01 | Design schema, configure Supabase, create RLS policies, seed test accounts | 0–15 min |
| DT02 | Scholar management, grade submission with validation, duplicate prevention | 15–65 min |
| DT03 | Verification workflow, compliance evaluation, renewal decisions | 65–115 min |
| DT04 | Dashboard, search/filter, audit log, testing TC01–TC10 | 115–150 min |

### Risks and Responses

| ID | Risk | Response |
|----|------|----------|
| R01 | Supabase network failure during exam | Prepare local SQLite fallback; document offline run steps |
| R02 | RLS misconfiguration exposes cross-scholar data | Unit-test each RLS policy with both roles; verify TC08 explicitly |

---

## A2 — Stakeholders and Elicitation

### Stakeholders

| ID | Stakeholder | Type | Actor in System |
|----|-------------|------|----------------|
| SH01 | Scholarship Scholar | Primary | ✅ Actor (Scholar role) |
| SH02 | Scholarship Staff | Primary | ✅ Actor (Staff role) |
| SH03 | Registrar's Office | External | ❌ Not an actor (grade source, not integrated) |
| SH04 | Scholarship Office Head | Secondary | ❌ Not an actor (policy authority, not a system user) |

### Elicitation Questions

1. **Verification:** What specific evidence documents are acceptable for grade verification, and how should staff indicate which portion is invalid when returning a submission?
2. **Deadlines:** Should the system display a countdown to the deadline visible to scholars, and how should the exact cut-off moment (17:00 PHT) be communicated?
3. **Policy Exceptions:** Under what conditions, if any, may a staff member override a "With Deficiency" compliance result to approve renewal, and who authorizes such exceptions?
4. **Access Control:** Should staff be able to view and edit all scholar records at all times, or only those assigned to their division?
5. **Reports:** What summary exports (PDF, CSV) are required at the end of each semester for submission to the Scholarship Office Head?
6. **Duplicate Prevention:** When a scholar submits a corrected entry after a Return, should the original submission be preserved in history or replaced, and how should versioning be displayed?

---

## A3 — Requirements and Business Rules

### Functional Requirements

| ID | Requirement | Role |
|----|-------------|------|
| FR01 | The system shall allow staff to register a scholar account with name, student ID, email, and assigned scholarship program. | Staff |
| FR02 | The system shall allow a scholar to submit a semester academic summary including GWA, enrolled units, failed/INC/dropped counts, evidence reference, and academic year/semester. | Scholar |
| FR03 | The system shall reject a duplicate submission for the same scholar, academic year, and semester with a clear error message. | Scholar |
| FR04 | The system shall validate that GWA is between 1.00 and 5.00 inclusive, and that all counts are non-negative integers. | Scholar |
| FR05 | The system shall allow staff to mark a submission as Verified or Returned with optional notes; returned submissions must return to Pending on resubmission. | Staff |
| FR06 | The system shall evaluate compliance only for Verified submissions, checking GWA, units, failed, INC, dropped counts, and submission deadline against the assigned program's policy thresholds. | Staff |
| FR07 | The system shall display each compliance check result (pass/fail) and list specific deficiency reasons. | Staff |
| FR08 | The system shall allow staff to record Approved or Held renewal decisions; Approved requires Compliant evaluation. | Staff |
| FR09 | The system shall prevent scholars from accessing or modifying other scholars' submissions at the database level via RLS. | Scholar |
| FR10 | The system shall log all verification, compliance evaluation, and renewal decisions with actor identity and timestamp in an audit table. | Staff/Scholar |

### Non-Functional Requirements

| ID | Requirement | Metric |
|----|-------------|--------|
| NF01 | **Performance:** Dashboard must load within 3 seconds on a standard broadband connection. | ≤ 3 s load time |
| NF02 | **Security:** Access control enforced via Supabase RLS at the database level, not only by hiding UI elements. | 0 unauthorized data leaks in TC08 |
| NF03 | **Usability:** All primary workflows (submit, verify, evaluate) completable within 5 clicks from the relevant dashboard. | ≤ 5 clicks per primary task |
| NF04 | **Persistence:** All submitted and verified data must survive a full browser refresh with no data loss. | 100% data retained on reload |

### Business Rules

| ID | Rule |
|----|------|
| BR01 | A GWA of exactly the program maximum is compliant; one decimal above is deficient. |
| BR02 | A submission at exactly the deadline (2026-10-30 17:00 PHT) is on time; one second after is late. |
| BR03 | Missing or unverified evidence (Pending/Returned) prevents compliance evaluation and renewal decisions. |
| BR04 | A "With Deficiency" evaluation prevents Approved renewal; only Compliant records may be Approved. |
| BR05 | Scholars may only view and update their own submissions; staff may view all. |
| BR06 | All compliance thresholds (max GWA, min units, allowed failed/INC/dropped) are read from the program record, not hardcoded in evaluation logic. |

---

## A4 — UML Use Case Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                S C H O L A R   M O N I T O R                   │
│                         System Boundary                         │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │         ○ Register Scholar              (Staff)        │   │
│   │         ○ Assign Program                (Staff)        │   │
│   │         ○ View All Submissions          (Staff)        │   │
│   │         ○ Verify Submission         ◄──── <<include>>   │   │
│   │              │                      Review Details     │   │
│   │         ○ Return Submission        <<extend>> ───►      │   │
│   │              │                    (if evidence invalid) │   │
│   │         ○ Evaluate Compliance          (Staff)        │   │
│   │              │ <<include>>                             │   │
│   │         ○ Check Policy Thresholds      (System)       │   │
│   │         ○ Record Renewal Decision      (Staff)        │   │
│   │         ○ View Audit History           (Staff)        │   │
│   │                                                         │   │
│   │         ○ Submit Semester Grades       (Scholar)      │   │
│   │              │ <<include>>                             │   │
│   │         ○ Validate Input               (System)       │   │
│   │         ○ Correct & Resubmit       <<extend>> ───►     │   │
│   │              │                   (if submission Returned)│  │
│   │         ○ View Own Submission Status   (Scholar)      │   │
│   │         ○ View Dashboard               (Staff)        │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   [Scholar] ──────────────────── [Staff]                        │
└─────────────────────────────────────────────────────────────────┘
```

### Include Relationships (mandatory reuse)
- **Verify Submission →** *includes* **→ Review Submission Details:** Every verification action requires loading and displaying the full submission record first.
- **Evaluate Compliance →** *includes* **→ Check Policy Thresholds:** Every compliance evaluation must read and apply the assigned program's policy thresholds.

### Extend Relationship (conditional)
- **Correct & Resubmit →** *extends* **→ Submit Semester Grades** at extension point **EP-Returned:** Only activates when an existing submission's verification status is "Returned." A scholar cannot access this unless the staff has returned the record.

---

## A5 — Detailed Use Cases and Data Design

### UC01 — Submit Semester Grades

| Field | Value |
|-------|-------|
| **Actor** | Scholar |
| **Trigger** | Scholar navigates to "Submit Grades" from sidebar |
| **Preconditions** | Scholar is authenticated; has an active scholarship assignment |
| **Postcondition** | New submission record created with status Pending; timestamp recorded |
| **Linked FR** | FR02, FR03, FR04 |
| **Linked BR** | BR02, BR03 |

**Main Flow:**
1. Scholar selects Academic Year and Semester from dropdowns.
2. Scholar enters GWA (1.00–5.00), enrolled units, failed count, INC count, dropped count.
3. Scholar enters grade document reference (e.g., GR-A01-2026-2027-S1.pdf).
4. System validates: GWA in [1.00, 5.00], all counts ≥ 0, evidence reference not empty.
5. System checks for existing submission with same scholar + AY + semester.
6. System records submission with `submitted_at = NOW()`, `verification_status = 'Pending'`.
7. System displays success toast; redirects scholar to My Submissions.

**Alternative Flow A — GWA out of range (step 4):**
- System rejects with: "GWA must be between 1.00 and 5.00."

**Alternative Flow B — Negative count (step 4):**
- System rejects with: "Counts cannot be negative."

**Exception Flow E — Duplicate entry (step 5):**
- System rejects with: "Duplicate: submission for this semester already exists."

---

### UC02 — Evaluate Compliance

| Field | Value |
|-------|-------|
| **Actor** | Staff |
| **Trigger** | Staff clicks "Evaluate" on a Verified submission in the Compliance view |
| **Preconditions** | Submission exists with `verification_status = 'Verified'`; linked program record exists |
| **Postcondition** | `compliance_result` and `compliance_reasons` written to submission; audit log entry created |
| **Linked FR** | FR06, FR07, FR08 |
| **Linked BR** | BR01, BR02, BR04, BR06 |

**Main Flow:**
1. Staff opens Compliance & Renewal view; selects "Evaluate" on a Verified record.
2. System loads submission data and reads policy thresholds from the assigned program record (BR06).
3. System performs six checks:
   - GWA ≤ `max_gwa`
   - `enrolled_units` ≥ `min_units`
   - `failed_count` ≤ `allowed_failed`
   - `incomplete_count` ≤ `allowed_incomplete`
   - `dropped_count` ≤ `allowed_dropped`
   - `submitted_at` ≤ deadline (2026-10-30 17:00 PHT, BR02)
4. System displays each check with ✅ pass or ❌ fail.
5. If all checks pass → `compliance_result = 'Compliant'`.
6. If any check fails → `compliance_result = 'With Deficiency'`; system lists specific reasons.
7. System saves result; creates audit log entry; enables renewal buttons.

**Alternative Flow A — Deficient record (step 5–6):**
- "Approve Renewal" button is disabled.
- Staff may only click "Hold Renewal."

**Exception Flow E — Unverified submission (step 1 precondition fails):**
- "Evaluate" button not rendered; message shown: "Not verified."

---

### Entity Relationship Diagram (ERD)

```
auth.users (Supabase)
  PK: id (UUID)
      email, encrypted_password
      │
      │ 1
      ▼
┌─────────────┐
│  profiles   │
│─────────────│
│ PK id UUID  │──────────────────────────────────────────────────┐
│ full_name   │                                                  │
│ student_id  │                                                  │
│ role        │                                                  │
│ created_at  │                                                  │
└──────┬──────┘                                                  │
       │ 1                                                        │
       ▼ 0..1                                                    │
┌─────────────┐      M                   1  ┌──────────────────┐│
│  scholars   │────────────────────────────►│    programs      ││
│─────────────│   program_id                │──────────────────││
│ PK id UUID  │                            │ PK id UUID       ││
│ FK profile_id (UNIQUE)                   │ program_name     ││
│ FK program_id                            │ max_gwa          ││
│ FK assigned_by (→ profiles)              │ min_units        ││
│ is_active                                │ allowed_failed   ││
│ assigned_at │                            │ allowed_incomplete││
└──────┬──────┘                            │ allowed_dropped  ││
       │ 1                                 │ deadline         ││
       ▼ M                                 └──────────────────┘│
┌──────────────────┐                                           │
│   submissions    │──FK verified_by, decided_by ──────────────┘
│──────────────────│
│ PK id UUID       │
│ FK scholar_id    │◄──────────────────────────────────────────┐
│ academic_year    │                                           │
│ semester         │                                           │
│ UNIQUE(scholar_id, academic_year, semester)                  │
│ gwa, enrolled_units                                          │
│ failed_count, incomplete_count, dropped_count                │
│ evidence_reference, submitted_at                             │
│ verification_status, verification_notes                      │
│ FK verified_by, verified_at                                  │
│ compliance_result, compliance_reasons                        │
│ renewal_decision, renewal_notes                              │
│ FK decided_by, decided_at                                    │
└──────────────────┘
       │ 1
       ▼ M
┌─────────────────┐
│   audit_log     │
│─────────────────│
│ PK id UUID      │
│ FK submission_id│
│ FK actor_id (→ profiles)
│ action          │
│ details         │
│ created_at      │
└─────────────────┘
```

**Cardinalities:**
- `profiles` 1 ─── 0..1 `scholars` (one profile may be assigned to at most one scholarship)
- `programs` 1 ─── M `scholars` (one program can have many scholars)
- `scholars` 1 ─── M `submissions` (one scholar, many semester submissions)
- `submissions` 1 ─── M `audit_log` (one submission, many history entries)

---

## A6 — Traceability Matrix

| FR | Actor | Use Case | Business Rule | Implemented In | Test | Expected Result |
|----|-------|----------|---------------|---------------|------|-----------------|
| FR02 | Scholar | UC01 Submit Semester Grades | BR02, BR03 | `submit-grades-form` handler in `app.js` | TC07 | Rejects GWA 0.50 and negative counts with specific error messages |
| FR05 | Staff | Verify Submission | BR03 | `doVerify()` in `app.js`; `btn-verify`, `btn-return` | TC09 | Returned submission resets to Pending; history preserved |
| FR06 | Staff | UC02 Evaluate Compliance | BR01, BR02, BR06 | `openComplianceModal()` in `app.js` | TC01–TC05 | Correct compliance result and specific deficiency reasons for each case |
| FR08 | Staff | Record Renewal Decision | BR04 | `doRenewal()` in `app.js`; `btn-approve` disabled for deficient | TC10 | Approved only for Compliant; scholar cannot change decision |

### Planned but Not Implemented
| Feature | Reason |
|---------|--------|
| TC08 Role Isolation (backend RLS test via API) | RLS policies implemented in `schema.sql`; live cross-account API test requires two concurrent browser sessions — documented but not screenshot-able in single-user exam setup |
| Email notification on submission status change | Excluded per exam scope (no SMS/email gateway) |
| Hosted deployment URL | Network/hosting not guaranteed during exam; local XAMPP runs successfully |
