alter table public."Reservations"
add column if not exists created_by uuid references auth.users(id),
add column if not exists created_by_role public.school_role;

update public."Reservations"
set
  created_by = user_id,
  created_by_role = 'student'::public.school_role
where created_by is null
   or created_by_role is null;

alter table public."Reservations"
alter column created_by set not null,
alter column created_by_role set not null;

create index if not exists reservations_created_by_idx
on public."Reservations" (created_by);

drop function if exists public.get_school_confirmed_reservations(uuid, date, date);
drop function if exists private.get_school_confirmed_reservations(uuid, date, date);

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
  created_by_role public.school_role
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
    r.created_by_role
  from public."Reservations" r
  inner join public."ExamSlots" es
    on es.id = r.slot_id
  left join public."Profiles" p
    on p.id = r.user_id
  where r.school_id = target_school_id
    and r.status = 'confirmed'
    and r.reservation_date between start_date and end_date
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
  created_by_role public.school_role
)
language sql
stable
set search_path = public, private, pg_temp
as $$
  select *
  from private.get_school_confirmed_reservations(target_school_id, start_date, end_date);
$$;

create or replace function private.reserve_exam_slot(
  target_school_id uuid,
  target_slot_id uuid,
  target_reservation_date date,
  target_exam_name text,
  target_exam_type text
)
returns table (
  reservation_id uuid,
  remaining integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  slot_capacity integer;
  confirmed_count integer;
  inserted_id uuid;
  student_can_self_book boolean;
begin
  if caller_id is null then
    raise exception 'Invalid session.' using errcode = 'P0001';
  end if;

  select sm.can_self_book
  into student_can_self_book
  from public."SchoolMembers" sm
  where sm.school_id = target_school_id
    and sm.user_id = caller_id
    and sm.role = 'student'::public.school_role;

  if student_can_self_book is null then
    raise exception 'Only student members can reserve exam slots.' using errcode = 'P0001';
  end if;

  if student_can_self_book = false then
    raise exception 'Student self booking is disabled.' using errcode = 'P0001';
  end if;

  if target_exam_type not in ('midterm', 'final') then
    raise exception 'Invalid exam type.' using errcode = '22023';
  end if;

  if length(trim(coalesce(target_exam_name, ''))) = 0 then
    raise exception 'Exam name is required.' using errcode = '22023';
  end if;

  if target_reservation_date < current_date
    or target_reservation_date > current_date + 14 then
    raise exception 'Reservation date must be within the next 14 days.' using errcode = '22023';
  end if;

  if extract(isodow from target_reservation_date) in (6, 7) then
    raise exception 'Weekend reservations are unavailable.' using errcode = '22023';
  end if;

  select es.capacity
  into slot_capacity
  from public."ExamSlots" es
  where es.id = target_slot_id
    and es.school_id = target_school_id
    and es.is_active = true;

  if slot_capacity is null then
    raise exception 'Selected slot is unavailable.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(target_school_id::text),
    hashtext(target_reservation_date::text || ':' || target_slot_id::text)
  );

  select count(*)::integer
  into confirmed_count
  from public."Reservations" r
  where r.school_id = target_school_id
    and r.slot_id = target_slot_id
    and r.reservation_date = target_reservation_date
    and r.status = 'confirmed';

  if confirmed_count >= slot_capacity then
    raise exception 'Selected slot is full.' using errcode = 'P0001';
  end if;

  insert into public."Reservations" (
    school_id,
    user_id,
    slot_id,
    reservation_date,
    exam_name,
    exam_type,
    status,
    created_by,
    created_by_role
  )
  values (
    target_school_id,
    caller_id,
    target_slot_id,
    target_reservation_date,
    trim(target_exam_name),
    target_exam_type::public.exam_type,
    'confirmed',
    caller_id,
    'student'::public.school_role
  )
  returning id into inserted_id;

  reservation_id := inserted_id;
  remaining := slot_capacity - confirmed_count - 1;
  return next;
exception
  when unique_violation then
    raise exception 'You already reserved this slot for that date.' using errcode = '23505';
end;
$$;

create or replace function private.schedule_exam_for_student(
  target_school_id uuid,
  target_student_user_id uuid,
  target_slot_id uuid,
  target_reservation_date date,
  target_exam_name text,
  target_exam_type text
)
returns table (
  reservation_id uuid,
  remaining integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  caller_role public.school_role;
  slot_capacity integer;
  confirmed_count integer;
  inserted_id uuid;
begin
  if caller_id is null then
    raise exception 'Invalid session.' using errcode = 'P0001';
  end if;

  select sm.role
  into caller_role
  from public."SchoolMembers" sm
  where sm.school_id = target_school_id
    and sm.user_id = caller_id
    and sm.role in ('admin'::public.school_role, 'professor'::public.school_role);

  if caller_role is null and exists (
    select 1
    from public."Schools" s
    where s.id = target_school_id
      and s.created_by = caller_id
  ) then
    caller_role := 'admin'::public.school_role;
  end if;

  if caller_role not in ('admin'::public.school_role, 'professor'::public.school_role) then
    raise exception 'Only admins and professors can schedule exams for students.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public."SchoolMembers" sm
    where sm.school_id = target_school_id
      and sm.user_id = target_student_user_id
      and sm.role = 'student'::public.school_role
  ) then
    raise exception 'Target user must be a student member of this school.' using errcode = 'P0001';
  end if;

  if target_exam_type not in ('midterm', 'final') then
    raise exception 'Invalid exam type.' using errcode = '22023';
  end if;

  if length(trim(coalesce(target_exam_name, ''))) = 0 then
    raise exception 'Exam name is required.' using errcode = '22023';
  end if;

  if target_reservation_date < current_date
    or target_reservation_date > current_date + 14 then
    raise exception 'Reservation date must be within the next 14 days.' using errcode = '22023';
  end if;

  if extract(isodow from target_reservation_date) in (6, 7) then
    raise exception 'Weekend reservations are unavailable.' using errcode = '22023';
  end if;

  select es.capacity
  into slot_capacity
  from public."ExamSlots" es
  where es.id = target_slot_id
    and es.school_id = target_school_id
    and es.is_active = true;

  if slot_capacity is null then
    raise exception 'Selected slot is unavailable.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(target_school_id::text),
    hashtext(target_reservation_date::text || ':' || target_slot_id::text)
  );

  select count(*)::integer
  into confirmed_count
  from public."Reservations" r
  where r.school_id = target_school_id
    and r.slot_id = target_slot_id
    and r.reservation_date = target_reservation_date
    and r.status = 'confirmed';

  if confirmed_count >= slot_capacity then
    raise exception 'Selected slot is full.' using errcode = 'P0001';
  end if;

  insert into public."Reservations" (
    school_id,
    user_id,
    slot_id,
    reservation_date,
    exam_name,
    exam_type,
    status,
    created_by,
    created_by_role
  )
  values (
    target_school_id,
    target_student_user_id,
    target_slot_id,
    target_reservation_date,
    trim(target_exam_name),
    target_exam_type::public.exam_type,
    'confirmed',
    caller_id,
    caller_role
  )
  returning id into inserted_id;

  reservation_id := inserted_id;
  remaining := slot_capacity - confirmed_count - 1;
  return next;
exception
  when unique_violation then
    raise exception 'This student already has this slot reserved for that date.' using errcode = '23505';
end;
$$;

create or replace function public.schedule_exam_for_student(
  target_school_id uuid,
  target_student_user_id uuid,
  target_slot_id uuid,
  target_reservation_date date,
  target_exam_name text,
  target_exam_type text
)
returns table (
  reservation_id uuid,
  remaining integer
)
language sql
set search_path = public, private, pg_temp
as $$
  select *
  from private.schedule_exam_for_student(
    target_school_id,
    target_student_user_id,
    target_slot_id,
    target_reservation_date,
    target_exam_name,
    target_exam_type
  );
$$;
