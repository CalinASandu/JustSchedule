drop policy if exists "School members can view confirmed reservations" on public."Reservations";
create policy "School members can view confirmed reservations"
on public."Reservations"
for select
to authenticated
using (
  status = 'confirmed'
  and (
    exists (
      select 1
      from public."SchoolMembers" sm
      where sm.school_id = "Reservations".school_id
        and sm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public."Schools" s
      where s.id = "Reservations".school_id
        and s.created_by = auth.uid()
    )
  )
);

create or replace function private.is_student_school_member(target_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public."SchoolMembers" sm
    where sm.school_id = target_school_id
      and sm.user_id = auth.uid()
      and sm.role = 'student'::public.school_role
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
    where sm.school_id = target_school_id
      and sm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public."Schools" s
    where s.id = target_school_id
      and s.created_by = auth.uid()
  );
$$;

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
  created_at timestamptz
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
    r.created_at
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
  created_at timestamptz
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
begin
  if caller_id is null then
    raise exception 'Invalid session.' using errcode = 'P0001';
  end if;

  if not private.is_student_school_member(target_school_id) then
    raise exception 'Only student members can reserve exam slots.' using errcode = 'P0001';
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
    status
  )
  values (
    target_school_id,
    caller_id,
    target_slot_id,
    target_reservation_date,
    trim(target_exam_name),
    target_exam_type::public.exam_type,
    'confirmed'
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

create or replace function public.reserve_exam_slot(
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
language sql
set search_path = public, private, pg_temp
as $$
  select *
  from private.reserve_exam_slot(
    target_school_id,
    target_slot_id,
    target_reservation_date,
    target_exam_name,
    target_exam_type
  );
$$;
