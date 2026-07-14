# PROMPT: Employee Management System Buildout

## Context

The employee subsystem currently has basic CRUD (create, read, update, deactivate), PIN auth, location assignment, permission groups, and time clock in/out. But it is missing critical features that a production POS needs: there is no Create Employee form in the UI, no employee activity/sales tracking, no notes system, no commission or sales performance data, no advanced time clock editing, no employee reports, and several database fields that exist but are completely unused (preferences JSON, state_id, break tracking fields). The user uses KayaPush for scheduling and payroll, so we are NOT building scheduling, PTO, or payroll features. We ARE building everything a dispensary manager needs to manage staff from the POS backoffice.

## Pre-Work

Before writing ANY code:
1. Read `CLAUDE.md` in the project root
2. Read `DATABASE-CONSTRAINTS.md` in the project root
3. Read `MEMORY.md` in the project root
4. Review `src/app/api/employees/` — all existing routes
5. Review `src/app/(backoffice)/employees/` — all existing pages
6. Review `src/lib/services/employeeManagementService.ts`
7. Review `src/lib/services/permissionService.ts`
8. Review `src/hooks/usePermissions.ts`
9. Review `src/lib/constants/permissions.ts`
10. Review the `employees`, `employee_locations`, `user_permission_groups`, `time_clock_entries`, `audit_log` table structures

## Task 1: Create Employee Form (Backoffice UI)

**Problem:** There is no UI to create a new employee. The API exists (`POST /api/employees`) but there is no frontend form. Managers must currently use the API directly, which is not acceptable.

**Build:** A full Create Employee page at `src/app/(backoffice)/employees/new/page.tsx`

**Form Fields:**
- First Name (required, text)
- Last Name (required, text)
- Email (optional, email validation)
- Phone (optional, phone format)
- Role (required, select: budtender, shift_lead, manager, admin, owner)
- PIN (required, exactly 4 digits, with confirmation field, collision check via API before submit)
- Primary Location (required, select from org locations)
- Additional Locations (optional, multi-select checkboxes)
- Permission Groups (required, multi-select from existing groups, pre-select default based on role)
- Hire Date (optional, date picker, defaults to today)

**Behavior:**
- Validate all fields client-side with Zod before submit
- PIN collision check: on blur of PIN field, call a new API endpoint `GET /api/employees/check-pin?pin=XXXX` that returns `{ available: boolean }` without exposing which employee owns it
- On successful creation, redirect to the new employee's profile page
- Show toast on success: "Employee [name] created successfully"
- Show inline errors on validation failures
- Permission gate: require `MAINT_USERS_EDIT` permission to access this page

**New API Endpoint:**
- `GET /api/employees/check-pin` — accepts `pin` query param, hashes it, checks for collision, returns `{ available: boolean }`

**Also add:**
- "Add Employee" button on the employees list page (`src/app/(backoffice)/employees/page.tsx`) that links to `/employees/new`
- Permission gated: only show button if user has `MAINT_USERS_EDIT`

## Task 2: Edit Employee Page

**Problem:** The employee profile page (`src/app/(backoffice)/employees/[id]/page.tsx`) displays employee info but editing requires separate API calls with no unified form.

**Build:** Convert the profile page to have an edit mode, or create a separate edit page at `src/app/(backoffice)/employees/[id]/edit/page.tsx`

**Editable Fields:**
- First Name, Last Name, Email, Phone (basic info section)
- Role (select dropdown)
- Locations (multi-select with primary location toggle)
- Permission Groups (multi-select)
- Status (active/inactive toggle with confirmation dialog for deactivation)

**Behavior:**
- Load current employee data on mount
- Track dirty state — only enable Save button when changes exist
- Optimistic UI: show changes immediately, revert on failure
- Audit log: every field change creates an audit_log entry with old_value/new_value
- PIN reset is a separate action button (not inline editable) — opens a modal with new PIN + confirmation

## Task 3: Employee Activity Log

**Problem:** The audit_log only tracks 2 events (pin_reset, deactivate). Managers need to see a full activity timeline for each employee.

**Build:** An activity timeline component on the employee profile page showing:

**Events to Track (expand audit_log usage):**
- Login events (location, register, timestamp) — add logging to `POST /api/auth/pin-login`
- Profile changes (which fields changed, old/new values, who changed them)
- Permission group changes (added/removed from groups, who changed)
- Location assignment changes
- PIN resets (who initiated)
- Status changes (activated/deactivated, who did it, reason)
- Transaction activity summary (count of transactions per day, pulled from transactions table)
- Manager overrides performed (pulled from audit_log where employee is the authorizer)

**UI Component:** `src/components/backoffice/EmployeeActivityTimeline.tsx`
- Chronological feed, newest first
- Filter by event type
- Date range filter
- Paginated (20 events per page)
- Each event shows: timestamp, event type badge, description, who initiated it

**API Endpoint:** `GET /api/employees/[id]/activity`
- Query params: `event_type`, `date_from`, `date_to`, `page`, `limit`
- Pulls from audit_log WHERE entity_type = 'employee' AND entity_id = [id]
- Also pulls login events and transaction counts

## Task 4: Employee Sales Performance

**Problem:** There is no way to see how much an employee has sold. The permission `REPORTING_CAT_VIEW_EMPLOYEE` exists but no employee reports are built.

**Build:** A sales performance section on the employee profile page AND a standalone employee performance report.

**Employee Profile — Sales Summary Card:**
- Total sales today / this week / this month / all time
- Transaction count for same periods
- Average transaction value
- Top 5 products sold (by quantity)
- Top 5 categories sold (by revenue)

**API Endpoint:** `GET /api/employees/[id]/sales-summary`
- Query params: `period` (today, week, month, all_time)
- Queries transactions table WHERE employee_id = [id] AND status = 'completed'
- Aggregates: total revenue, transaction count, avg transaction value
- Joins transaction_lines for top products/categories

**Standalone Report Page:** `src/app/(backoffice)/reports/employee-performance/page.tsx`
- Table of all employees with columns: Name, Role, Location, Sales Today, Sales This Week, Sales This Month, Transactions Today, Avg Transaction
- Sortable by any column
- Filterable by location, role, date range
- CSV export
- Permission gate: `REPORTING_CAT_VIEW_EMPLOYEE`

**API Endpoint:** `GET /api/reports/employee-performance`
- Query params: `location_id`, `role`, `date_from`, `date_to`, `sort_by`, `sort_dir`
- Returns array of employees with aggregated sales data

## Task 5: Employee Notes System

**Problem:** No way for managers to leave notes on employee records. Needed for documenting conversations, performance feedback, incidents, or general observations.

**Database Migration:** Create `employee_notes` table:
```sql
CREATE TABLE employee_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  author_id UUID NOT NULL REFERENCES employees(id),
  note_type TEXT NOT NULL CHECK (note_type IN ('general', 'performance', 'incident', 'coaching', 'commendation')),
  content TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_employee_notes_employee ON employee_notes(employee_id) WHERE is_active = true;
CREATE INDEX idx_employee_notes_org ON employee_notes(organization_id) WHERE is_active = true;

ALTER TABLE employee_notes ENABLE ROW LEVEL SECURITY;
```

**API Endpoints:**
- `GET /api/employees/[id]/notes` — list notes for employee, paginated
- `POST /api/employees/[id]/notes` — create note (requires MAINT_USERS_EDIT)
- `PATCH /api/employees/[id]/notes/[noteId]` — edit note (only author can edit)
- `DELETE /api/employees/[id]/notes/[noteId]` — soft delete (only author or admin)

**UI Component:** `src/components/backoffice/EmployeeNotes.tsx`
- Rendered on employee profile page
- Note type selector (tabs or filter pills)
- Each note shows: author name, date, type badge, content
- Private notes only visible to author and admins
- Inline add note form (expandable)
- Edit/delete actions on own notes

## Task 6: Enhanced Time Clock Management

**Problem:** Time clock has basic in/out but the database has unused fields (break_start, break_end, break_minutes, edit_reason, edited_by) and there is no UI for managers to edit time entries or view summaries.

**Note:** User uses KayaPush for payroll. This is NOT a payroll replacement. This is for operational visibility — managers need to see who clocked in, fix errors, and get daily/weekly hour summaries.

**Build enhancements to the existing time clock page:**

**Manager Time Entry Editing:**
- Click any time clock entry to edit clock_in, clock_out, break_minutes
- Require edit_reason (text field, mandatory)
- Record edited_by (current employee id)
- Audit log entry for every edit
- Permission gate: `MAINT_USERS_EDIT_TIME_CLOCKS`

**Time Clock Summary View:**
- Daily view: list of employees, clock in/out times, total hours, break time, overtime flag
- Weekly view: employee rows, daily hour columns, weekly total
- Filter by location, date range
- Highlight anomalies: shifts over 10 hours, no clock-out (still open), clock-in after midnight

**API Endpoints:**
- `PATCH /api/time-clock/[id]` — edit time clock entry (clock_in, clock_out, break_minutes, requires edit_reason)
- `GET /api/time-clock/summary` — aggregated view by employee, params: `period` (daily/weekly), `date`, `location_id`

**Currently Active Display:**
- On the employees list page, show a "Currently Clocked In" badge next to employees who have an open time_clock_entry (no clock_out)
- Add a small "Who's Working" widget to the dashboard

## Task 7: Employee Import (Bulk)

**Problem:** With 15 locations, adding employees one by one is painful. Need CSV import.

**Build:** Import functionality on the employees list page.

**UI:**
- "Import Employees" button next to "Add Employee"
- Opens modal with CSV template download link and file upload drop zone
- CSV columns: first_name, last_name, email, phone, role, pin, primary_location_name, additional_location_names (semicolon separated)
- Preview table showing parsed rows with validation status (green check / red X per row)
- "Import X Valid Employees" button (skips invalid rows)
- Summary after import: X created, X skipped (with reasons)

**API Endpoint:** `POST /api/employees/import`
- Accepts JSON array of employee records (parsed client-side from CSV)
- Validates each record: PIN collision, email uniqueness, role CHECK constraint, location name matching
- Returns per-record results: { index, status: 'created' | 'skipped', reason? }

**CSV Template:** `GET /api/employees/import/template`
- Returns a CSV file with headers and 2 example rows

## Task 8: Employee Export

**Build:** Export functionality on the employees list page.

**UI:**
- "Export" button in the page header
- Exports currently filtered view to CSV

**API Endpoint:** `GET /api/employees/export`
- Same filter params as list endpoint (search, role, status)
- Returns CSV with columns: first_name, last_name, email, phone, role, status, primary_location, all_locations, permission_groups, hire_date, last_login
- Requires `MAINT_USERS_VIEW` permission

## DO NOT Build

- Scheduling or shift management (user uses KayaPush)
- PTO / time off management (user uses KayaPush)
- Payroll calculations or wage tracking (user uses KayaPush)
- Commission tracking (not needed at this time)
- Employee self-service portal (not needed at this time)
- Internal messaging system (user uses Slack)
- Document/file uploads on employee records (not needed at this time)
- Background check or compliance tracking (handled externally)

## Technical Requirements

- All new API routes must validate inputs with Zod schemas
- All new API routes must check permissions before processing
- All database mutations must create audit_log entries
- All new pages must be permission gated using the PermissionGate component
- Follow existing patterns in the codebase for component structure, API route structure, and service layer
- Use the existing `AppError` class for all error throwing
- Use the existing `logger` for all server-side logging
- No `any` types, no `console.log`, no TODO stubs
- All money values as `NUMERIC(12,2)` in the database
- All new tables need RLS enabled
- All FK columns need indexes
- Run `npm run lint` and `npm run build` after completing all tasks — fix any errors

## File Locations (Expected)

```
NEW FILES:
  src/app/(backoffice)/employees/new/page.tsx
  src/app/(backoffice)/employees/[id]/edit/page.tsx
  src/app/(backoffice)/reports/employee-performance/page.tsx
  src/app/api/employees/check-pin/route.ts
  src/app/api/employees/[id]/activity/route.ts
  src/app/api/employees/[id]/sales-summary/route.ts
  src/app/api/employees/[id]/notes/route.ts
  src/app/api/employees/[id]/notes/[noteId]/route.ts
  src/app/api/employees/import/route.ts
  src/app/api/employees/import/template/route.ts
  src/app/api/employees/export/route.ts
  src/app/api/reports/employee-performance/route.ts
  src/app/api/time-clock/[id]/route.ts
  src/app/api/time-clock/summary/route.ts
  src/components/backoffice/EmployeeActivityTimeline.tsx
  src/components/backoffice/EmployeeNotes.tsx
  src/components/backoffice/EmployeeSalesCard.tsx
  src/components/backoffice/EmployeeImportModal.tsx
  supabase/migrations/[timestamp]_employee_notes.sql

MODIFIED FILES:
  src/app/(backoffice)/employees/page.tsx (add buttons, clocked-in badges)
  src/app/(backoffice)/employees/[id]/page.tsx (add activity timeline, notes, sales card)
  src/app/api/auth/pin-login/route.ts (add login event to audit_log)
  src/app/(backoffice)/dashboard/page.tsx (add "Who's Working" widget)
  src/app/(backoffice)/employees/time-clock/page.tsx (add editing, summary view)
  src/app/(backoffice)/reports/page.tsx (add Employee Performance link)
```

## Execution Order

1. Task 5 first (employee_notes migration) — database change must come before anything that references it
2. Task 1 (Create Employee form) — most impactful missing feature
3. Task 2 (Edit Employee page)
4. Task 3 (Activity Log) — requires audit_log expansion from Tasks 1 and 2
5. Task 6 (Time Clock enhancements)
6. Task 4 (Sales Performance) — read-only reports, lower risk
7. Task 7 (Import)
8. Task 8 (Export)

Run lint and build after each task. Fix errors before moving to the next task.
