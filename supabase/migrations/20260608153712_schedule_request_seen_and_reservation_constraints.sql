alter table public."ScheduleRequests"
add column if not exists student_seen_at timestamptz,
add column if not exists teacher_seen_at timestamptz,
add column if not exists teacher_seen_by uuid references auth.users(id);

create index if not exists schedule_requests_student_visibility_idx
on public."ScheduleRequests" (student_user_id, school_id, status, student_seen_at, created_at desc);

create index if not exists schedule_requests_teacher_visibility_idx
on public."ScheduleRequests" (requested_teacher_user_id, school_id, status, teacher_seen_at, created_at desc);

create or replace function public.get_user_notifications(target_school_id uuid default null)
returns table (
  id uuid,
  school_id uuid,
  schedule_request_id uuid,
  reservation_id uuid,
  type text,
  title text,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz
)
language sql
stable
set search_path = public, pg_temp
as $$
  select
    un.id,
    un.school_id,
    un.schedule_request_id,
    un.reservation_id,
    un.type,
    un.title,
    un.body,
    un.href,
    un.read_at,
    un.created_at
  from public."UserNotifications" un
  where un.recipient_user_id = auth.uid()
    and un.read_at is null
    and (target_school_id is null or un.school_id = target_school_id)
  order by un.created_at desc
  limit 50;
$$;

create or replace function private.assert_no_future_exam_duplicate(
  target_school_id uuid,
  target_user_id uuid,
  target_exam_name text,
  target_exam_type text,
  ignored_reservation_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_exam_name text := lower(btrim(coalesce(target_exam_name, '')));
begin
  perform pg_advisory_xact_lock(
    hashtext(target_school_id::text || ':' || target_user_id::text),
    hashtext(normalized_exam_name || ':' || target_exam_type)
  );

  if exists (
    select 1
    from public."Reservations" r
    where r.school_id = target_school_id
      and r.user_id = target_user_id
      and r.status = 'confirmed'
      and r.reservation_date >= current_date
      and lower(btrim(r.exam_name)) = normalized_exam_name
      and r.exam_type = target_exam_type::public.exam_type
      and (ignored_reservation_id is null or r.id <> ignored_reservation_id)
  ) then
    raise exception 'This student already has a future reservation for this exam and type.'
      using errcode = '23505';
  end if;
end;
$$;

create or replace function private.mark_schedule_request_seen(target_request_id uuid)
returns table (
  request_id uuid,
  student_seen_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  request_status text;
begin
  if caller_id is null then
    raise exception 'Invalid session.' using errcode = '28000';
  end if;

  update public."ScheduleRequests" sr
  set student_seen_at = coalesce(sr.student_seen_at, now())
  where sr.id = target_request_id
    and sr.student_user_id = caller_id
    and sr.status in ('approved', 'declined')
  returning sr.id, sr.student_seen_at
  into request_id, student_seen_at;

  if request_id is null then
    select sr.status::text
    into request_status
    from public."ScheduleRequests" sr
    where sr.id = target_request_id
      and sr.student_user_id = caller_id;

    if request_status is null then
      raise exception 'Request not found.' using errcode = 'P0001';
    end if;

    raise exception 'Only approved or declined requests can be marked as seen.'
      using errcode = 'P0001';
  end if;

  return next;
end;
$$;

create or replace function public.mark_schedule_request_seen(target_request_id uuid)
returns table (
  request_id uuid,
  student_seen_at timestamptz
)
language sql
set search_path = public, private, pg_temp
as $$
  select *
  from private.mark_schedule_request_seen(target_request_id);
$$;

create or replace function private.mark_schedule_request_teacher_seen(target_request_id uuid)
returns table (
  request_id uuid,
  teacher_seen_at timestamptz,
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

  begin
    perform private.assert_school_role(request_record.school_id, 'admin'::public.school_role);
    caller_role := 'admin'::public.school_role;
  exception
    when insufficient_privilege then
      begin
        perform private.assert_school_role(request_record.school_id, 'professor'::public.school_role);
        caller_role := 'professor'::public.school_role;
      exception
        when insufficient_privilege then
          raise exception 'Only admins and professors can mark exam requests as seen.'
            using errcode = '42501';
      end;
  end;

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

create or replace function public.mark_schedule_request_teacher_seen(target_request_id uuid)
returns table (
  request_id uuid,
  teacher_seen_at timestamptz,
  teacher_seen_by uuid
)
language sql
set search_path = public, private, pg_temp
as $$
  select *
  from private.mark_schedule_request_teacher_seen(target_request_id);
$$;

drop function if exists public.get_student_schedule_requests(uuid);

create or replace function public.get_student_schedule_requests(target_school_id uuid)
returns table (
  id uuid,
  school_id uuid,
  student_user_id uuid,
  requested_teacher_user_id uuid,
  teacher_name text,
  requested_slot_id uuid,
  requested_slot_group_id uuid,
  slot_name text,
  starts_at time without time zone,
  ends_at time without time zone,
  capacity integer,
  overflow_slot_id uuid,
  overflow_capacity integer,
  reservation_date date,
  exam_name text,
  exam_type text,
  status text,
  reviewer_message text,
  reviewed_at timestamptz,
  reservation_id uuid,
  expires_at timestamptz,
  created_at timestamptz,
  student_seen_at timestamptz
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

  perform private.expire_due_schedule_requests(target_school_id, caller_id);

  return query
  select
    sr.id,
    sr.school_id,
    sr.student_user_id,
    sr.requested_teacher_user_id,
    coalesce(tp.name, 'Professor') as teacher_name,
    sr.requested_slot_id,
    sr.requested_slot_group_id,
    ps.name as slot_name,
    ps.starts_at,
    ps.ends_at,
    ps.capacity,
    os.id as overflow_slot_id,
    os.capacity as overflow_capacity,
    sr.reservation_date,
    sr.exam_name,
    sr.exam_type::text,
    sr.status,
    sr.reviewer_message,
    sr.reviewed_at,
    sr.reservation_id,
    sr.expires_at,
    sr.created_at,
    sr.student_seen_at
  from public."ScheduleRequests" sr
  inner join public."ExamSlots" ps
    on ps.id = sr.requested_slot_group_id
  left join public."ExamSlots" os
    on os.primary_slot_id = ps.id
   and coalesce(os.slot_kind, 'primary') = 'overflow'
   and os.is_active = true
  left join public."Profiles" tp
    on tp.id = sr.requested_teacher_user_id
  where sr.school_id = target_school_id
    and sr.student_user_id = caller_id
    and not (
      sr.status in ('approved', 'declined')
      and sr.student_seen_at is not null
    )
  order by sr.created_at desc;
end;
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
  p_id uuid;
  p_name text;
  p_starts_at time;
  p_ends_at time;
  p_capacity integer;
  o_id uuid;
  o_name text;
  o_starts_at time;
  o_ends_at time;
  o_capacity integer;
  p_count integer;
  o_count integer;
  in_overflow boolean := false;
  inserted_id uuid;
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

  select es.id, es.name, es.starts_at, es.ends_at, es.capacity
  into p_id, p_name, p_starts_at, p_ends_at, p_capacity
  from public."ExamSlots" es
  where es.id = target_slot_id
    and es.school_id = target_school_id
    and es.is_active = true
    and es.slot_kind = 'primary';

  if p_id is null then
    raise exception 'Selected slot is unavailable.' using errcode = '22023';
  end if;

  select es.id, es.name, es.starts_at, es.ends_at, es.capacity
  into o_id, o_name, o_starts_at, o_ends_at, o_capacity
  from public."ExamSlots" es
  where es.primary_slot_id = p_id
    and es.is_active = true
    and es.slot_kind = 'overflow';

  perform pg_advisory_xact_lock(
    hashtext(target_school_id::text),
    hashtext(target_reservation_date::text || ':' || p_id::text)
  );

  if exists (
    select 1
    from public."Reservations" r
    where r.school_id = target_school_id
      and r.user_id = caller_id
      and r.reservation_date = target_reservation_date
      and r.status = 'confirmed'
      and (
        r.slot_id = p_id
        or (o_id is not null and r.slot_id = o_id)
      )
  ) then
    raise exception 'You already reserved this slot for that date.' using errcode = '23505';
  end if;

  perform private.assert_no_future_exam_duplicate(
    target_school_id,
    caller_id,
    target_exam_name,
    target_exam_type
  );

  select count(*)::integer
  into p_count
  from public."Reservations" r
  where r.school_id = target_school_id
    and r.slot_id = p_id
    and r.reservation_date = target_reservation_date
    and r.status = 'confirmed';

  if p_count < p_capacity then
    in_overflow := false;
  else
    if o_id is null then
      raise exception 'Selected slot is full.' using errcode = 'P0001';
    end if;

    perform pg_advisory_xact_lock(
      hashtext(target_school_id::text),
      hashtext(target_reservation_date::text || ':' || o_id::text)
    );

    select count(*)::integer
    into o_count
    from public."Reservations" r
    where r.school_id = target_school_id
      and r.slot_id = o_id
      and r.reservation_date = target_reservation_date
      and r.status = 'confirmed';

    if o_count >= o_capacity then
      raise exception 'Selected slot is full.' using errcode = 'P0001';
    end if;

    in_overflow := true;
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
    case when in_overflow then o_id else p_id end,
    target_reservation_date,
    trim(target_exam_name),
    target_exam_type::public.exam_type,
    'confirmed',
    caller_id,
    'student'::public.school_role
  )
  returning id into inserted_id;

  reservation_id := inserted_id;
  booked_slot_id := case when in_overflow then o_id else p_id end;
  booked_slot_kind := case when in_overflow then 'overflow' else 'primary' end;
  routed_to_overflow := in_overflow;
  slot_name := case when in_overflow then o_name else p_name end;
  starts_at := case when in_overflow then o_starts_at else p_starts_at end;
  ends_at := case when in_overflow then o_ends_at else p_ends_at end;
  capacity := case when in_overflow then o_capacity else p_capacity end;
  remaining := capacity - (case when in_overflow then o_count else p_count end) - 1;
  return next;
exception
  when unique_violation then
    if sqlerrm ilike '%future reservation for this exam and type%' then
      raise;
    end if;

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
  slot_group_id uuid;
  confirmed_count integer;
  inserted_id uuid;
begin
  if caller_id is null then
    raise exception 'Invalid session.' using errcode = 'P0001';
  end if;

  begin
    perform private.assert_school_role(target_school_id, 'admin'::public.school_role);
    caller_role := 'admin'::public.school_role;
  exception
    when insufficient_privilege then
      begin
        perform private.assert_school_role(target_school_id, 'professor'::public.school_role);
        caller_role := 'professor'::public.school_role;
      exception
        when insufficient_privilege then
          raise exception 'Only admins and professors can schedule exams for students.'
            using errcode = '42501';
      end;
  end;

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

  select
    es.capacity,
    case
      when coalesce(es.slot_kind, 'primary') = 'overflow' then es.primary_slot_id
      else es.id
    end
  into slot_capacity, slot_group_id
  from public."ExamSlots" es
  where es.id = target_slot_id
    and es.school_id = target_school_id
    and es.is_active = true;

  if slot_capacity is null or slot_group_id is null then
    raise exception 'Selected slot is unavailable.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(target_school_id::text),
    hashtext(target_reservation_date::text || ':' || slot_group_id::text)
  );

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
    target_school_id,
    target_student_user_id,
    target_exam_name,
    target_exam_type
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
    if sqlerrm ilike '%future reservation for this exam and type%' then
      raise;
    end if;

    raise exception 'This student already has this slot reserved for that date.' using errcode = '23505';
end;
$$;

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
  p_id uuid;
  p_name text;
  p_starts_at time without time zone;
  p_ends_at time without time zone;
  p_capacity integer;
  o_id uuid;
  o_name text;
  o_starts_at time without time zone;
  o_ends_at time without time zone;
  o_capacity integer;
  p_count integer;
  o_count integer;
  in_overflow boolean := false;
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

  begin
    perform private.assert_school_role(reservation_record.school_id, 'admin'::public.school_role);
  exception
    when insufficient_privilege then
      begin
        perform private.assert_school_role(reservation_record.school_id, 'professor'::public.school_role);
      exception
        when insufficient_privilege then
          raise exception 'Only admins and professors can update reservations.'
            using errcode = '42501';
      end;
  end;

  perform private.assert_valid_reservation_date(
    reservation_record.school_id,
    target_reservation_date
  );

  if target_exam_type not in ('midterm', 'final') then
    raise exception 'Invalid exam type.' using errcode = '22023';
  end if;

  if length(trim(coalesce(target_exam_name, ''))) = 0 then
    raise exception 'Exam name is required.' using errcode = '22023';
  end if;

  select es.id, es.name, es.starts_at, es.ends_at, es.capacity
  into p_id, p_name, p_starts_at, p_ends_at, p_capacity
  from public."ExamSlots" es
  where es.id = target_slot_id
    and es.school_id = reservation_record.school_id
    and es.is_active = true
    and es.slot_kind = 'primary';

  if p_id is null then
    raise exception 'Selected slot is unavailable.' using errcode = '22023';
  end if;

  select es.id, es.name, es.starts_at, es.ends_at, es.capacity
  into o_id, o_name, o_starts_at, o_ends_at, o_capacity
  from public."ExamSlots" es
  where es.primary_slot_id = p_id
    and es.school_id = reservation_record.school_id
    and es.is_active = true
    and es.slot_kind = 'overflow'
  limit 1;

  perform pg_advisory_xact_lock(
    hashtext(reservation_record.school_id::text),
    hashtext(target_reservation_date::text || ':' || p_id::text)
  );

  if exists (
    select 1
    from public."Reservations" r
    where r.id <> reservation_record.id
      and r.school_id = reservation_record.school_id
      and r.user_id = reservation_record.user_id
      and r.reservation_date = target_reservation_date
      and r.status = 'confirmed'
      and (
        r.slot_id = p_id
        or (o_id is not null and r.slot_id = o_id)
      )
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

  select count(*)::integer
  into p_count
  from public."Reservations" r
  where r.id <> reservation_record.id
    and r.school_id = reservation_record.school_id
    and r.slot_id = p_id
    and r.reservation_date = target_reservation_date
    and r.status = 'confirmed';

  if p_count < p_capacity then
    in_overflow := false;
  else
    if o_id is null then
      raise exception 'Selected slot is full.' using errcode = 'P0001';
    end if;

    perform pg_advisory_xact_lock(
      hashtext(reservation_record.school_id::text),
      hashtext(target_reservation_date::text || ':' || o_id::text)
    );

    select count(*)::integer
    into o_count
    from public."Reservations" r
    where r.id <> reservation_record.id
      and r.school_id = reservation_record.school_id
      and r.slot_id = o_id
      and r.reservation_date = target_reservation_date
      and r.status = 'confirmed';

    if o_count >= o_capacity then
      raise exception 'Selected slot is full.' using errcode = 'P0001';
    end if;

    in_overflow := true;
  end if;

  update public."Reservations" r
  set
    slot_id = case when in_overflow then o_id else p_id end,
    reservation_date = target_reservation_date,
    exam_name = trim(target_exam_name),
    exam_type = target_exam_type::public.exam_type
  where r.id = reservation_record.id
    and r.status = 'confirmed';

  if not found then
    raise exception 'Confirmed reservation not found.' using errcode = 'P0002';
  end if;

  reservation_id := reservation_record.id;
  booked_slot_id := case when in_overflow then o_id else p_id end;
  booked_slot_kind := case when in_overflow then 'overflow' else 'primary' end;
  routed_to_overflow := in_overflow;
  slot_name := case when in_overflow then o_name else p_name end;
  starts_at := case when in_overflow then o_starts_at else p_starts_at end;
  ends_at := case when in_overflow then o_ends_at else p_ends_at end;
  capacity := case when in_overflow then o_capacity else p_capacity end;
  remaining := capacity - (case when in_overflow then o_count else p_count end) - 1;

  return next;
exception
  when unique_violation then
    if sqlerrm ilike '%future reservation for this exam and type%' then
      raise;
    end if;

    raise exception 'Student already has a reservation for this slot on that date.' using errcode = '23505';
end;
$$;

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
  primary_slot public."ExamSlots"%rowtype;
  overflow_slot public."ExamSlots"%rowtype;
  booked_slot public."ExamSlots"%rowtype;
  primary_count integer;
  overflow_count integer;
  inserted_reservation_id uuid;
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

  begin
    perform private.assert_school_role(request_record.school_id, 'admin'::public.school_role);
    caller_role := 'admin'::public.school_role;
  exception
    when insufficient_privilege then
      begin
        perform private.assert_school_role(request_record.school_id, 'professor'::public.school_role);
        caller_role := 'professor'::public.school_role;
      exception
        when insufficient_privilege then
          raise exception 'Only admins and professors can review exam requests.'
            using errcode = '42501';
      end;
  end;

  if caller_role = 'professor'::public.school_role
    and request_record.requested_teacher_user_id <> caller_id then
    raise exception 'Professors can only review requests assigned to them.' using errcode = 'P0001';
  end if;

  if request_record.status <> 'pending' then
    update public."ScheduleRequests" sr
    set
      teacher_seen_at = coalesce(sr.teacher_seen_at, now()),
      teacher_seen_by = coalesce(sr.teacher_seen_by, caller_id)
    where sr.id = request_record.id;

    request_id := request_record.id;
    status := request_record.status;
    reservation_id := request_record.reservation_id;
    booked_slot_id := null;
    booked_slot_kind := null;
    remaining := null;
    return next;
    return;
  end if;

  if request_record.expires_at <= now() then
    update public."ScheduleRequests" sr
    set
      status = 'expired',
      reviewed_by = caller_id,
      reviewed_at = now(),
      reviewer_message = normalized_message,
      teacher_seen_at = coalesce(sr.teacher_seen_at, now()),
      teacher_seen_by = coalesce(sr.teacher_seen_by, caller_id)
    where sr.id = request_record.id;

    perform private.notify_user(
      request_record.student_user_id,
      request_record.school_id,
      request_record.id,
      null,
      'schedule_request_expired',
      'Exam request expired',
      request_record.exam_name || ' was not approved before the two-hour cutoff.',
      '/dashboard/schedule?schoolId=' || request_record.school_id::text || '&panel=reservations'
    );

    request_id := request_record.id;
    status := 'expired';
    reservation_id := null;
    booked_slot_id := null;
    booked_slot_kind := null;
    remaining := null;
    return next;
    return;
  end if;

  if target_decision not in ('approved', 'declined') then
    raise exception 'Invalid request decision.' using errcode = '22023';
  end if;

  if target_decision = 'declined' then
    update public."ScheduleRequests" sr
    set
      status = 'declined',
      reviewed_by = caller_id,
      reviewed_at = now(),
      reviewer_message = normalized_message,
      teacher_seen_at = coalesce(sr.teacher_seen_at, now()),
      teacher_seen_by = coalesce(sr.teacher_seen_by, caller_id)
    where sr.id = request_record.id;

    perform private.notify_user(
      request_record.student_user_id,
      request_record.school_id,
      request_record.id,
      null,
      'schedule_request_declined',
      'Exam request declined',
      coalesce(normalized_message, request_record.exam_name || ' was declined.'),
      '/dashboard/schedule?schoolId=' || request_record.school_id::text || '&panel=reservations'
    );

    request_id := request_record.id;
    status := 'declined';
    reservation_id := null;
    booked_slot_id := null;
    booked_slot_kind := null;
    remaining := null;
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
    update public."ScheduleRequests" sr
    set
      status = 'failed_conflict',
      reviewed_by = caller_id,
      reviewed_at = now(),
      reviewer_message = coalesce(normalized_message, 'The student is no longer a member of this school.'),
      teacher_seen_at = coalesce(sr.teacher_seen_at, now()),
      teacher_seen_by = coalesce(sr.teacher_seen_by, caller_id)
    where sr.id = request_record.id;

    request_id := request_record.id;
    status := 'failed_conflict';
    reservation_id := null;
    booked_slot_id := null;
    booked_slot_kind := null;
    remaining := null;
    return next;
    return;
  end if;

  select *
  into primary_slot
  from public."ExamSlots" es
  where es.id = request_record.requested_slot_group_id
    and es.school_id = request_record.school_id
    and es.is_active = true
    and coalesce(es.slot_kind, 'primary') = 'primary'
  for update;

  if primary_slot.id is null then
    update public."ScheduleRequests" sr
    set
      status = 'failed_capacity',
      reviewed_by = caller_id,
      reviewed_at = now(),
      reviewer_message = coalesce(normalized_message, 'The requested slot is no longer available.'),
      teacher_seen_at = coalesce(sr.teacher_seen_at, now()),
      teacher_seen_by = coalesce(sr.teacher_seen_by, caller_id)
    where sr.id = request_record.id;

    request_id := request_record.id;
    status := 'failed_capacity';
    reservation_id := null;
    booked_slot_id := null;
    booked_slot_kind := null;
    remaining := null;
    return next;
    return;
  end if;

  select *
  into overflow_slot
  from public."ExamSlots" es
  where es.school_id = request_record.school_id
    and es.primary_slot_id = primary_slot.id
    and coalesce(es.slot_kind, 'primary') = 'overflow'
    and es.is_active = true
  order by es.name asc, es.id asc
  limit 1
  for update;

  perform pg_advisory_xact_lock(
    hashtext(request_record.school_id::text),
    hashtext(request_record.reservation_date::text || ':' || primary_slot.id::text)
  );

  if exists (
    select 1
    from public."Reservations" r
    where r.school_id = request_record.school_id
      and r.user_id = request_record.student_user_id
      and r.reservation_date = request_record.reservation_date
      and r.status = 'confirmed'
      and (
        r.slot_id = primary_slot.id
        or (overflow_slot.id is not null and r.slot_id = overflow_slot.id)
      )
  ) then
    update public."ScheduleRequests" sr
    set
      status = 'failed_conflict',
      reviewed_by = caller_id,
      reviewed_at = now(),
      reviewer_message = coalesce(normalized_message, 'The student already has this time reserved.'),
      teacher_seen_at = coalesce(sr.teacher_seen_at, now()),
      teacher_seen_by = coalesce(sr.teacher_seen_by, caller_id)
    where sr.id = request_record.id;

    perform private.notify_user(
      request_record.student_user_id,
      request_record.school_id,
      request_record.id,
      null,
      'schedule_request_failed',
      'Exam request could not be approved',
      'You already have this time reserved.',
      '/dashboard/schedule?schoolId=' || request_record.school_id::text || '&panel=reservations'
    );

    request_id := request_record.id;
    status := 'failed_conflict';
    reservation_id := null;
    booked_slot_id := null;
    booked_slot_kind := null;
    remaining := null;
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
      update public."ScheduleRequests" sr
      set
        status = 'failed_conflict',
        reviewed_by = caller_id,
        reviewed_at = now(),
        reviewer_message = coalesce(
          normalized_message,
          'The student already has a future reservation for this exam and type.'
        ),
        teacher_seen_at = coalesce(sr.teacher_seen_at, now()),
        teacher_seen_by = coalesce(sr.teacher_seen_by, caller_id)
      where sr.id = request_record.id;

      perform private.notify_user(
        request_record.student_user_id,
        request_record.school_id,
        request_record.id,
        null,
        'schedule_request_failed',
        'Exam request could not be approved',
        'You already have a future reservation for this exam and type.',
        '/dashboard/schedule?schoolId=' || request_record.school_id::text || '&panel=reservations'
      );

      request_id := request_record.id;
      status := 'failed_conflict';
      reservation_id := null;
      booked_slot_id := null;
      booked_slot_kind := null;
      remaining := null;
      return next;
      return;
  end;

  select count(*)::integer
  into primary_count
  from public."Reservations" r
  where r.school_id = request_record.school_id
    and r.slot_id = primary_slot.id
    and r.reservation_date = request_record.reservation_date
    and r.status = 'confirmed';

  if primary_count < primary_slot.capacity then
    booked_slot := primary_slot;
    remaining := primary_slot.capacity - primary_count - 1;
  elsif overflow_slot.id is not null then
    select count(*)::integer
    into overflow_count
    from public."Reservations" r
    where r.school_id = request_record.school_id
      and r.slot_id = overflow_slot.id
      and r.reservation_date = request_record.reservation_date
      and r.status = 'confirmed';

    if overflow_count < overflow_slot.capacity then
      booked_slot := overflow_slot;
      remaining := overflow_slot.capacity - overflow_count - 1;
    end if;
  end if;

  if booked_slot.id is null then
    update public."ScheduleRequests" sr
    set
      status = 'failed_capacity',
      reviewed_by = caller_id,
      reviewed_at = now(),
      reviewer_message = coalesce(normalized_message, 'The requested slot filled before approval.'),
      teacher_seen_at = coalesce(sr.teacher_seen_at, now()),
      teacher_seen_by = coalesce(sr.teacher_seen_by, caller_id)
    where sr.id = request_record.id;

    perform private.notify_user(
      request_record.student_user_id,
      request_record.school_id,
      request_record.id,
      null,
      'schedule_request_failed',
      'Exam request could not be approved',
      'The requested slot filled before approval. Please request another time.',
      '/dashboard/schedule?schoolId=' || request_record.school_id::text || '&panel=reservations'
    );

    request_id := request_record.id;
    status := 'failed_capacity';
    reservation_id := null;
    booked_slot_id := null;
    booked_slot_kind := null;
    remaining := null;
    return next;
    return;
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
    request_record.school_id,
    request_record.student_user_id,
    booked_slot.id,
    request_record.reservation_date,
    request_record.exam_name,
    request_record.exam_type,
    'confirmed',
    caller_id,
    caller_role
  )
  returning id into inserted_reservation_id;

  update public."ScheduleRequests" sr
  set
    status = 'approved',
    reviewed_by = caller_id,
    reviewed_at = now(),
    reviewer_message = normalized_message,
    reservation_id = inserted_reservation_id,
    teacher_seen_at = coalesce(sr.teacher_seen_at, now()),
    teacher_seen_by = coalesce(sr.teacher_seen_by, caller_id)
  where sr.id = request_record.id;

  perform private.notify_user(
    request_record.student_user_id,
    request_record.school_id,
    request_record.id,
    inserted_reservation_id,
    'schedule_request_approved',
    'Exam request approved',
    coalesce(normalized_message, request_record.exam_name || ' was approved.'),
    '/dashboard/schedule?schoolId=' || request_record.school_id::text || '&panel=reservations'
  );

  request_id := request_record.id;
  status := 'approved';
  reservation_id := inserted_reservation_id;
  booked_slot_id := booked_slot.id;
  booked_slot_kind := coalesce(booked_slot.slot_kind, 'primary');
  return next;
exception
  when unique_violation then
    update public."ScheduleRequests" sr
    set
      status = 'failed_conflict',
      reviewed_by = caller_id,
      reviewed_at = now(),
      reviewer_message = coalesce(normalized_message, 'The student already has a conflicting reservation.'),
      teacher_seen_at = coalesce(sr.teacher_seen_at, now()),
      teacher_seen_by = coalesce(sr.teacher_seen_by, caller_id)
    where sr.id = target_request_id;

    request_id := target_request_id;
    status := 'failed_conflict';
    reservation_id := null;
    booked_slot_id := null;
    booked_slot_kind := null;
    remaining := null;
    return next;
end;
$$;

revoke execute on function public.mark_schedule_request_seen(uuid) from public;
revoke execute on function public.mark_schedule_request_seen(uuid) from anon;
grant execute on function public.mark_schedule_request_seen(uuid) to authenticated;

revoke execute on function public.mark_schedule_request_teacher_seen(uuid) from public;
revoke execute on function public.mark_schedule_request_teacher_seen(uuid) from anon;
grant execute on function public.mark_schedule_request_teacher_seen(uuid) to authenticated;

revoke execute on function public.get_student_schedule_requests(uuid) from public;
revoke execute on function public.get_student_schedule_requests(uuid) from anon;
grant execute on function public.get_student_schedule_requests(uuid) to authenticated;
