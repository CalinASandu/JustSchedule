alter table public."SchoolMembers"
add column if not exists can_self_book boolean not null default true,
add column if not exists self_booking_disabled_at timestamptz,
add column if not exists self_booking_disabled_by uuid references auth.users(id);

drop function if exists public.get_school_members_with_profiles(uuid);
drop function if exists private.get_school_members_with_profiles(uuid);

create or replace function private.get_school_members_with_profiles(target_school_id uuid)
returns table (
  id uuid,
  user_id uuid,
  role public.school_role,
  joined_at timestamptz,
  profile_name text,
  email text,
  can_self_book boolean,
  self_booking_disabled_at timestamptz,
  self_booking_disabled_by uuid
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    sm.id,
    sm.user_id,
    sm.role,
    sm.joined_at,
    p.name as profile_name,
    u.email::text as email,
    sm.can_self_book,
    sm.self_booking_disabled_at,
    sm.self_booking_disabled_by
  from public."SchoolMembers" sm
  left join public."Profiles" p
    on p.id = sm.user_id
  left join auth.users u
    on u.id = sm.user_id
  where sm.school_id = target_school_id
    and private.can_view_school_members(target_school_id)
  order by sm.joined_at asc;
$$;

create or replace function public.get_school_members_with_profiles(target_school_id uuid)
returns table (
  id uuid,
  user_id uuid,
  role public.school_role,
  joined_at timestamptz,
  profile_name text,
  email text,
  can_self_book boolean,
  self_booking_disabled_at timestamptz,
  self_booking_disabled_by uuid
)
language sql
stable
set search_path = public, private, pg_temp
as $$
  select * from private.get_school_members_with_profiles(target_school_id);
$$;

create or replace function private.set_student_self_booking_permission(
  target_school_id uuid,
  target_member_id uuid,
  target_can_self_book boolean
)
returns table (
  member_id uuid,
  can_self_book boolean,
  self_booking_disabled_at timestamptz,
  self_booking_disabled_by uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  target_member public."SchoolMembers"%rowtype;
begin
  if caller_id is null then
    raise exception 'Invalid session.' using errcode = 'P0001';
  end if;

  if not private.can_view_school_members(target_school_id) then
    raise exception 'Only admins and professors can update student self-booking permissions.' using errcode = 'P0001';
  end if;

  select *
  into target_member
  from public."SchoolMembers" sm
  where sm.id = target_member_id
    and sm.school_id = target_school_id
  for update;

  if target_member.id is null then
    raise exception 'School member was not found.' using errcode = '22023';
  end if;

  if target_member.role <> 'student'::public.school_role then
    raise exception 'Only student self-booking permissions can be changed.' using errcode = '22023';
  end if;

  if target_member.user_id = caller_id then
    raise exception 'Students cannot update their own self-booking permission.' using errcode = 'P0001';
  end if;

  update public."SchoolMembers" sm
  set
    can_self_book = target_can_self_book,
    self_booking_disabled_at = case
      when target_can_self_book then null
      when sm.can_self_book = false then sm.self_booking_disabled_at
      else now()
    end,
    self_booking_disabled_by = case
      when target_can_self_book then null
      when sm.can_self_book = false then sm.self_booking_disabled_by
      else caller_id
    end
  where sm.id = target_member_id
    and sm.school_id = target_school_id
  returning
    sm.id,
    sm.can_self_book,
    sm.self_booking_disabled_at,
    sm.self_booking_disabled_by
  into
    member_id,
    can_self_book,
    self_booking_disabled_at,
    self_booking_disabled_by;

  return next;
end;
$$;

create or replace function public.set_student_self_booking_permission(
  target_school_id uuid,
  target_member_id uuid,
  target_can_self_book boolean
)
returns table (
  member_id uuid,
  can_self_book boolean,
  self_booking_disabled_at timestamptz,
  self_booking_disabled_by uuid
)
language sql
set search_path = public, private, pg_temp
as $$
  select *
  from private.set_student_self_booking_permission(
    target_school_id,
    target_member_id,
    target_can_self_book
  );
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
