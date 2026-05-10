alter type public.school_role add value if not exists 'exam_supervisor';

alter table public."Schools"
add column if not exists deleted_at timestamptz,
add column if not exists deleted_by uuid references auth.users(id);

create index if not exists schools_active_created_by_idx
on public."Schools" (created_by)
where deleted_at is null;

alter table public."Reservations"
add column if not exists attendance_status text not null default 'present',
add column if not exists attendance_marked_by uuid references auth.users(id),
add column if not exists attendance_marked_at timestamptz;

alter table public."Reservations"
drop constraint if exists reservations_attendance_status_check;

alter table public."Reservations"
add constraint reservations_attendance_status_check
check (attendance_status in ('present', 'absent'));

create table if not exists public."AttendanceSessions" (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public."Schools"(id) on delete cascade,
  slot_id uuid not null references public."ExamSlots"(id) on delete cascade,
  reservation_date date not null,
  started_by uuid not null references auth.users(id),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public."AttendanceSessions" enable row level security;

create unique index if not exists attendance_sessions_slot_date_unique
on public."AttendanceSessions" (school_id, slot_id, reservation_date);

create index if not exists attendance_sessions_lookup_idx
on public."AttendanceSessions" (school_id, reservation_date, slot_id, expires_at);

create or replace function private.is_school_admin(target_school_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public."SchoolMembers"
    where user_id = auth.uid()
      and school_id = target_school_id
      and role = 'admin'::public.school_role
  )
  or exists (
    select 1
    from public."Schools"
    where id = target_school_id
      and created_by = auth.uid()
      and deleted_at is null
  );
$$;

create or replace function private.is_school_member(target_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public."SchoolMembers" sm
    inner join public."Schools" s
      on s.id = sm.school_id
    where sm.school_id = target_school_id
      and sm.user_id = auth.uid()
      and s.deleted_at is null
  )
  or exists (
    select 1
    from public."Schools" s
    where s.id = target_school_id
      and s.created_by = auth.uid()
      and s.deleted_at is null
  );
$$;

create or replace function private.can_view_school_members(target_school_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public."SchoolMembers" sm
    inner join public."Schools" s
      on s.id = sm.school_id
    where sm.user_id = auth.uid()
      and sm.school_id = target_school_id
      and sm.role::text in ('admin', 'professor', 'exam_supervisor')
      and s.deleted_at is null
  )
  or exists (
    select 1
    from public."Schools"
    where id = target_school_id
      and created_by = auth.uid()
      and deleted_at is null
  );
$$;

drop policy if exists "School members can view exam slots" on public."ExamSlots";
create policy "School members can view exam slots"
on public."ExamSlots"
for select
to authenticated
using (private.is_school_member(school_id));

drop policy if exists "School members can view confirmed reservations" on public."Reservations";
create policy "School members can view confirmed reservations"
on public."Reservations"
for select
to authenticated
using (
  status = 'confirmed'
  and private.is_school_member(school_id)
);

create or replace function private.get_school_confirmed_reservations(
  target_school_id uuid,
  start_date date,
  end_date date
)
returns table (
  id uuid,
  user_id uuid,
  student_name text,
  slot_id uuid,
  slot_name text,
  starts_at time,
  ends_at time,
  capacity integer,
  reservation_date date,
  exam_name text,
  exam_type text,
  status text,
  created_at timestamptz,
  created_by uuid,
  created_by_role public.school_role,
  attendance_status text,
  attendance_marked_by uuid,
  attendance_marked_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    r.id,
    r.user_id,
    coalesce(p.name, 'Unnamed student') as student_name,
    r.slot_id,
    es.name as slot_name,
    es.starts_at,
    es.ends_at,
    es.capacity,
    r.reservation_date,
    r.exam_name,
    r.exam_type::text,
    r.status::text,
    r.created_at,
    r.created_by,
    r.created_by_role,
    r.attendance_status,
    r.attendance_marked_by,
    r.attendance_marked_at
  from public."Reservations" r
  inner join public."ExamSlots" es
    on es.id = r.slot_id
  inner join public."Schools" s
    on s.id = r.school_id
  left join public."Profiles" p
    on p.id = r.user_id
  where r.school_id = target_school_id
    and r.status = 'confirmed'
    and r.reservation_date between start_date and end_date
    and s.deleted_at is null
    and private.is_school_member(target_school_id)
  order by r.reservation_date asc, es.starts_at asc, r.created_at asc;
$$;

create or replace function public.get_school_confirmed_reservations(
  target_school_id uuid,
  start_date date,
  end_date date
)
returns table (
  id uuid,
  user_id uuid,
  student_name text,
  slot_id uuid,
  slot_name text,
  starts_at time,
  ends_at time,
  capacity integer,
  reservation_date date,
  exam_name text,
  exam_type text,
  status text,
  created_at timestamptz,
  created_by uuid,
  created_by_role public.school_role,
  attendance_status text,
  attendance_marked_by uuid,
  attendance_marked_at timestamptz
)
language sql
stable
set search_path = public, private, pg_temp
as $$
  select *
  from private.get_school_confirmed_reservations(target_school_id, start_date, end_date);
$$;

drop policy if exists "Admins can delete schools" on public."Schools";

create or replace function private.soft_delete_school(target_school_id uuid)
returns table (
  school_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Invalid session.' using errcode = '28000';
  end if;

  if not private.is_school_admin(target_school_id) then
    raise exception 'Only school admins can delete this school.' using errcode = '42501';
  end if;

  update public."Schools" s
  set deleted_at = coalesce(s.deleted_at, now()),
      deleted_by = coalesce(s.deleted_by, caller_id)
  where s.id = target_school_id
    and s.deleted_at is null
  returning s.id into school_id;

  if school_id is null then
    raise exception 'School is unavailable or already deleted.' using errcode = 'P0002';
  end if;

  return next;
end;
$$;

create or replace function public.soft_delete_school(target_school_id uuid)
returns table (
  school_id uuid
)
language sql
set search_path = public, private, pg_temp
as $$
  select *
  from private.soft_delete_school(target_school_id);
$$;

create or replace function private.cancel_reservation(
  target_reservation_id uuid
)
returns table (
  reservation_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  reservation_record public."Reservations"%rowtype;
  caller_role public.school_role;
begin
  if caller_id is null then
    raise exception 'Invalid session.' using errcode = '28000';
  end if;

  select r.*
  into reservation_record
  from public."Reservations" r
  inner join public."Schools" s
    on s.id = r.school_id
  where r.id = target_reservation_id
    and r.status = 'confirmed'
    and s.deleted_at is null
  for update;

  if reservation_record.id is null then
    raise exception 'Reservation is unavailable or already cancelled.' using errcode = 'P0002';
  end if;

  if reservation_record.user_id = caller_id then
    update public."Reservations"
    set status = 'cancelled'
    where id = reservation_record.id;

    return query select reservation_record.id;
    return;
  end if;

  select sm.role
  into caller_role
  from public."SchoolMembers" sm
  where sm.school_id = reservation_record.school_id
    and sm.user_id = caller_id
    and sm.role::text in ('admin', 'professor')
  limit 1;

  if caller_role is null and exists (
    select 1
    from public."Schools" s
    where s.id = reservation_record.school_id
      and s.created_by = caller_id
      and s.deleted_at is null
  ) then
    caller_role := 'admin'::public.school_role;
  end if;

  if caller_role is null then
    raise exception 'Only students, admins, and professors can cancel this reservation.'
      using errcode = '42501';
  end if;

  update public."Reservations"
  set status = 'cancelled'
  where id = reservation_record.id;

  return query select reservation_record.id;
end;
$$;

create or replace function public.cancel_reservation(
  target_reservation_id uuid
)
returns table (
  reservation_id uuid
)
language sql
set search_path = public, private, pg_temp
as $$
  select *
  from private.cancel_reservation(target_reservation_id);
$$;

create or replace function private.start_attendance_session(
  target_school_id uuid,
  target_slot_id uuid,
  target_reservation_date date
)
returns table (
  session_id uuid,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  caller_is_supervisor boolean;
  slot_end time;
  expires_value timestamptz;
begin
  if caller_id is null then
    raise exception 'Invalid session.' using errcode = '28000';
  end if;

  select exists (
    select 1
    from public."SchoolMembers" sm
    inner join public."Schools" s
      on s.id = sm.school_id
    where sm.school_id = target_school_id
      and sm.user_id = caller_id
      and sm.role::text = 'exam_supervisor'
      and s.deleted_at is null
  )
  into caller_is_supervisor;

  if not caller_is_supervisor then
    raise exception 'Only exam supervisors can start attendance.' using errcode = '42501';
  end if;

  select es.ends_at
  into slot_end
  from public."ExamSlots" es
  inner join public."Schools" s
    on s.id = es.school_id
  where es.id = target_slot_id
    and es.school_id = target_school_id
    and es.is_active = true
    and s.deleted_at is null;

  if slot_end is null then
    raise exception 'Selected slot is unavailable.' using errcode = '22023';
  end if;

  expires_value := greatest(
    (target_reservation_date + slot_end)::timestamptz,
    now() + interval '2 hours'
  );

  insert into public."AttendanceSessions" (
    school_id,
    slot_id,
    reservation_date,
    started_by,
    expires_at
  )
  values (
    target_school_id,
    target_slot_id,
    target_reservation_date,
    caller_id,
    expires_value
  )
  on conflict (school_id, slot_id, reservation_date)
  do update set
    started_by = excluded.started_by,
    started_at = now(),
    expires_at = excluded.expires_at
  returning "AttendanceSessions".id, "AttendanceSessions".expires_at
  into session_id, expires_at;

  return next;
end;
$$;

create or replace function public.start_attendance_session(
  target_school_id uuid,
  target_slot_id uuid,
  target_reservation_date date
)
returns table (
  session_id uuid,
  expires_at timestamptz
)
language sql
set search_path = public, private, pg_temp
as $$
  select *
  from private.start_attendance_session(
    target_school_id,
    target_slot_id,
    target_reservation_date
  );
$$;

create or replace function private.set_reservation_attendance(
  target_reservation_id uuid,
  target_attendance_status text
)
returns table (
  reservation_id uuid,
  attendance_status text,
  attendance_marked_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  reservation_record public."Reservations"%rowtype;
  slot_record public."ExamSlots"%rowtype;
  exam_start_at timestamptz;
  exam_end_at timestamptz;
  session_exists boolean;
  caller_is_supervisor boolean;
begin
  if caller_id is null then
    raise exception 'Invalid session.' using errcode = '28000';
  end if;

  if target_attendance_status not in ('present', 'absent') then
    raise exception 'Invalid attendance status.' using errcode = '22023';
  end if;

  select r.*
  into reservation_record
  from public."Reservations" r
  inner join public."Schools" s
    on s.id = r.school_id
  where r.id = target_reservation_id
    and r.status = 'confirmed'
    and s.deleted_at is null
  for update;

  if reservation_record.id is null then
    raise exception 'Reservation is unavailable.' using errcode = 'P0002';
  end if;

  select exists (
    select 1
    from public."SchoolMembers" sm
    where sm.school_id = reservation_record.school_id
      and sm.user_id = caller_id
      and sm.role::text = 'exam_supervisor'
  )
  into caller_is_supervisor;

  if not caller_is_supervisor then
    raise exception 'Only exam supervisors can mark attendance.' using errcode = '42501';
  end if;

  select es.*
  into slot_record
  from public."ExamSlots" es
  where es.id = reservation_record.slot_id
    and es.school_id = reservation_record.school_id
    and es.is_active = true;

  if slot_record.id is null then
    raise exception 'Selected slot is unavailable.' using errcode = '22023';
  end if;

  exam_start_at := (reservation_record.reservation_date + slot_record.starts_at)::timestamptz;
  exam_end_at := (reservation_record.reservation_date + slot_record.ends_at)::timestamptz;

  select exists (
    select 1
    from public."AttendanceSessions" session
    where session.school_id = reservation_record.school_id
      and session.slot_id = reservation_record.slot_id
      and session.reservation_date = reservation_record.reservation_date
      and session.expires_at > now()
  )
  into session_exists;

  if now() < exam_start_at - interval '5 minutes' and not session_exists then
    raise exception 'Attendance can only be marked starting five minutes before the exam.'
      using errcode = '42501';
  end if;

  if now() > exam_end_at and not session_exists then
    raise exception 'Attendance marking is closed for this exam.'
      using errcode = '42501';
  end if;

  update public."Reservations"
  set attendance_status = target_attendance_status,
      attendance_marked_by = caller_id,
      attendance_marked_at = now()
  where id = reservation_record.id
  returning "Reservations".id, "Reservations".attendance_status, "Reservations".attendance_marked_at
  into reservation_id, attendance_status, attendance_marked_at;

  return next;
end;
$$;

create or replace function public.set_reservation_attendance(
  target_reservation_id uuid,
  target_attendance_status text
)
returns table (
  reservation_id uuid,
  attendance_status text,
  attendance_marked_at timestamptz
)
language sql
set search_path = public, private, pg_temp
as $$
  select *
  from private.set_reservation_attendance(
    target_reservation_id,
    target_attendance_status
  );
$$;

drop policy if exists "School members can view attendance sessions" on public."AttendanceSessions";
create policy "School members can view attendance sessions"
on public."AttendanceSessions"
for select
to authenticated
using (private.is_school_member(school_id));
