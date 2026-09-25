-- Bug fixes on top of 20260924104243_refactor_booking_rpc_helpers.sql.
--
-- 1. "Today" in the school's timezone everywhere.
--    reserve_exam_slot, schedule_exam_for_student, and create_schedule_request
--    used current_date (UTC). update_reservation already used the school's
--    timezone. Between 00:00 and ~03:00 Europe/Bucharest the UTC date is still
--    "yesterday", so the 14-day window was off by one day for part of the night.
--
-- 2. Staff bookings route into the overflow room.
--    schedule_exam_for_student only counted the selected room, so a full main
--    room returned "Selected slot is full" even with free overflow seats.
--    Selecting the main room now uses the same primary -> overflow routing as
--    student bookings, updates, and request approvals. Explicitly selecting the
--    overflow room still books only that room.
--
-- Public signatures and return shapes are unchanged.

-------------------------------------------------------------------------------
-- reserve_exam_slot: only the date check changes.
-------------------------------------------------------------------------------

create or replace function private.reserve_exam_slot(
  target_school_id uuid,
  target_slot_id uuid,
  target_reservation_date date,
  target_exam_name text,
  target_exam_type text
)
returns table (
  reservation_id uuid,
  remaining integer,
  booked_slot_id uuid,
  booked_slot_kind text,
  routed_to_overflow boolean,
  slot_name text,
  starts_at time without time zone,
  ends_at time without time zone,
  capacity integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  student_can_self_book boolean;
  primary_slot public."ExamSlots";
  overflow_slot public."ExamSlots";
  booked public."ExamSlots";
  seat record;
begin
  if caller_id is null then
    raise exception 'Invalid session.' using errcode = 'P0001';
  end if;

  begin
    perform private.assert_school_role(target_school_id, 'student'::public.school_role);
  exception
    when insufficient_privilege then
      raise exception 'Only student members can reserve exam slots.' using errcode = '42501';
  end;

  select sm.can_self_book
  into student_can_self_book
  from public."SchoolMembers" sm
  where sm.school_id = target_school_id
    and sm.user_id = caller_id;

  if student_can_self_book is null then
    raise exception 'Only student members can reserve exam slots.' using errcode = 'P0001';
  end if;

  if student_can_self_book = false then
    raise exception 'Student self booking is disabled.' using errcode = 'P0001';
  end if;

  perform private.assert_exam_fields(target_exam_name, target_exam_type);
  perform private.assert_valid_reservation_date(target_school_id, target_reservation_date);

  primary_slot := private.get_active_primary_slot(target_school_id, target_slot_id);
  if primary_slot.id is null then
    raise exception 'Selected slot is unavailable.' using errcode = '22023';
  end if;

  overflow_slot := private.get_active_overflow_slot(target_school_id, primary_slot.id);

  perform private.lock_slot_date(target_school_id, target_reservation_date, primary_slot.id);

  if private.has_slot_group_reservation(
    target_school_id, caller_id, target_reservation_date, primary_slot.id, overflow_slot.id
  ) then
    raise exception 'You already reserved this slot for that date.' using errcode = '23505';
  end if;

  perform private.assert_no_future_exam_duplicate(
    target_school_id, caller_id, target_exam_name, target_exam_type
  );

  select * into seat from private.claim_slot_group_seat(
    target_school_id, target_reservation_date, primary_slot, overflow_slot
  );
  if seat.booked_slot_id is null then
    raise exception 'Selected slot is full.' using errcode = 'P0001';
  end if;

  booked := case when seat.booked_slot_id = primary_slot.id then primary_slot else overflow_slot end;

  insert into public."Reservations" (
    school_id, user_id, slot_id, reservation_date, exam_name, exam_type,
    status, created_by, created_by_role
  )
  values (
    target_school_id, caller_id, booked.id, target_reservation_date,
    btrim(target_exam_name), target_exam_type::public.exam_type,
    'confirmed', caller_id, 'student'::public.school_role
  )
  returning id into reservation_id;

  booked_slot_id := booked.id;
  booked_slot_kind := booked.slot_kind;
  routed_to_overflow := booked.slot_kind = 'overflow';
  slot_name := booked.name;
  starts_at := booked.starts_at;
  ends_at := booked.ends_at;
  capacity := booked.capacity;
  remaining := booked.capacity - seat.used_seats - 1;
  return next;
exception
  when unique_violation then
    if sqlerrm ilike '%future reservation for this exam and type%' then
      raise;
    end if;

    raise exception 'You already reserved this slot for that date.' using errcode = '23505';
end;
$$;

-------------------------------------------------------------------------------
-- schedule_exam_for_student: school-timezone date check + overflow routing.
-------------------------------------------------------------------------------

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
  selected_slot public."ExamSlots";
  primary_slot_id uuid;
  overflow_slot public."ExamSlots";
  booked public."ExamSlots";
  used_seats integer;
  seat record;
begin
  if caller_id is null then
    raise exception 'Invalid session.' using errcode = 'P0001';
  end if;

  caller_role := private.caller_staff_role(
    target_school_id,
    'Only admins and professors can schedule exams for students.'
  );

  if not exists (
    select 1
    from public."SchoolMembers" sm
    where sm.school_id = target_school_id
      and sm.user_id = target_student_user_id
      and sm.role = 'student'::public.school_role
  ) then
    raise exception 'Target user must be a student member of this school.' using errcode = 'P0001';
  end if;

  perform private.assert_exam_fields(target_exam_name, target_exam_type);
  perform private.assert_valid_reservation_date(target_school_id, target_reservation_date);

  select es.*
  into selected_slot
  from public."ExamSlots" es
  where es.id = target_slot_id
    and es.school_id = target_school_id
    and es.is_active = true;

  if selected_slot.id is null then
    raise exception 'Selected slot is unavailable.' using errcode = '22023';
  end if;

  -- Duplicate checks and locks always key on the primary room of the pair.
  if selected_slot.slot_kind = 'overflow' then
    primary_slot_id := selected_slot.primary_slot_id;
    overflow_slot := selected_slot;
  else
    primary_slot_id := selected_slot.id;
    overflow_slot := private.get_active_overflow_slot(target_school_id, selected_slot.id);
  end if;

  perform private.lock_slot_date(target_school_id, target_reservation_date, primary_slot_id);

  if private.has_slot_group_reservation(
    target_school_id, target_student_user_id, target_reservation_date, primary_slot_id, overflow_slot.id
  ) then
    raise exception 'This student already has this slot reserved for that date.' using errcode = '23505';
  end if;

  perform private.assert_no_future_exam_duplicate(
    target_school_id, target_student_user_id, target_exam_name, target_exam_type
  );

  if selected_slot.slot_kind = 'overflow' then
    -- Staff explicitly chose the overflow room: book only there.
    perform private.lock_slot_date(target_school_id, target_reservation_date, selected_slot.id);
    used_seats := private.count_confirmed_reservations(
      target_school_id, selected_slot.id, target_reservation_date
    );

    if used_seats >= selected_slot.capacity then
      raise exception 'Selected slot is full.' using errcode = 'P0001';
    end if;

    booked := selected_slot;
  else
    select * into seat from private.claim_slot_group_seat(
      target_school_id, target_reservation_date, selected_slot, overflow_slot
    );

    if seat.booked_slot_id is null then
      raise exception 'Selected slot is full.' using errcode = 'P0001';
    end if;

    booked := case when seat.booked_slot_id = selected_slot.id then selected_slot else overflow_slot end;
    used_seats := seat.used_seats;
  end if;

  insert into public."Reservations" (
    school_id, user_id, slot_id, reservation_date, exam_name, exam_type,
    status, created_by, created_by_role
  )
  values (
    target_school_id, target_student_user_id, booked.id, target_reservation_date,
    btrim(target_exam_name), target_exam_type::public.exam_type,
    'confirmed', caller_id, caller_role
  )
  returning id into reservation_id;

  remaining := booked.capacity - used_seats - 1;
  return next;
exception
  when unique_violation then
    if sqlerrm ilike '%future reservation for this exam and type%' then
      raise;
    end if;

    raise exception 'This student already has this slot reserved for that date.' using errcode = '23505';
end;
$$;

-------------------------------------------------------------------------------
-- create_schedule_request: only the date check changes.
-------------------------------------------------------------------------------

create or replace function private.create_schedule_request(
  target_school_id uuid,
  target_teacher_user_id uuid,
  target_slot_id uuid,
  target_reservation_date date,
  target_exam_name text,
  target_exam_type text
)
returns table (
  request_id uuid,
  status text,
  expires_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  student_can_self_book boolean;
  selected_slot public."ExamSlots";
  primary_slot public."ExamSlots";
  request_expires_at timestamptz;
begin
  if caller_id is null then
    raise exception 'Invalid session.' using errcode = '28000';
  end if;

  perform private.expire_due_schedule_requests(target_school_id, caller_id);

  select sm.can_self_book
  into student_can_self_book
  from public."SchoolMembers" sm
  inner join public."Schools" s
    on s.id = sm.school_id
  where sm.school_id = target_school_id
    and sm.user_id = caller_id
    and sm.role = 'student'::public.school_role
    and s.deleted_at is null;

  if student_can_self_book is null then
    raise exception 'Only student members can request exam scheduling.' using errcode = 'P0001';
  end if;

  if student_can_self_book = true then
    raise exception 'Students with self-booking enabled should reserve directly.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public."SchoolMembers" sm
    inner join public."Schools" s
      on s.id = sm.school_id
    where sm.school_id = target_school_id
      and sm.user_id = target_teacher_user_id
      and sm.role = 'professor'::public.school_role
      and s.deleted_at is null
  ) then
    raise exception 'Choose a professor from this school.' using errcode = '22023';
  end if;

  perform private.assert_exam_fields(target_exam_name, target_exam_type);
  perform private.assert_valid_reservation_date(target_school_id, target_reservation_date);

  select es.*
  into selected_slot
  from public."ExamSlots" es
  where es.id = target_slot_id
    and es.school_id = target_school_id
    and es.is_active = true;

  if selected_slot.id is null then
    raise exception 'Selected slot is unavailable.' using errcode = '22023';
  end if;

  if selected_slot.slot_kind = 'overflow' then
    primary_slot := private.get_active_primary_slot(target_school_id, selected_slot.primary_slot_id);
  else
    primary_slot := selected_slot;
  end if;

  if primary_slot.id is null then
    raise exception 'Selected primary slot is unavailable.' using errcode = '22023';
  end if;

  request_expires_at := ((target_reservation_date + primary_slot.starts_at)
    at time zone private.school_timezone(target_school_id))
    - interval '2 hours';

  if request_expires_at <= now() then
    raise exception 'Requests close two hours before the exam starts.' using errcode = 'P0001';
  end if;

  insert into public."ScheduleRequests" (
    school_id,
    student_user_id,
    requested_teacher_user_id,
    requested_slot_id,
    requested_slot_group_id,
    reservation_date,
    exam_name,
    exam_type,
    expires_at
  )
  values (
    target_school_id,
    caller_id,
    target_teacher_user_id,
    primary_slot.id,
    primary_slot.id,
    target_reservation_date,
    btrim(target_exam_name),
    target_exam_type::public.exam_type,
    request_expires_at
  )
  returning id into request_id;

  perform private.notify_user(
    target_teacher_user_id,
    target_school_id,
    request_id,
    null,
    'schedule_request_created',
    'New exam request',
    'A student requested approval for ' || btrim(target_exam_name) || '.',
    '/dashboard/schools/' || target_school_id::text || '?tab=examRequests'
  );

  status := 'pending';
  expires_at := request_expires_at;
  return next;
exception
  when unique_violation then
    raise exception 'You already have a pending request for this slot and date.' using errcode = '23505';
end;
$$;
