# Student Scheduling Permissions Plan

This plan breaks the feature bundle into smaller implementation parts so each step can be built, reviewed, and verified independently.

## Product Goals

- Allow admins and professors to restrict specific students from scheduling their own exams.
- Allow professors and admins to schedule exams on behalf of students.
- Add reservation cancellation with clear ownership rules.
- Add a fourth school role for exam attendance tracking, likely `exam_supervisor`.
- Keep the future student status/news board in mind without implementing it in the first pass.

## Part 1: Student Self-Booking Permission

Status: Done.

### Goal

Admins and professors can mark specific students as unable to schedule their own exams. Restricted students can still view schedules and reservations, but they cannot create their own reservation.

### Database

Add a per-school-member permission to `SchoolMembers`, not `Profiles`, because a student can belong to multiple schools and should be restrictable per school.

Recommended fields:

```sql
can_self_book boolean not null default true
self_booking_disabled_at timestamptz
self_booking_disabled_by uuid references auth.users(id)
```

The timestamp and actor fields are optional for the first implementation, but they are useful for audit history and the future status board.

### Backend

- Update the existing student reservation RPC / `reserve-exam-slot` Edge Function.
- When the caller is a student, check their `SchoolMembers.can_self_book` value.
- Reject student-created reservations when `can_self_book = false`.
- Allow admins and professors to update `can_self_book` for student members.
- Do not allow students to update this permission.

### UI

Add the permission editor to the existing `Members` tab in `components/dashboard/SchoolManagementTabs.tsx`.

Minimal design:

- Each student row/card shows a compact permission state.
- Use a small pill:
  - `Self booking on`
  - `Teacher scheduled only`
- Add a compact toggle or action button beside the pill.
- Avoid a separate full page for this first pass.

Student schedule UI:

- If `can_self_book = false`, keep the schedule readable.
- Disable the reserve action.
- Show a short message near the booking control: `A professor must schedule this exam for you.`

### Result

Restricted students cannot schedule exams themselves. Admins and professors can manage that restriction from the member management UI.

## Part 2: Professor/Admin Booking For Students

Status: Done.

### Goal

Professors and admins can create reservations on behalf of students.

### Database

Extend `Reservations` with creator tracking.

Recommended fields:

```sql
created_by uuid references auth.users(id)
created_by_role school_role
```

Existing reservations can be backfilled with:

```sql
created_by = user_id
```

`Reservations.user_id` should continue to mean the student who owns the reservation. A separate `scheduled_for_user_id` field is not needed unless the model changes later.

### Backend

Add a new Edge Function, likely `schedule-exam-for-student`, rather than overloading the existing student-only function too much.

Validation rules:

- Caller is signed in.
- Caller is an `admin` or `professor` member of the school.
- Target user is a `student` member of the same school.
- Slot belongs to the school and is active.
- Date is within the allowed booking window.
- Date is not a weekend.
- Exam type is valid.
- Exam name is non-empty.
- Capacity is available.
- Duplicate rule still applies per `user_id + slot_id + reservation_date`.

Reuse the same advisory lock pattern from the existing reservation flow so teacher-created bookings cannot overfill a slot during concurrent requests.

### UI

Add a `Schedule` action to student rows in the school management `Members` tab.

Use a small modal or side panel with:

- Student name locked at the top.
- Date picker.
- Slot picker.
- Exam name input.
- Exam type selector.
- Submit button.

This keeps the main member list clean and avoids turning the school dashboard into a separate scheduling page.

### Result

Professors and admins can schedule exams for restricted students and normal students. The created reservation appears in the student's schedule and in the school reservation read model.

## Part 3: Cancel Reservations With Ownership Rules

Status: Done. Students can cancel any reservation assigned to them, and admins/professors can cancel any confirmed reservation in their school. Exam supervisors cannot cancel reservations.

### Goal

Add cancellation while preserving audit history and respecting who created the reservation.

### Database

Use status changes instead of deleting reservation rows.

Recommended fields:

```sql
status text -- already exists; extend supported values if needed
cancelled_at timestamptz
cancelled_by uuid references auth.users(id)
cancel_reason text
```

Current implementation keeps audit-safe cancelled rows by changing `Reservations.status` to `cancelled`. `cancelled_at`, `cancelled_by`, and `cancel_reason` are still left for a later audit/history pass.

Supported statuses should include:

- `confirmed`
- `cancelled`

### Permission Rules

- Students can cancel any reservation assigned to them.
- Professors can cancel any confirmed reservation in their school.
- Admins can cancel any reservation in their school.
- Exam supervisors should not cancel reservations unless that permission is explicitly added later.

This requires reliable `Reservations.created_by` tracking from Part 2.

### Backend

Add a `cancel-reservation` Edge Function.

Validation rules:

- Caller is signed in.
- Reservation exists and belongs to a school where the caller has access.
- Reservation status is currently `confirmed`.
- Caller is allowed to cancel based on role and creator ownership.
- Update reservation to `cancelled`; do not delete it.

### UI

Add cancel actions in:

- Student `BookingsPanel`, only for reservations the student is allowed to cancel.
- Student `My Reservations` panel, for focused personal reservation management.
- School `Reservations` tab for admins and professors.

Use a confirmation dialog. It can be lighter than the school deletion flow, but it should still prevent accidental cancellation.

Current implementation uses confirmation dialogs and server-side authorization.

### Result

Reservations can be cancelled safely, and cancellation history remains available for attendance, auditing, and future status board events.

## Part 4: Exam Supervisor Role And Attendance

Status: Done, with temporary attendance-session testing support.

### Goal

Add a fourth role for the person physically supervising exams and marking attendance.

Suggested role name:

```sql
exam_supervisor
```

### Database

Extend the `school_role` enum with `exam_supervisor`.

Add attendance fields to `Reservations`:

```sql
attendance_status text not null default 'present'
attendance_marked_by uuid references auth.users(id)
attendance_marked_at timestamptz
```

Supported attendance statuses:

- `present`
- `absent`

A separate attendance table is probably unnecessary at first. Keep attendance on the reservation unless attendance becomes more complex later.

### Permissions

Recommended role capabilities:

| Role | Capabilities |
|---|---|
| `admin` | Full school management, reservation management, permission editing, attendance |
| `professor` | View members, restrict student self-booking, schedule students, cancel school reservations, view attendance |
| `exam_supervisor` | View reservations and mark attendance |
| `student` | View schedule/bookings, self-book if allowed, cancel reservations assigned to them |

### Backend

Add an attendance update function or RPC.

Validation rules:

- Caller is signed in.
- Caller is `exam_supervisor` in the school for mutations. Admins and professors can view attendance read-only.
- Reservation belongs to the caller's school.
- Reservation is confirmed.
- Attendance status is one of `pending`, `present`, or `absent`.

### UI

Add an `Attendance` tab to the school dashboard for:

- Admins.
- Professors, if they should be allowed to mark attendance.
- Exam supervisors.

Design:

- Day-based view, similar to the existing `Reservations` tab.
- Show reservation rows or grid cells with student name, exam name, exam type, slot, and attendance status.
- Use compact segmented controls: `Pending`, `Present`, `Absent`.
- Keep it operational and dense.

### Result

Exam supervisors can mark who attended scheduled exams without receiving broader school-management permissions.

## Part 5: Future Student Status Board

Status: Not started.

### Goal

Do not implement this in the first bundle, but preserve enough audit data so it is easy to add later.

Future model options:

```sql
StudentNotifications
SchoolActivityEvents
```

Recommended fields:

```sql
school_id uuid references "Schools"(id)
user_id uuid references auth.users(id) -- nullable for school-wide posts
type text
title text
body text
created_by uuid references auth.users(id)
read_at timestamptz
metadata jsonb
created_at timestamptz not null default now()
```

Possible event types:

- `scheduled`
- `cancelled`
- `attendance_marked`
- `permission_changed`
- `announcement`

### Design Consideration

Earlier phases should preserve:

- Who changed a student's booking permission.
- Who created a reservation.
- Who cancelled a reservation.
- Who marked attendance.

That audit data can later generate status-board entries without guessing what happened.

## Recommended Implementation Order

1. Done: Add `can_self_book` to `SchoolMembers`, enforce it in student booking, and add the member-list permission toggle.
2. Done: Add professor/admin booking for students with creator tracking.
3. Mostly done: Add reservation cancellation with ownership rules.
4. Done: Add cancellation confirmation dialogs.
5. Done: Add the `exam_supervisor` role and attendance marking.
6. Later: Add the student status board after the event model is clear.

## Current Remaining Work

- Decide whether cancellation audit fields (`cancelled_at`, `cancelled_by`, `cancel_reason`) should be added before attendance/status-board work.
- Remove the temporary `AttendanceSessions` start override after attendance timing is verified.
- Design and implement the future student status/news board.

## Verification Checklist For Each Part

- Read the relevant Next.js 16 docs from `node_modules/next/dist/docs/` before changing App Router, route handler, or proxy behavior.
- Create database migrations through the Supabase CLI migration workflow.
- Verify RLS and Edge Function authorization rules server-side.
- Run `npm run lint`.
- Run `npm run build`.
- Deploy or verify Supabase Edge Functions when changed.
- Refresh `graphify-out/` with `graphify update .` after substantial repo edits.
- Update `AGENTS.md` if the architecture or permission model changes materially.
