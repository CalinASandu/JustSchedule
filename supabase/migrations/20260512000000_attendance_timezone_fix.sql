-- Add timezone to Schools so slot times can be correctly interpreted.
-- Slot starts_at/ends_at are stored as local wall-clock time (time without time zone).
-- Without a school timezone the RPC was treating them as UTC, making the attendance
-- window 3 hours off for Romanian schools (UTC+3 in summer).
ALTER TABLE public."Schools"
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/Bucharest';

-- Re-create the attendance RPC using the school's timezone when constructing
-- the exam start timestamp, so the UTC comparison matches local wall-clock time.
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
  school_timezone text;
  exam_start_at timestamptz;
  attendance_close_at timestamptz;
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

  select coalesce(s.timezone, 'Europe/Bucharest')
  into school_timezone
  from public."Schools" s
  where s.id = reservation_record.school_id;

  -- Interpret local slot time in the school's timezone to get UTC-comparable instant.
  exam_start_at := (reservation_record.reservation_date + slot_record.starts_at)
                     at time zone school_timezone;
  attendance_close_at := exam_start_at + interval '25 minutes';

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

  if now() > attendance_close_at and not session_exists then
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
