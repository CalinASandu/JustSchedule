-- Refactor the booking RPCs onto shared private helpers.
--
-- Behavior is intentionally unchanged: every public RPC keeps its signature,
-- return shape, error messages, and error codes. Known bugs (UTC "today" in
-- some RPCs, staff bookings ignoring overflow rooms) are fixed separately in
-- 20260924104425_fix_booking_date_and_staff_overflow.sql so each step can be
-- verified on its own.
--
-- Two intentional lock-level differences in private.review_schedule_request:
--   * it now also takes the overflow slot/date advisory lock before counting
--     overflow seats, like reserve_exam_slot and update_reservation already do;
--   * it no longer takes FOR UPDATE row locks on the ExamSlots rows. The
--     slot/date advisory locks are what serialize seat counting everywhere else.

-------------------------------------------------------------------------------
-- Helpers
-------------------------------------------------------------------------------

-- Timezone of an active school. Raises when the school is missing or deleted.
create or replace function private.school_timezone(target_school_id uuid)
returns text
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  found_timezone text;
begin
  select coalesce(s.timezone, 'Europe/Bucharest')
  into found_timezone
  from public."Schools" s
  where s.id = target_school_id
    and s.deleted_at is null;

  if found_timezone is null then
    raise exception 'School not found.' using errcode = 'P0002';
  end if;

  return found_timezone;
end;
$$;

-- Today's date on the school's local wall clock.
create or replace function private.school_today(target_school_id uuid)
returns date
language sql
stable
set search_path = public, pg_temp
as $$
  select (now() at time zone private.school_timezone(target_school_id))::date;
$$;

-- Booking window rule: from `today` through `today + 14`, weekdays only.
create or replace function private.assert_booking_date(
  target_reservation_date date,
  today date
)
returns void
language plpgsql
immutable
as $$
begin
  if target_reservation_date < today
    or target_reservation_date > today + 14 then
    raise exception 'Reservation date must be within the next 14 days.' using errcode = '22023';
  end if;

  if extract(isodow from target_reservation_date) in (6, 7) then
    raise exception 'Weekend reservations are unavailable.' using errcode = '22023';
  end if;
end;
$$;

-- Exam type and non-empty exam name. Subject matching stays in
-- private.assert_school_subject_name, called by the public wrappers.
create or replace function private.assert_exam_fields(
  target_exam_name text,
  target_exam_type text
)
returns void
language plpgsql
immutable
as $$
begin
  if target_exam_type not in ('midterm', 'final') then
    raise exception 'Invalid exam type.' using errcode = '22023';
  end if;

  if length(btrim(coalesce(target_exam_name, ''))) = 0 then
    raise exception 'Exam name is required.' using errcode = '22023';
  end if;
end;
$$;

-- Returns 'admin' or 'professor' for the caller in an active school, or raises
-- `denied_message` (42501) for anyone else.
create or replace function private.caller_staff_role(
  target_school_id uuid,
  denied_message text
)
returns public.school_role
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  found_role public.school_role;
begin
  if caller_id is null then
    raise exception 'Invalid session.' using errcode = '28000';
  end if;

  select sm.role
  into found_role
  from public."SchoolMembers" sm
  inner join public."Schools" s
    on s.id = sm.school_id
  where sm.user_id = caller_id
    and sm.school_id = target_school_id
    and sm.role in ('admin'::public.school_role, 'professor'::public.school_role)
    and s.deleted_at is null;

  if found_role is null then
    raise exception '%', denied_message using errcode = '42501';
  end if;

  return found_role;
end;
$$;

-- Serializes seat counting for one slot on one date. The key format must stay
-- stable so concurrent callers always contend on the same lock.
create or replace function private.lock_slot_date(
  target_school_id uuid,
  target_reservation_date date,
  target_slot_id uuid
)
returns void
language sql
volatile
as $$
  select pg_advisory_xact_lock(
    hashtext(target_school_id::text),
    hashtext(target_reservation_date::text || ':' || target_slot_id::text)
  );
$$;

create or replace function private.count_confirmed_reservations(
  target_school_id uuid,
  target_slot_id uuid,
  target_reservation_date date,
  ignored_reservation_id uuid default null
)
returns integer
language sql
stable
set search_path = public, pg_temp
as $$
  select count(*)::integer
  from public."Reservations" r
  where r.school_id = target_school_id
    and r.slot_id = target_slot_id
    and r.reservation_date = target_reservation_date
    and r.status = 'confirmed'
    and (ignored_reservation_id is null or r.id <> ignored_reservation_id);
$$;

-- Active primary slot of a school, or NULL.
create or replace function private.get_active_primary_slot(
  target_school_id uuid,
  target_slot_id uuid
)
returns public."ExamSlots"
language sql
stable
set search_path = public, pg_temp
as $$
  select es.*
  from public."ExamSlots" es
  where es.id = target_slot_id
    and es.school_id = target_school_id
    and es.is_active = true
    and es.slot_kind = 'primary';
$$;

-- Active overflow room of a primary slot, or NULL.
create or replace function private.get_active_overflow_slot(
  target_school_id uuid,
  target_primary_slot_id uuid
)
returns public."ExamSlots"
language sql
stable
set search_path = public, pg_temp
as $$
  select es.*
  from public."ExamSlots" es
  where es.school_id = target_school_id
    and es.primary_slot_id = target_primary_slot_id
    and es.slot_kind = 'overflow'
    and es.is_active = true
  order by es.name asc, es.id asc
  limit 1;
$$;

-- True when the student already holds a confirmed reservation in the
-- primary/overflow pair on that date.
create or replace function private.has_slot_group_reservation(
  target_school_id uuid,
  target_user_id uuid,
  target_reservation_date date,
  target_primary_slot_id uuid,
  target_overflow_slot_id uuid,
  ignored_reservation_id uuid default null
)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public."Reservations" r
    where r.school_id = target_school_id
      and r.user_id = target_user_id
      and r.reservation_date = target_reservation_date
      and r.status = 'confirmed'
      and (ignored_reservation_id is null or r.id <> ignored_reservation_id)
      and (
        r.slot_id = target_primary_slot_id
        or (target_overflow_slot_id is not null and r.slot_id = target_overflow_slot_id)
      )
  );
$$;

-- Picks the room for a new seat: the primary slot while it has capacity, then
-- the overflow room. Returns a NULL booked_slot_id when both are full.
-- The caller must already hold the primary slot/date lock; this takes the
-- overflow lock itself before counting overflow seats.
create or replace function private.claim_slot_group_seat(
  target_school_id uuid,
  target_reservation_date date,
  primary_slot public."ExamSlots",
  overflow_slot public."ExamSlots",
  ignored_reservation_id uuid default null,
  out booked_slot_id uuid,
  out used_seats integer
)
language plpgsql
volatile
set search_path = public, pg_temp
as $$
begin
  used_seats := private.count_confirmed_reservations(
    target_school_id, primary_slot.id, target_reservation_date, ignored_reservation_id
  );

  if used_seats < primary_slot.capacity then
    booked_slot_id := primary_slot.id;
    return;
  end if;

  if overflow_slot.id is null then
    return;
  end if;

  perform private.lock_slot_date(target_school_id, target_reservation_date, overflow_slot.id);

  used_seats := private.count_confirmed_reservations(
    target_school_id, overflow_slot.id, target_reservation_date, ignored_reservation_id
  );

  if used_seats < overflow_slot.capacity then
    booked_slot_id := overflow_slot.id;
  end if;
end;
$$;

-- Closes a pending schedule request and optionally notifies the student.
create or replace function private.resolve_schedule_request(
  target_request public."ScheduleRequests",
  new_status text,
  reviewer_id uuid,
  new_reviewer_message text,
  new_reservation_id uuid default null,
  notification_type text default null,
  notification_title text default null,
  notification_body text default null
)
returns void
language plpgsql
volatile
set search_path = public, pg_temp
as $$
begin
  update public."ScheduleRequests" sr
  set
    status = new_status,
    reviewed_by = reviewer_id,
    reviewed_at = now(),
    reviewer_message = new_reviewer_message,
    reservation_id = coalesce(new_reservation_id, sr.reservation_id),
    teacher_seen_at = coalesce(sr.teacher_seen_at, now()),
    teacher_seen_by = coalesce(sr.teacher_seen_by, reviewer_id)
  where sr.id = target_request.id;

  if notification_type is not null then
    perform private.notify_user(
      target_request.student_user_id,
      target_request.school_id,
      target_request.id,
      new_reservation_id,
      notification_type,
      notification_title,
      notification_body,
      '/dashboard/schedule?schoolId=' || target_request.school_id::text || '&panel=reservations'
    );
  end if;
end;
$$;

-- Helpers are only called from SECURITY DEFINER functions (which run as the
-- owner), so nobody else needs to execute them directly.
revoke all on function private.school_timezone(uuid) from public;
revoke all on function private.school_today(uuid) from public;
revoke all on function private.assert_booking_date(date, date) from public;
revoke all on function private.assert_exam_fields(text, text) from public;
revoke all on function private.caller_staff_role(uuid, text) from public;
revoke all on function private.lock_slot_date(uuid, date, uuid) from public;
revoke all on function private.count_confirmed_reservations(uuid, uuid, date, uuid) from public;
revoke all on function private.get_active_primary_slot(uuid, uuid) from public;
revoke all on function private.get_active_overflow_slot(uuid, uuid) from public;
revoke all on function private.has_slot_group_reservation(uuid, uuid, date, uuid, uuid, uuid) from public;
revoke all on function private.claim_slot_group_seat(uuid, date, public."ExamSlots", public."ExamSlots", uuid) from public;
revoke all on function private.resolve_schedule_request(public."ScheduleRequests", text, uuid, text, uuid, text, text, text) from public;

-------------------------------------------------------------------------------
-- Existing helper, now expressed through the new ones (same behavior).
-------------------------------------------------------------------------------

create or replace function private.assert_valid_reservation_date(
  target_school_id uuid,
  target_reservation_date date
)
returns boolean
language plpgsql
stable
set search_path = public, pg_temp
as $$
begin
  perform private.assert_booking_date(
    target_reservation_date,
    private.school_today(target_school_id)
  );
  return true;
end;
$$;

-------------------------------------------------------------------------------
-- reserve_exam_slot: a student books for themselves.
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
  perform private.assert_booking_date(target_reservation_date, current_date);

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
-- schedule_exam_for_student: an admin or professor books for a student.
-- Still books only into the selected slot; overflow routing is added in the
-- follow-up bug-fix migration.
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
  slot_capacity integer;
  slot_group_id uuid;
  confirmed_count integer;
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
  perform private.assert_booking_date(target_reservation_date, current_date);

  select
    es.capacity,
    case when es.slot_kind = 'overflow' then es.primary_slot_id else es.id end
  into slot_capacity, slot_group_id
  from public."ExamSlots" es
  where es.id = target_slot_id
    and es.school_id = target_school_id
    and es.is_active = true;

  if slot_capacity is null or slot_group_id is null then
    raise exception 'Selected slot is unavailable.' using errcode = '22023';
  end if;

  perform private.lock_slot_date(target_school_id, target_reservation_date, slot_group_id);

  if exists (
    select 1
    from public."Reservations" r
    where r.school_id = target_school_id
      and r.user_id = target_student_user_id
      and r.reservation_date = target_reservation_date
      and r.status = 'confirmed'
      and (
        r.slot_id = slot_group_id
        or r.slot_id in (
          select es.id
          from public."ExamSlots" es
          where es.primary_slot_id = slot_group_id
            and es.slot_kind = 'overflow'
        )
      )
  ) then
    raise exception 'This student already has this slot reserved for that date.' using errcode = '23505';
  end if;

  perform private.assert_no_future_exam_duplicate(
    target_school_id, target_student_user_id, target_exam_name, target_exam_type
  );

  confirmed_count := private.count_confirmed_reservations(
    target_school_id, target_slot_id, target_reservation_date
  );

  if confirmed_count >= slot_capacity then
    raise exception 'Selected slot is full.' using errcode = 'P0001';
  end if;

  insert into public."Reservations" (
    school_id, user_id, slot_id, reservation_date, exam_name, exam_type,
    status, created_by, created_by_role
  )
  values (
    target_school_id, target_student_user_id, target_slot_id, target_reservation_date,
    btrim(target_exam_name), target_exam_type::public.exam_type,
    'confirmed', caller_id, caller_role
  )
  returning id into reservation_id;

  remaining := slot_capacity - confirmed_count - 1;
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
-- update_reservation: an admin or professor moves or edits a reservation.
-------------------------------------------------------------------------------

create or replace function private.update_reservation(
  target_reservation_id uuid,
  target_slot_id uuid,
  target_reservation_date date,
  target_exam_name text,
  target_exam_type text
)
returns table (
  reservation_id uuid,
  booked_slot_id uuid,
  booked_slot_kind text,
  routed_to_overflow boolean,
  slot_name text,
  starts_at time without time zone,
  ends_at time without time zone,
  capacity integer,
  remaining integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  reservation_record public."Reservations"%rowtype;
  primary_slot public."ExamSlots";
  overflow_slot public."ExamSlots";
  booked public."ExamSlots";
  seat record;
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
    raise exception 'Confirmed reservation not found.' using errcode = 'P0002';
  end if;

  perform private.caller_staff_role(
    reservation_record.school_id,
    'Only admins and professors can update reservations.'
  );

  perform private.assert_valid_reservation_date(reservation_record.school_id, target_reservation_date);
  perform private.assert_exam_fields(target_exam_name, target_exam_type);

  primary_slot := private.get_active_primary_slot(reservation_record.school_id, target_slot_id);
  if primary_slot.id is null then
    raise exception 'Selected slot is unavailable.' using errcode = '22023';
  end if;

  overflow_slot := private.get_active_overflow_slot(reservation_record.school_id, primary_slot.id);

  perform private.lock_slot_date(reservation_record.school_id, target_reservation_date, primary_slot.id);

  if private.has_slot_group_reservation(
    reservation_record.school_id,
    reservation_record.user_id,
    target_reservation_date,
    primary_slot.id,
    overflow_slot.id,
    reservation_record.id
  ) then
    raise exception 'Student already has a reservation for this slot on that date.' using errcode = '23505';
  end if;

  perform private.assert_no_future_exam_duplicate(
    reservation_record.school_id,
    reservation_record.user_id,
    target_exam_name,
    target_exam_type,
    reservation_record.id
  );

  select * into seat from private.claim_slot_group_seat(
    reservation_record.school_id,
    target_reservation_date,
    primary_slot,
    overflow_slot,
    reservation_record.id
  );
  if seat.booked_slot_id is null then
    raise exception 'Selected slot is full.' using errcode = 'P0001';
  end if;

  booked := case when seat.booked_slot_id = primary_slot.id then primary_slot else overflow_slot end;

  update public."Reservations" r
  set
    slot_id = booked.id,
    reservation_date = target_reservation_date,
    exam_name = btrim(target_exam_name),
    exam_type = target_exam_type::public.exam_type
  where r.id = reservation_record.id
    and r.status = 'confirmed';

  if not found then
    raise exception 'Confirmed reservation not found.' using errcode = 'P0002';
  end if;

  reservation_id := reservation_record.id;
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

    raise exception 'Student already has a reservation for this slot on that date.' using errcode = '23505';
end;
$$;

-------------------------------------------------------------------------------
-- create_schedule_request: a student without self-booking asks a professor.
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
  perform private.assert_booking_date(target_reservation_date, current_date);

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

-------------------------------------------------------------------------------
-- review_schedule_request: a professor/admin approves or declines a request.
-- Every early exit returns only (request_id, status); the other outputs stay NULL.
-------------------------------------------------------------------------------

create or replace function private.review_schedule_request(
  target_request_id uuid,
  target_decision text,
  target_reviewer_message text default null
)
returns table (
  request_id uuid,
  status text,
  reservation_id uuid,
  booked_slot_id uuid,
  booked_slot_kind text,
  remaining integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  request_record public."ScheduleRequests"%rowtype;
  caller_role public.school_role;
  primary_slot public."ExamSlots";
  overflow_slot public."ExamSlots";
  booked public."ExamSlots";
  seat record;
  normalized_message text := nullif(btrim(coalesce(target_reviewer_message, '')), '');
begin
  if caller_id is null then
    raise exception 'Invalid session.' using errcode = '28000';
  end if;

  select *
  into request_record
  from public."ScheduleRequests" sr
  where sr.id = target_request_id
  for update;

  if request_record.id is null then
    raise exception 'Schedule request is unavailable.' using errcode = 'P0002';
  end if;

  caller_role := private.caller_staff_role(
    request_record.school_id,
    'Only admins and professors can review exam requests.'
  );

  if caller_role = 'professor'::public.school_role
    and request_record.requested_teacher_user_id <> caller_id then
    raise exception 'Professors can only review requests assigned to them.' using errcode = 'P0001';
  end if;

  request_id := request_record.id;

  -- Already resolved: just record that the reviewer saw it.
  if request_record.status <> 'pending' then
    update public."ScheduleRequests" sr
    set
      teacher_seen_at = coalesce(sr.teacher_seen_at, now()),
      teacher_seen_by = coalesce(sr.teacher_seen_by, caller_id)
    where sr.id = request_record.id;

    status := request_record.status;
    reservation_id := request_record.reservation_id;
    return next;
    return;
  end if;

  if request_record.expires_at <= now() then
    perform private.resolve_schedule_request(
      request_record, 'expired', caller_id, normalized_message, null,
      'schedule_request_expired',
      'Exam request expired',
      request_record.exam_name || ' was not approved before the two-hour cutoff.'
    );
    status := 'expired';
    return next;
    return;
  end if;

  if target_decision not in ('approved', 'declined') then
    raise exception 'Invalid request decision.' using errcode = '22023';
  end if;

  if target_decision = 'declined' then
    perform private.resolve_schedule_request(
      request_record, 'declined', caller_id, normalized_message, null,
      'schedule_request_declined',
      'Exam request declined',
      coalesce(normalized_message, request_record.exam_name || ' was declined.')
    );
    status := 'declined';
    return next;
    return;
  end if;

  if not exists (
    select 1
    from public."SchoolMembers" sm
    inner join public."Schools" s
      on s.id = sm.school_id
    where sm.school_id = request_record.school_id
      and sm.user_id = request_record.student_user_id
      and sm.role = 'student'::public.school_role
      and s.deleted_at is null
  ) then
    perform private.resolve_schedule_request(
      request_record, 'failed_conflict', caller_id,
      coalesce(normalized_message, 'The student is no longer a member of this school.')
    );
    status := 'failed_conflict';
    return next;
    return;
  end if;

  primary_slot := private.get_active_primary_slot(
    request_record.school_id, request_record.requested_slot_group_id
  );

  if primary_slot.id is null then
    perform private.resolve_schedule_request(
      request_record, 'failed_capacity', caller_id,
      coalesce(normalized_message, 'The requested slot is no longer available.')
    );
    status := 'failed_capacity';
    return next;
    return;
  end if;

  overflow_slot := private.get_active_overflow_slot(request_record.school_id, primary_slot.id);

  perform private.lock_slot_date(request_record.school_id, request_record.reservation_date, primary_slot.id);

  if private.has_slot_group_reservation(
    request_record.school_id,
    request_record.student_user_id,
    request_record.reservation_date,
    primary_slot.id,
    overflow_slot.id
  ) then
    perform private.resolve_schedule_request(
      request_record, 'failed_conflict', caller_id,
      coalesce(normalized_message, 'The student already has this time reserved.'),
      null,
      'schedule_request_failed',
      'Exam request could not be approved',
      'You already have this time reserved.'
    );
    status := 'failed_conflict';
    return next;
    return;
  end if;

  begin
    perform private.assert_no_future_exam_duplicate(
      request_record.school_id,
      request_record.student_user_id,
      request_record.exam_name,
      request_record.exam_type::text
    );
  exception
    when unique_violation then
      perform private.resolve_schedule_request(
        request_record, 'failed_conflict', caller_id,
        coalesce(normalized_message, 'The student already has a future reservation for this exam and type.'),
        null,
        'schedule_request_failed',
        'Exam request could not be approved',
        'You already have a future reservation for this exam and type.'
      );
      status := 'failed_conflict';
      return next;
      return;
  end;

  select * into seat from private.claim_slot_group_seat(
    request_record.school_id, request_record.reservation_date, primary_slot, overflow_slot
  );

  if seat.booked_slot_id is null then
    perform private.resolve_schedule_request(
      request_record, 'failed_capacity', caller_id,
      coalesce(normalized_message, 'The requested slot filled before approval.'),
      null,
      'schedule_request_failed',
      'Exam request could not be approved',
      'The requested slot filled before approval. Please request another time.'
    );
    status := 'failed_capacity';
    return next;
    return;
  end if;

  booked := case when seat.booked_slot_id = primary_slot.id then primary_slot else overflow_slot end;

  insert into public."Reservations" (
    school_id, user_id, slot_id, reservation_date, exam_name, exam_type,
    status, created_by, created_by_role
  )
  values (
    request_record.school_id, request_record.student_user_id, booked.id,
    request_record.reservation_date, request_record.exam_name, request_record.exam_type,
    'confirmed', caller_id, caller_role
  )
  returning id into reservation_id;

  perform private.resolve_schedule_request(
    request_record, 'approved', caller_id, normalized_message, reservation_id,
    'schedule_request_approved',
    'Exam request approved',
    coalesce(normalized_message, request_record.exam_name || ' was approved.')
  );

  status := 'approved';
  booked_slot_id := booked.id;
  booked_slot_kind := booked.slot_kind;
  remaining := booked.capacity - seat.used_seats - 1;
  return next;
exception
  when unique_violation then
    perform private.resolve_schedule_request(
      request_record, 'failed_conflict', caller_id,
      coalesce(normalized_message, 'The student already has a conflicting reservation.')
    );

    request_id := target_request_id;
    status := 'failed_conflict';
    reservation_id := null;
    booked_slot_id := null;
    booked_slot_kind := null;
    remaining := null;
    return next;
end;
$$;

-------------------------------------------------------------------------------
-- mark_schedule_request_teacher_seen: same role check as review.
-------------------------------------------------------------------------------

create or replace function private.mark_schedule_request_teacher_seen(target_request_id uuid)
returns table (
  request_id uuid,
  teacher_seen_at timestamp with time zone,
  teacher_seen_by uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  request_record public."ScheduleRequests"%rowtype;
  caller_role public.school_role;
begin
  if caller_id is null then
    raise exception 'Invalid session.' using errcode = '28000';
  end if;

  select *
  into request_record
  from public."ScheduleRequests" sr
  where sr.id = target_request_id;

  if request_record.id is null then
    raise exception 'Request not found.' using errcode = 'P0001';
  end if;

  caller_role := private.caller_staff_role(
    request_record.school_id,
    'Only admins and professors can mark exam requests as seen.'
  );

  if caller_role = 'professor'::public.school_role
    and request_record.requested_teacher_user_id <> caller_id then
    raise exception 'Professors can only mark requests assigned to them as seen.'
      using errcode = 'P0001';
  end if;

  update public."ScheduleRequests" sr
  set
    teacher_seen_at = coalesce(sr.teacher_seen_at, now()),
    teacher_seen_by = coalesce(sr.teacher_seen_by, caller_id)
  where sr.id = request_record.id
  returning sr.id, sr.teacher_seen_at, sr.teacher_seen_by
  into request_id, teacher_seen_at, teacher_seen_by;

  return next;
end;
$$;
