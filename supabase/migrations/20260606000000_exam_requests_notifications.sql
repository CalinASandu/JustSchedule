alter table public."ExamSlots"
add column if not exists slot_kind text not null default 'primary',
add column if not exists primary_slot_id uuid references public."ExamSlots"(id);

create table if not exists public."ScheduleRequests" (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public."Schools"(id) on delete cascade,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  requested_teacher_user_id uuid not null references auth.users(id) on delete cascade,
  requested_slot_id uuid not null references public."ExamSlots"(id) on delete restrict,
  requested_slot_group_id uuid not null references public."ExamSlots"(id) on delete restrict,
  reservation_date date not null,
  exam_name text not null,
  exam_type public.exam_type not null,
  status text not null default 'pending',
  reviewer_message text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  reservation_id uuid references public."Reservations"(id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_requests_status_check check (
    status in (
      'pending',
      'approved',
      'declined',
      'expired',
      'failed_capacity',
      'failed_conflict',
      'cancelled'
    )
  ),
  constraint schedule_requests_exam_name_check check (length(btrim(exam_name)) > 0)
);

alter table public."ScheduleRequests" enable row level security;

create unique index if not exists schedule_requests_one_pending_pair_idx
on public."ScheduleRequests" (
  school_id,
  student_user_id,
  reservation_date,
  requested_slot_group_id
)
where status = 'pending';

create index if not exists schedule_requests_school_status_idx
on public."ScheduleRequests" (school_id, status, reservation_date, created_at);

create index if not exists schedule_requests_teacher_status_idx
on public."ScheduleRequests" (requested_teacher_user_id, status, reservation_date, created_at);

create index if not exists schedule_requests_student_status_idx
on public."ScheduleRequests" (student_user_id, status, reservation_date, created_at);

create index if not exists schedule_requests_expiry_idx
on public."ScheduleRequests" (expires_at)
where status = 'pending';

create table if not exists public."UserNotifications" (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  school_id uuid references public."Schools"(id) on delete cascade,
  schedule_request_id uuid references public."ScheduleRequests"(id) on delete cascade,
  reservation_id uuid references public."Reservations"(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public."UserNotifications" enable row level security;

create index if not exists user_notifications_recipient_read_idx
on public."UserNotifications" (recipient_user_id, read_at, created_at desc);

create unique index if not exists user_notifications_request_event_unique
on public."UserNotifications" (recipient_user_id, schedule_request_id, type)
where schedule_request_id is not null;

create or replace function private.touch_schedule_requests_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists schedule_requests_touch_updated_at on public."ScheduleRequests";
create trigger schedule_requests_touch_updated_at
before update on public."ScheduleRequests"
for each row
execute function private.touch_schedule_requests_updated_at();

create or replace function private.school_request_role(target_school_id uuid)
returns public.school_role
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  caller_role public.school_role;
begin
  if caller_id is null then
    return null;
  end if;

  select sm.role
  into caller_role
  from public."SchoolMembers" sm
  inner join public."Schools" s
    on s.id = sm.school_id
  where sm.school_id = target_school_id
    and sm.user_id = caller_id
    and s.deleted_at is null
  limit 1;

  if caller_role is null and exists (
    select 1
    from public."Schools" s
    where s.id = target_school_id
      and s.created_by = caller_id
      and s.deleted_at is null
  ) then
    caller_role := 'admin'::public.school_role;
  end if;

  return caller_role;
end;
$$;

create or replace function private.notify_user(
  target_recipient_user_id uuid,
  target_school_id uuid,
  target_schedule_request_id uuid,
  target_reservation_id uuid,
  notification_type text,
  notification_title text,
  notification_body text,
  notification_href text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public."UserNotifications" (
    recipient_user_id,
    school_id,
    schedule_request_id,
    reservation_id,
    type,
    title,
    body,
    href
  )
  values (
    target_recipient_user_id,
    target_school_id,
    target_schedule_request_id,
    target_reservation_id,
    notification_type,
    notification_title,
    notification_body,
    notification_href
  )
  on conflict do nothing;
end;
$$;

create or replace function private.expire_due_schedule_requests(
  target_school_id uuid default null,
  target_student_user_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  expired_count integer;
  expired_request record;
begin
  for expired_request in
    update public."ScheduleRequests" sr
    set
      status = 'expired',
      reviewed_at = coalesce(sr.reviewed_at, now())
    where sr.status = 'pending'
      and sr.expires_at <= now()
      and (target_school_id is null or sr.school_id = target_school_id)
      and (target_student_user_id is null or sr.student_user_id = target_student_user_id)
    returning sr.id, sr.school_id, sr.student_user_id, sr.exam_name
  loop
    perform private.notify_user(
      expired_request.student_user_id,
      expired_request.school_id,
      expired_request.id,
      null,
      'schedule_request_expired',
      'Exam request expired',
      expired_request.exam_name || ' was not approved before the two-hour cutoff.',
      '/dashboard/schedule?schoolId=' || expired_request.school_id::text || '&panel=reservations'
    );
  end loop;

  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

drop policy if exists "Schedule request participants can view requests" on public."ScheduleRequests";
create policy "Schedule request participants can view requests"
on public."ScheduleRequests"
for select
to authenticated
using (
  student_user_id = auth.uid()
  or requested_teacher_user_id = auth.uid()
  or private.school_request_role(school_id) = 'admin'::public.school_role
);

drop policy if exists "Notification recipients can view notifications" on public."UserNotifications";
create policy "Notification recipients can view notifications"
on public."UserNotifications"
for select
to authenticated
using (recipient_user_id = auth.uid());

drop policy if exists "Notification recipients can update read state" on public."UserNotifications";
create policy "Notification recipients can update read state"
on public."UserNotifications"
for update
to authenticated
using (recipient_user_id = auth.uid())
with check (recipient_user_id = auth.uid());

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
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  student_can_self_book boolean;
  selected_slot public."ExamSlots"%rowtype;
  primary_slot public."ExamSlots"%rowtype;
  school_timezone text;
  request_expires_at timestamptz;
  inserted_id uuid;
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

  if target_exam_type not in ('midterm', 'final') then
    raise exception 'Invalid exam type.' using errcode = '22023';
  end if;

  if length(btrim(coalesce(target_exam_name, ''))) = 0 then
    raise exception 'Exam name is required.' using errcode = '22023';
  end if;

  if target_reservation_date < current_date
    or target_reservation_date > current_date + 14 then
    raise exception 'Reservation date must be within the next 14 days.' using errcode = '22023';
  end if;

  if extract(isodow from target_reservation_date) in (6, 7) then
    raise exception 'Weekend reservations are unavailable.' using errcode = '22023';
  end if;

  select *
  into selected_slot
  from public."ExamSlots" es
  where es.id = target_slot_id
    and es.school_id = target_school_id
    and es.is_active = true;

  if selected_slot.id is null then
    raise exception 'Selected slot is unavailable.' using errcode = '22023';
  end if;

  if coalesce(selected_slot.slot_kind, 'primary') = 'overflow' then
    select *
    into primary_slot
    from public."ExamSlots" es
    where es.id = selected_slot.primary_slot_id
      and es.school_id = target_school_id
      and es.is_active = true
      and coalesce(es.slot_kind, 'primary') = 'primary';
  else
    primary_slot := selected_slot;
  end if;

  if primary_slot.id is null then
    raise exception 'Selected primary slot is unavailable.' using errcode = '22023';
  end if;

  select coalesce(s.timezone, 'Europe/Bucharest')
  into school_timezone
  from public."Schools" s
  where s.id = target_school_id
    and s.deleted_at is null;

  request_expires_at := ((target_reservation_date + primary_slot.starts_at)
    at time zone coalesce(school_timezone, 'Europe/Bucharest'))
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
  returning id into inserted_id;

  perform private.notify_user(
    target_teacher_user_id,
    target_school_id,
    inserted_id,
    null,
    'schedule_request_created',
    'New exam request',
    'A student requested approval for ' || btrim(target_exam_name) || '.',
    '/dashboard/schools/' || target_school_id::text || '?tab=examRequests'
  );

  request_id := inserted_id;
  status := 'pending';
  expires_at := request_expires_at;
  return next;
exception
  when unique_violation then
    raise exception 'You already have a pending request for this slot and date.' using errcode = '23505';
end;
$$;

create or replace function public.create_schedule_request(
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
  expires_at timestamptz
)
language sql
set search_path = public, private, pg_temp
as $$
  select *
  from private.create_schedule_request(
    target_school_id,
    target_teacher_user_id,
    target_slot_id,
    target_reservation_date,
    target_exam_name,
    target_exam_type
  );
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

  caller_role := private.school_request_role(request_record.school_id);

  if caller_role = 'professor'::public.school_role
    and request_record.requested_teacher_user_id <> caller_id then
    raise exception 'Professors can only review requests assigned to them.' using errcode = 'P0001';
  end if;

  if caller_role <> 'admin'::public.school_role
    and caller_role <> 'professor'::public.school_role then
    raise exception 'Only admins and professors can review exam requests.' using errcode = 'P0001';
  end if;

  if request_record.status <> 'pending' then
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
      reviewer_message = normalized_message
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
      reviewer_message = normalized_message
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
    update public."ScheduleRequests"
    set
      status = 'failed_conflict',
      reviewed_by = caller_id,
      reviewed_at = now(),
      reviewer_message = coalesce(normalized_message, 'The student is no longer a member of this school.')
    where id = request_record.id;

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
    update public."ScheduleRequests"
    set
      status = 'failed_capacity',
      reviewed_by = caller_id,
      reviewed_at = now(),
      reviewer_message = coalesce(normalized_message, 'The requested slot is no longer available.')
    where id = request_record.id;

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
    update public."ScheduleRequests"
    set
      status = 'failed_conflict',
      reviewed_by = caller_id,
      reviewed_at = now(),
      reviewer_message = coalesce(normalized_message, 'The student already has this time reserved.')
    where id = request_record.id;

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
    update public."ScheduleRequests"
    set
      status = 'failed_capacity',
      reviewed_by = caller_id,
      reviewed_at = now(),
      reviewer_message = coalesce(normalized_message, 'The requested slot filled before approval.')
    where id = request_record.id;

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
    reservation_id = inserted_reservation_id
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
    update public."ScheduleRequests"
    set
      status = 'failed_conflict',
      reviewed_by = caller_id,
      reviewed_at = now(),
      reviewer_message = coalesce(normalized_message, 'The student already has this slot reserved.')
    where id = target_request_id;

    request_id := target_request_id;
    status := 'failed_conflict';
    reservation_id := null;
    booked_slot_id := null;
    booked_slot_kind := null;
    remaining := null;
    return next;
end;
$$;

create or replace function public.review_schedule_request(
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
language sql
set search_path = public, private, pg_temp
as $$
  select *
  from private.review_schedule_request(
    target_request_id,
    target_decision,
    target_reviewer_message
  );
$$;

create or replace function private.cancel_schedule_request(target_request_id uuid)
returns table (
  request_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  request_record public."ScheduleRequests"%rowtype;
begin
  if caller_id is null then
    raise exception 'Invalid session.' using errcode = '28000';
  end if;

  select *
  into request_record
  from public."ScheduleRequests" sr
  where sr.id = target_request_id
    and sr.student_user_id = caller_id
  for update;

  if request_record.id is null then
    raise exception 'Schedule request is unavailable.' using errcode = 'P0002';
  end if;

  if request_record.status <> 'pending' then
    request_id := request_record.id;
    status := request_record.status;
    return next;
    return;
  end if;

  if request_record.expires_at <= now() then
    update public."ScheduleRequests"
    set status = 'expired', reviewed_at = now()
    where id = request_record.id;

    request_id := request_record.id;
    status := 'expired';
    return next;
    return;
  end if;

  update public."ScheduleRequests"
  set status = 'cancelled'
  where id = request_record.id;

  perform private.notify_user(
    request_record.requested_teacher_user_id,
    request_record.school_id,
    request_record.id,
    null,
    'schedule_request_cancelled',
    'Exam request cancelled',
    'A student cancelled an exam request.',
    '/dashboard/schools/' || request_record.school_id::text || '?tab=examRequests'
  );

  request_id := request_record.id;
  status := 'cancelled';
  return next;
end;
$$;

create or replace function public.cancel_schedule_request(target_request_id uuid)
returns table (
  request_id uuid,
  status text
)
language sql
set search_path = public, private, pg_temp
as $$
  select *
  from private.cancel_schedule_request(target_request_id);
$$;

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
  created_at timestamptz
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
    sr.created_at
  from public."ScheduleRequests" sr
  inner join public."ExamSlots" ps
    on ps.id = sr.requested_slot_group_id
  left join public."ExamSlots" os
    on os.primary_slot_id = ps.id
   and coalesce(os.slot_kind, 'primary') = 'overflow'
  left join public."Profiles" tp
    on tp.id = sr.requested_teacher_user_id
  where sr.school_id = target_school_id
    and sr.student_user_id = caller_id
  order by sr.created_at desc;
end;
$$;

create or replace function public.get_school_request_teachers(target_school_id uuid)
returns table (
  user_id uuid,
  name text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  student_can_self_book boolean;
begin
  if caller_id is null then
    raise exception 'Invalid session.' using errcode = '28000';
  end if;

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
    raise exception 'Only student members can view request teachers.' using errcode = 'P0001';
  end if;

  if student_can_self_book = true then
    return;
  end if;

  return query
  select
    sm.user_id,
    coalesce(p.name, 'Professor') as name
  from public."SchoolMembers" sm
  left join public."Profiles" p
    on p.id = sm.user_id
  where sm.school_id = target_school_id
    and sm.role = 'professor'::public.school_role
  order by coalesce(p.name, 'Professor') asc;
end;
$$;

create or replace function public.get_school_schedule_requests(target_school_id uuid)
returns table (
  id uuid,
  school_id uuid,
  student_user_id uuid,
  student_name text,
  student_email text,
  requested_teacher_user_id uuid,
  teacher_name text,
  requested_slot_id uuid,
  requested_slot_group_id uuid,
  slot_name text,
  starts_at time without time zone,
  ends_at time without time zone,
  capacity integer,
  primary_booked integer,
  overflow_slot_id uuid,
  overflow_capacity integer,
  overflow_booked integer,
  reservation_date date,
  exam_name text,
  exam_type text,
  status text,
  reviewer_message text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  reservation_id uuid,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  caller_role public.school_role;
begin
  if caller_id is null then
    raise exception 'Invalid session.' using errcode = '28000';
  end if;

  caller_role := private.school_request_role(target_school_id);

  if caller_role <> 'admin'::public.school_role
    and caller_role <> 'professor'::public.school_role then
    raise exception 'Only admins and professors can view exam requests.' using errcode = 'P0001';
  end if;

  perform private.expire_due_schedule_requests(target_school_id, null);

  return query
  select
    sr.id,
    sr.school_id,
    sr.student_user_id,
    coalesce(sp.name, 'Unnamed student') as student_name,
    su.email::text as student_email,
    sr.requested_teacher_user_id,
    coalesce(tp.name, 'Professor') as teacher_name,
    sr.requested_slot_id,
    sr.requested_slot_group_id,
    ps.name as slot_name,
    ps.starts_at,
    ps.ends_at,
    ps.capacity,
    (
      select count(*)::integer
      from public."Reservations" r
      where r.school_id = sr.school_id
        and r.slot_id = ps.id
        and r.reservation_date = sr.reservation_date
        and r.status = 'confirmed'
    ) as primary_booked,
    os.id as overflow_slot_id,
    os.capacity as overflow_capacity,
    (
      select count(*)::integer
      from public."Reservations" r
      where r.school_id = sr.school_id
        and r.slot_id = os.id
        and r.reservation_date = sr.reservation_date
        and r.status = 'confirmed'
    ) as overflow_booked,
    sr.reservation_date,
    sr.exam_name,
    sr.exam_type::text,
    sr.status,
    sr.reviewer_message,
    sr.reviewed_by,
    sr.reviewed_at,
    sr.reservation_id,
    sr.expires_at,
    sr.created_at
  from public."ScheduleRequests" sr
  inner join public."ExamSlots" ps
    on ps.id = sr.requested_slot_group_id
  left join public."ExamSlots" os
    on os.primary_slot_id = ps.id
   and coalesce(os.slot_kind, 'primary') = 'overflow'
  left join public."Profiles" sp
    on sp.id = sr.student_user_id
  left join auth.users su
    on su.id = sr.student_user_id
  left join public."Profiles" tp
    on tp.id = sr.requested_teacher_user_id
  where sr.school_id = target_school_id
    and (
      caller_role = 'admin'::public.school_role
      or sr.requested_teacher_user_id = caller_id
    )
  order by
    case when sr.status = 'pending' then 0 else 1 end,
    sr.reservation_date asc,
    sr.created_at asc;
end;
$$;

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
    and (target_school_id is null or un.school_id = target_school_id)
  order by un.created_at desc
  limit 50;
$$;

create or replace function public.mark_user_notifications_read(target_notification_ids uuid[] default null)
returns integer
language plpgsql
set search_path = public, pg_temp
as $$
declare
  updated_count integer;
begin
  update public."UserNotifications" un
  set read_at = coalesce(un.read_at, now())
  where un.recipient_user_id = auth.uid()
    and (target_notification_ids is null or un.id = any(target_notification_ids));

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke execute on function public.create_schedule_request(uuid, uuid, uuid, date, text, text) from public;
revoke execute on function public.create_schedule_request(uuid, uuid, uuid, date, text, text) from anon;
grant execute on function public.create_schedule_request(uuid, uuid, uuid, date, text, text) to authenticated;

revoke execute on function public.review_schedule_request(uuid, text, text) from public;
revoke execute on function public.review_schedule_request(uuid, text, text) from anon;
grant execute on function public.review_schedule_request(uuid, text, text) to authenticated;

revoke execute on function public.cancel_schedule_request(uuid) from public;
revoke execute on function public.cancel_schedule_request(uuid) from anon;
grant execute on function public.cancel_schedule_request(uuid) to authenticated;

revoke execute on function public.get_student_schedule_requests(uuid) from public;
revoke execute on function public.get_student_schedule_requests(uuid) from anon;
grant execute on function public.get_student_schedule_requests(uuid) to authenticated;

revoke execute on function public.get_school_request_teachers(uuid) from public;
revoke execute on function public.get_school_request_teachers(uuid) from anon;
grant execute on function public.get_school_request_teachers(uuid) to authenticated;

revoke execute on function public.get_school_schedule_requests(uuid) from public;
revoke execute on function public.get_school_schedule_requests(uuid) from anon;
grant execute on function public.get_school_schedule_requests(uuid) to authenticated;

revoke execute on function public.get_user_notifications(uuid) from public;
revoke execute on function public.get_user_notifications(uuid) from anon;
grant execute on function public.get_user_notifications(uuid) to authenticated;

revoke execute on function public.mark_user_notifications_read(uuid[]) from public;
revoke execute on function public.mark_user_notifications_read(uuid[]) from anon;
grant execute on function public.mark_user_notifications_read(uuid[]) to authenticated;
