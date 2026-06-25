create or replace function private.assert_school_subject_name(
  target_school_id uuid,
  target_exam_name text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_exam_name text := lower(btrim(coalesce(target_exam_name, '')));
begin
  if length(normalized_exam_name) = 0 then
    raise exception 'Exam name is required.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public."SchoolSubjects" ss
    where ss.school_id = target_school_id
      and ss.deleted_at is null
      and lower(btrim(ss.name)) = normalized_exam_name
  ) then
    raise exception 'Exam name must match an active school subject.' using errcode = '22023';
  end if;
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
set search_path = public, private, pg_temp
as $$
begin
  perform private.assert_school_subject_name(target_school_id, target_exam_name);

  return query
  select *
  from private.reserve_exam_slot(
    target_school_id,
    target_slot_id,
    target_reservation_date,
    target_exam_name,
    target_exam_type
  );
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
language plpgsql
set search_path = public, private, pg_temp
as $$
begin
  perform private.assert_school_subject_name(target_school_id, target_exam_name);

  return query
  select *
  from private.schedule_exam_for_student(
    target_school_id,
    target_student_user_id,
    target_slot_id,
    target_reservation_date,
    target_exam_name,
    target_exam_type
  );
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
language plpgsql
set search_path = public, private, pg_temp
as $$
begin
  perform private.assert_school_subject_name(target_school_id, target_exam_name);

  return query
  select *
  from private.create_schedule_request(
    target_school_id,
    target_teacher_user_id,
    target_slot_id,
    target_reservation_date,
    target_exam_name,
    target_exam_type
  );
end;
$$;

create or replace function public.update_reservation(
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
set search_path = public, private, pg_temp
as $$
declare
  target_school_id uuid;
begin
  select r.school_id
  into target_school_id
  from public."Reservations" r
  where r.id = target_reservation_id;

  if target_school_id is not null then
    perform private.assert_school_subject_name(target_school_id, target_exam_name);
  end if;

  return query
  select *
  from private.update_reservation(
    target_reservation_id,
    target_slot_id,
    target_reservation_date,
    target_exam_name,
    target_exam_type
  );
end;
$$;
