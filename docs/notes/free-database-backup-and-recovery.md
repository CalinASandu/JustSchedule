# Free Database Backup and Recovery Plan

This document captures a no-paid-services disaster recovery plan for JustSchedule. The goal is to make schedule loss unlikely, make accidental changes reversible, and keep independent backups that can be restored later.

This is not the same guarantee as paid point-in-time recovery. Without PITR, there can still be a gap between the latest backup and the moment a failure happens. The free strategy should therefore combine backups with application-level recovery protections.

## What Must Be Protected

The highest-risk data is school schedule data:

- `ExamSlots`: reusable school slot templates.
- `Reservations`: actual dated exam bookings.
- `Schools`, `SchoolMembers`, `Profiles`: needed to understand who owns and can manage schedule data.
- Invite and join-request tables: lower risk, but still useful for account recovery and audits.

For scheduling, `Reservations.reservation_date` is the actual calendar day. `ExamSlots` do not store dates; they are reusable templates.

## Recovery Goals

Target goals for the free setup:

- Accidental reservation cancellation can be reversed from database history.
- Accidental schedule edits can be reconstructed from audit rows.
- A broken migration can be rolled back by restoring the latest pre-migration dump.
- A total database loss can be restored from an offsite export.

Known limitation:

- If the last backup is 24 hours old and the database is destroyed, changes made after that backup may only be recoverable if they exist in audit/history exports or another independent copy.

## Layer 1: Avoid Hard Deletes

Schedule-critical data should not be hard-deleted during normal app flows.

Use status fields and timestamps instead:

```sql
-- Reservations already use status = 'cancelled' for cancellation.
-- Add richer cancellation metadata in a later audit pass.
alter table public."Reservations"
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id),
  add column if not exists cancel_reason text;
```

For entities that currently need deletion behavior, prefer a soft-delete field before permanent deletion:

```sql
alter table public."ExamSlots"
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id);
```

Application queries should hide soft-deleted rows:

```sql
where deleted_at is null
```

For reservations, prefer filtering by status:

```sql
where status = 'confirmed'
```

Hard deletes should be reserved for rare maintenance tasks, not normal product actions.

## Layer 2: Add Audit History Tables

Backups recover the whole database. Audit history recovers one bad edit without rolling back everything.

Add append-only history tables for critical schedule tables. The first priority is `Reservations`, then `ExamSlots`.

Suggested reservation history shape:

```sql
create table if not exists public."ReservationHistory" (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid,
  school_id uuid,
  action text not null check (action in ('insert', 'update', 'delete')),
  changed_at timestamptz not null default now(),
  changed_by uuid,
  old_row jsonb,
  new_row jsonb
);
```

Suggested trigger function pattern:

```sql
create or replace function public.record_reservation_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public."ReservationHistory" (
      reservation_id,
      school_id,
      action,
      changed_by,
      new_row
    )
    values (
      new.id,
      new.school_id,
      'insert',
      auth.uid(),
      to_jsonb(new)
    );

    return new;
  elsif tg_op = 'UPDATE' then
    insert into public."ReservationHistory" (
      reservation_id,
      school_id,
      action,
      changed_by,
      old_row,
      new_row
    )
    values (
      new.id,
      new.school_id,
      'update',
      auth.uid(),
      to_jsonb(old),
      to_jsonb(new)
    );

    return new;
  elsif tg_op = 'DELETE' then
    insert into public."ReservationHistory" (
      reservation_id,
      school_id,
      action,
      changed_by,
      old_row
    )
    values (
      old.id,
      old.school_id,
      'delete',
      auth.uid(),
      to_jsonb(old)
    );

    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists reservations_history_trigger on public."Reservations";

create trigger reservations_history_trigger
after insert or update or delete on public."Reservations"
for each row execute function public.record_reservation_history();
```

Notes before implementation:

- Confirm the live table names and columns before creating the migration.
- Decide whether users should read their own history, or whether history should be admin-only.
- Keep history append-only. Normal app users should not update or delete history rows.

## Layer 3: Manual Backups Before Risky Changes

Before any production migration:

1. Export schema and data.
2. Store the dump outside the repository.
3. Run the migration.
4. Verify schedule reads, reservation creation, reservation cancellation, and RLS.

Suggested folder layout outside the repo:

```text
JustScheduleBackups/
  production/
    2026-05-05-before-reservation-audit/
      schema.sql
      data.sql
      roles.sql
      restore-notes.md
```

Do not commit database dumps to Git. Dumps can contain user data.

## Layer 4: Scheduled Local Exports

Use a local scheduled task on the development machine or a small always-on machine.

Recommended free schedule:

- Daily full dump.
- Extra dump before each migration.
- Keep 30 daily backups if storage allows.
- Keep one monthly backup for long-term recovery.

Storage targets:

- External drive.
- Private encrypted cloud folder.
- Private NAS or home server.
- Private object storage if a free tier is available.

At least one copy should be outside the computer used for development.

## Layer 5: Restore Drills

A backup is only useful if it can be restored.

Once per month, test restore into a local Supabase database or a temporary project:

1. Restore roles, schema, and data.
2. Confirm schools load.
3. Confirm school members load.
4. Confirm `ExamSlots` load.
5. Confirm `Reservations` load for several days.
6. Confirm cancelled reservations remain available for audit.
7. Confirm RLS still blocks unauthorized access.
8. Confirm the app can read the restored data.

Keep short notes beside each backup:

```text
Backup date:
Source project:
Migration version:
Restore tested:
Known issues:
```

## Layer 6: Operational Habits

Use these rules once the app has real users:

- Never run production migrations without a fresh backup.
- Never edit production rows manually without writing down the change.
- Avoid destructive SQL such as `delete from ...` without a transaction and a prior `select` showing the affected rows.
- Prefer status changes over deletes.
- Keep migrations versioned in `supabase/migrations`.
- After schema changes, update this document and `AGENTS.md` if the operational model changes.

Safer manual SQL pattern:

```sql
begin;

select *
from public."Reservations"
where school_id = '<school-id>'
  and reservation_date = '<date>';

-- Make the intended change here.

-- Verify result here.

rollback;
-- Replace rollback with commit only after verification.
```

## Implementation Order

Recommended order when this gets implemented:

1. Add cancellation metadata to `Reservations`.
2. Add `ReservationHistory` with insert/update/delete triggers.
3. Add `ExamSlotHistory` with insert/update/delete triggers.
4. Add soft-delete fields to `ExamSlots` if slot deletion becomes part of the UI.
5. Create local backup scripts.
6. Create a Windows Task Scheduler job for daily backups.
7. Perform and document the first restore drill.

The most important first step is audit history for `Reservations`, because that is where losing one day of schedules would hurt most.
