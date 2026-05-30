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
  slot_starts_at time without time zone;
  school_timezone text;
  exam_start_utc timestamptz;
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

  -- Student cancelling their own reservation
  if reservation_record.user_id = caller_id then
    -- Enforce 2-hour cutoff before exam start
    select es.starts_at, coalesce(sc.timezone, 'Europe/Bucharest')
    into slot_starts_at, school_timezone
    from public."ExamSlots" es
    inner join public."Schools" sc on sc.id = reservation_record.school_id
    where es.id = reservation_record.slot_id;

    exam_start_utc := (reservation_record.reservation_date + slot_starts_at)
      at time zone school_timezone;

    if exam_start_utc - now() < interval '2 hours' then
      raise exception 'Reservations cannot be cancelled within 2 hours of the exam start time.'
        using errcode = 'P0001';
    end if;

    update public."Reservations"
    set status = 'cancelled'
    where id = reservation_record.id;

    return query select reservation_record.id;
    return;
  end if;

  -- Admin/professor cancelling on behalf of a student — no time restriction
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
