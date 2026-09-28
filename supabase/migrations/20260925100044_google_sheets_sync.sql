-- Google Sheets live copy of reservations: one linked spreadsheet per school.
--
-- Flow: a trigger on Reservations flags the school's link as needing a sync;
-- a pg_cron job runs every minute and, only when some link is flagged, calls
-- the `google-sheets` Edge Function. The function writes new bookings into the
-- school's weekly planning tabs (creating a week's tab when missing) and
-- clears the entries it wrote for cancelled bookings. Nothing here changes how
-- reservations are written; a failure in the trigger is swallowed so it can
-- never block a booking.

create extension if not exists pg_net;
create extension if not exists pg_cron;

create table public."SchoolSheetLinks" (
  school_id uuid primary key references public."Schools" (id) on delete cascade,
  spreadsheet_id text not null,
  spreadsheet_title text,
  linked_by uuid not null references auth.users (id),
  linked_at timestamptz not null default now(),
  needs_sync boolean not null default false,
  retry_after timestamptz,
  last_synced_at timestamptz,
  last_error text,
  last_error_at timestamptz
);

alter table public."SchoolSheetLinks" enable row level security;

-- Admins can see their school's link. All writes go through the Edge Function
-- with the service role, after it has checked the caller is an admin.
create policy "School admins can view their sheet link"
  on public."SchoolSheetLinks"
  for select
  to authenticated
  using (private.is_school_admin(school_id));

create index "SchoolSheetLinks_needs_sync_idx"
  on public."SchoolSheetLinks" (school_id)
  where needs_sync;

-- Admin check the Edge Function runs as the caller before touching Google.
create function public.can_manage_school_sheet(target_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select private.is_school_admin(target_school_id);
$$;

revoke all on function public.can_manage_school_sheet(uuid) from public, anon;
grant execute on function public.can_manage_school_sheet(uuid) to authenticated;

-- Flags the school's sheet for the next sync run.
create function private.flag_school_sheet_sync()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  update public."SchoolSheetLinks" l
  set needs_sync = true
  where l.school_id = coalesce(new.school_id, old.school_id)
    and not l.needs_sync;

  return null;
exception
  when others then
    raise warning 'flag_school_sheet_sync failed: %', sqlerrm;
    return null;
end;
$$;

revoke all on function private.flag_school_sheet_sync() from public;

-- Only columns that appear in the sheet; attendance marking does not resync.
create trigger reservations_flag_sheet_sync
  after insert or delete or update of status, slot_id, reservation_date, exam_name, exam_type, user_id
  on public."Reservations"
  for each row
  execute function private.flag_school_sheet_sync();

-- Claims every flagged link that is not waiting out a retry delay.
create function public.claim_school_sheet_syncs()
returns setof public."SchoolSheetLinks"
language sql
volatile
security definer
set search_path to 'public', 'pg_temp'
as $$
  update public."SchoolSheetLinks"
  set needs_sync = false
  where needs_sync
    and (retry_after is null or retry_after <= now())
  returning *;
$$;

revoke all on function public.claim_school_sheet_syncs() from public, anon, authenticated;
grant execute on function public.claim_school_sheet_syncs() to service_role;

-- Which reservation the sync wrote into the sheet, and the exact text, so a
-- cancellation or change clears only that entry. Service role only.
create table public."SheetReservationEntries" (
  reservation_id uuid primary key references public."Reservations" (id) on delete cascade,
  school_id uuid not null references public."Schools" (id) on delete cascade,
  spreadsheet_id text not null,
  reservation_date date not null,
  slot_start text not null,
  entry_text text not null,
  written_at timestamptz not null default now()
);

alter table public."SheetReservationEntries" enable row level security;

create index "SheetReservationEntries_school_idx"
  on public."SheetReservationEntries" (school_id, spreadsheet_id);

-- What the sheet should contain: confirmed reservations created since the
-- sheet was linked. Overflow bookings go in their main room's time block.
create function public.get_school_sheet_rows(target_school_id uuid)
returns table (
  reservation_id uuid,
  reservation_date date,
  slot_start text,
  student_name text,
  exam_name text,
  exam_type text
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select
    r.id,
    r.reservation_date,
    to_char(coalesce(primary_slot.starts_at, es.starts_at), 'HH24:MI'),
    p.name,
    r.exam_name,
    r.exam_type::text
  from public."Reservations" r
  join public."SchoolSheetLinks" l on l.school_id = r.school_id
  join public."ExamSlots" es on es.id = r.slot_id
  left join public."ExamSlots" primary_slot on primary_slot.id = es.primary_slot_id
  left join public."Profiles" p on p.id = r.user_id
  where r.school_id = target_school_id
    and r.status = 'confirmed'
    and r.created_at >= l.linked_at
  order by r.created_at;
$$;

revoke all on function public.get_school_sheet_rows(uuid) from public, anon, authenticated;
grant execute on function public.get_school_sheet_rows(uuid) to service_role;

-- Shared secret the cron job sends; the Edge Function checks it through this
-- service-role-only function, so the value never leaves the database.
select vault.create_secret(
  replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  'google_sheets_sync_secret',
  'Bearer token pg_cron sends to the google-sheets Edge Function'
);

create function public.is_sheet_sync_secret(candidate text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1
    from vault.decrypted_secrets
    where name = 'google_sheets_sync_secret'
      and decrypted_secret = candidate
  );
$$;

revoke all on function public.is_sheet_sync_secret(text) from public, anon, authenticated;
grant execute on function public.is_sheet_sync_secret(text) to service_role;

-- Every minute; makes no HTTP call unless a link is flagged and due.
select cron.schedule(
  'google-sheets-sync',
  '* * * * *',
  $cron$
    select net.http_post(
      url := 'https://trklyoutnojcdnxordhv.supabase.co/functions/v1/google-sheets',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'google_sheets_sync_secret'
        )
      ),
      body := '{"action":"sync"}'::jsonb,
      timeout_milliseconds := 60000
    )
    where exists (
      select 1
      from public."SchoolSheetLinks"
      where needs_sync
        and (retry_after is null or retry_after <= now())
    );
  $cron$
);
