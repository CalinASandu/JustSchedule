# Student History Feature — Implementation Plan

## Goal

Allow admins and professors to view a per-student activity history from the Members tab: how often a student books, cancels, and whether they show up to exams.

## Data source

Everything lives in `public."ReservationHistory"` — no new table needed.

The index `reservation_history_user_idx` on `((new_row->>'user_id'), school_id)` is already applied (migration `20260530000001_reservation_history_user_index.sql`).

### What each action type tells us

| `action` | What to read | What it means |
|---|---|---|
| `insert` | `new_row` | Student booked a slot |
| `update` where `old_row->>'status' = 'confirmed'` and `new_row->>'status' = 'cancelled'` | `new_row`, `changed_by` | Cancellation — `changed_by` tells you if the student or staff cancelled |
| `update` where `new_row->>'attendance_status'` changed | `new_row` | Attendance marked present or absent |

Fields available inside `new_row` / `old_row` JSONB:
- `user_id` — the student
- `school_id`
- `slot_id` — join to `ExamSlots` for slot name and times
- `reservation_date`
- `exam_name`
- `exam_type` (`midterm` / `final`)
- `status` (`confirmed` / `cancelled`)
- `attendance_status` (`present` / `absent`)
- `attendance_marked_at`

## Entry point

Add a "History" item to the `⋯` member actions dropdown in `SchoolManagementTabs.tsx`, visible to admins and professors, only for student members.

Clicking it opens a dialog (or inline panel below the card) scoped to that student.

## Backend — RPC

Create a new RPC `get_student_reservation_history` in a new migration:

```sql
create or replace function public.get_student_reservation_history(
  target_school_id uuid,
  target_user_id uuid
)
returns table (
  action text,
  changed_at timestamptz,
  changed_by uuid,
  reservation_date date,
  exam_name text,
  exam_type text,
  old_status text,
  new_status text,
  attendance_status text
)
language sql
security definer
set search_path = public
as $$
  select
    h.action,
    h.changed_at,
    h.changed_by,
    (coalesce(h.new_row, h.old_row)->>'reservation_date')::date as reservation_date,
    coalesce(h.new_row, h.old_row)->>'exam_name' as exam_name,
    coalesce(h.new_row, h.old_row)->>'exam_type' as exam_type,
    h.old_row->>'status' as old_status,
    h.new_row->>'status' as new_status,
    h.new_row->>'attendance_status' as attendance_status
  from public."ReservationHistory" h
  where h.school_id = target_school_id
    and h.new_row->>'user_id' = target_user_id::text
    and exists (
      select 1 from public."SchoolMembers"
      where school_id = target_school_id
        and user_id = auth.uid()
        and role in ('admin', 'professor')
    )
  order by h.changed_at desc
  limit 200;
$$;
```

## Frontend — UI

### Summary stats bar (top of dialog)

Compute from the returned rows client-side:

- **Bookings** — count of `action = 'insert'`
- **Self-cancellations** — count of cancellation updates where `changed_by = student user_id`
- **Staff cancellations** — count where `changed_by != student user_id`
- **Present** — count of attendance updates where `attendance_status = 'present'`
- **Absent** — count where `attendance_status = 'absent'`

### Timeline list

Show rows grouped by `reservation_date` descending. Each event shows:
- Date + exam name + exam type
- Event type chip: Booked / Cancelled (by student) / Cancelled (by staff) / Marked present / Marked absent
- Timestamp

## Files to create / modify

| File | Change |
|---|---|
| `supabase/migrations/<timestamp>_student_history_rpc.sql` | New RPC + grant |
| `supabase/functions/` | Not needed — RPC is sufficient |
| `components/dashboard/SchoolManagementTabs.tsx` | Add "History" to `⋯` dropdown; add dialog state + fetch + render |

## Not needed

- New database table
- New Edge Function
- Changes to existing RLS policies (the RPC uses `security definer` and checks caller role internally)
