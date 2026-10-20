# ScholarMonitor — SAD Laboratory Midterm Examination
**Section A | Student ID: M-006701 | Phrence Kyle M. Boston | BSIT 3**

---

## Quick Start

### Step 1 — Run `schema.sql` in Supabase SQL Editor
👉 https://supabase.com/dashboard/project/tpfgfbunbwqyuydcchev/sql/new

Paste contents of `schema.sql` → Run.  
_(Creates all tables, RLS policies, helper functions, and the auto-profile trigger.)_

### Step 2 — Run `seed.sql` in Supabase SQL Editor
Paste contents of `seed.sql` → Run.  
_(Creates all auth users, profiles, scholars, and 6 test submissions.)_

Expected output: A table with 6 rows (A01–A06) and their program/GWA/status.

### Step 3 — Open the App
```
http://localhost/SAD_Exam_Section_A_M-006701/
```
— OR —
```
Open index.html directly in browser (file:// protocol works)
```

---

## Project Files

| File | Purpose |
|------|---------|
| `index.html` | Single-page application — all views and modals |
| `styles.css` | Dark-mode premium UI styling |
| `app.js` | Supabase auth, all staff and scholar features |
| `schema.sql` | Tables, RLS policies, helper functions, trigger |
| `seed.sql` | Auth users + profiles + scholars + test submissions |
| `analysis.md` | Part I analysis report (A1–A6, UML, ERD, traceability) |
| `README.md` | This file |

---

## Test Account Credentials
> 🔒 Submit privately to instructor. Do not include in public screenshots.

### Staff Account
| Field | Value |
|-------|-------|
| Email | `staff@scholarship.edu.ph` |
| Password | `Staff@2026!` |
| Role | `staff` |

### Scholar Test Account (TC08 role isolation test)
| Field | Value |
|-------|-------|
| Email | `scholar.a01@scholarship.edu.ph` |
| Password | `Scholar@2026!` |
| Role | `scholar` |
| Student ID | A01 |

### All Scholar Accounts

| ID | Email | Password |
|----|-------|----------|
| A01 | scholar.a01@scholarship.edu.ph | Scholar@2026! |
| A02 | scholar.a02@scholarship.edu.ph | Scholar@2026! |
| A03 | scholar.a03@scholarship.edu.ph | Scholar@2026! |
| A04 | scholar.a04@scholarship.edu.ph | Scholar@2026! |
| A05 | scholar.a05@scholarship.edu.ph | Scholar@2026! |
| A06 | scholar.a06@scholarship.edu.ph | Scholar@2026! |

---

## Environment

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://tpfgfbunbwqyuydcchev.supabase.co` |
| `SUPABASE_KEY` | Set in `app.js` line 6 — anon/publishable key only |

> ⚠️ No service-role keys, database passwords, or JWT secrets are stored in source code.

---

## Test Results (TC01–TC10)

| TC | Action | Expected | Actual | Pass/Fail |
|----|--------|----------|--------|-----------|
| TC01 | Evaluate A01 (GWA 1.75, at deadline) | Compliant | Compliant ✅ | ✅ Pass |
| TC02 | Evaluate A02 (GWA 1.76) | With Deficiency — GWA | With Deficiency — GWA exceeds 1.75 | ✅ Pass |
| TC03 | Evaluate A03 (Community, 1 dropped) | Compliant | Compliant ✅ | ✅ Pass |
| TC04 | Evaluate A04 (14 units, 1 INC) | With Deficiency — units + INC | With Deficiency — units below 15, INC > 0 | ✅ Pass |
| TC05 | Evaluate A05 (1 failed, 1 min late) | With Deficiency — failed + late | With Deficiency — failed subject, late submission | ✅ Pass |
| TC06 | Evaluate/approve A06 (Pending) | Blocked — not verified | Evaluate button hidden; not shown in compliance | ✅ Pass |
| TC07 | Submit GWA 0.50 / negative count | Rejected with error message | ❌ GWA must be 1.00–5.00 / Counts cannot be negative | ✅ Pass |
| TC08 | Scholar A01 accesses A02 data | Backend denies (RLS) | Supabase returns empty result; scholar sees only own | ✅ Pass |
| TC09 | Return A01, correct, resubmit, refresh | Pending verification, history preserved | Status = Pending; audit log shows correction | ✅ Pass |
| TC10 | Staff approve Compliant; hold Deficient; scholar cannot change | Approved/Held; scholar blocked | Correct — Approve disabled for deficient; scholar UI read-only | ✅ Pass |

---

## Known Defects / Limitations

| # | Description |
|---|-------------|
| D01 | TC08 cross-scholar RLS enforcement is at the database level (Supabase RLS); cannot be demonstrated visually with two simultaneous browser sessions in a single-user exam setup |
| D02 | Scholar registration via the "Add Scholar" modal uses `db.auth.signUp()` which may trigger Supabase email rate limits on the free tier — use `seed.sql` for all test accounts |

---

## Supabase Project
- **Project URL:** https://tpfgfbunbwqyuydcchev.supabase.co
- **Dashboard:** https://supabase.com/dashboard/project/tpfgfbunbwqyuydcchev

---

## Submission Folder
`SAD_Exam_Section_A_M-006701`

## Hosted URL
Local only (XAMPP) — network hosting not available during exam.
