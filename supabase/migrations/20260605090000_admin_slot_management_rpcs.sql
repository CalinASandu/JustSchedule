create or replace function public.create_exam_slot(
  target_school_id uuid,
  slot_name text,
  slot_starts_at time without time zone,
  slot_ends_at time without time zone,
  slot_capacity integer
)
returns table (
  slot_id uuid,
  name text,
  starts_at time without time zone,
  ends_at time without time zone,
  capacity integer,
  is_active boolean,
  slot_kind text,
  primary_slot_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_name text := nullif(btrim(slot_name), '');
  inserted public."ExamSlots"%rowtype;
begin
  perform private.assert_school_role(target_school_id, 'admin'::public.school_role);

  if normalized_name is null then
    raise exception 'Slot name is required.' using errcode = '22023';
  end if;

  if slot_capacity is null or slot_capacity < 1 then
    raise exception 'Capacity must be at least 1.' using errcode = '22023';
  end if;

  if slot_starts_at is null or slot_ends_at is null or slot_ends_at <= slot_starts_at then
    raise exception 'Slot end time must be after the start time.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public."ExamSlots" es
    where es.school_id = target_school_id
      and es.slot_kind = 'primary'
      and es.starts_at = slot_starts_at
      and es.ends_at = slot_ends_at
  ) then
    raise exception 'An exam slot with this time already exists.' using errcode = '23505';
  end if;

  insert into public."ExamSlots" (
    school_id,
    name,
    starts_at,
    ends_at,
    capacity,
    is_active,
    slot_kind,
    primary_slot_id
  )
  values (
    target_school_id,
    normalized_name,
    slot_starts_at,
    slot_ends_at,
    slot_capacity,
    true,
    'primary',
    null
  )
  returning * into inserted;

  return query
  select
    es.id,
    es.name,
    es.starts_at,
    es.ends_at,
    es.capacity,
    es.is_active,
    es.slot_kind,
    es.primary_slot_id
  from public."ExamSlots" es
  where es.id = inserted.id;
exception
  when unique_violation then
    raise exception 'An exam room with these details already exists.' using errcode = '23505';
end;
$$;

create or replace function public.create_overflow_exam_slot(
  target_primary_slot_id uuid,
  slot_capacity integer
)
returns table (
  slot_id uuid,
  name text,
  starts_at time without time zone,
  ends_at time without time zone,
  capacity integer,
  is_active boolean,
  slot_kind text,
  primary_slot_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  primary_slot public."ExamSlots"%rowtype;
  inserted public."ExamSlots"%rowtype;
begin
  select *
  into primary_slot
  from public."ExamSlots" es
  where es.id = target_primary_slot_id
    and es.slot_kind = 'primary'
  for update;

  if primary_slot.id is null then
    raise exception 'Primary exam slot is unavailable.' using errcode = '22023';
  end if;

  perform private.assert_school_role(primary_slot.school_id, 'admin'::public.school_role);

  if slot_capacity is null or slot_capacity < 1 then
    raise exception 'Capacity must be at least 1.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public."ExamSlots" es
    where es.primary_slot_id = primary_slot.id
      and es.slot_kind = 'overflow'
  ) then
    raise exception 'This primary slot already has an overflow room.' using errcode = '23505';
  end if;

  insert into public."ExamSlots" (
    school_id,
    name,
    starts_at,
    ends_at,
    capacity,
    is_active,
    slot_kind,
    primary_slot_id
  )
  values (
    primary_slot.school_id,
    primary_slot.name || ' (overflow)',
    primary_slot.starts_at,
    primary_slot.ends_at,
    slot_capacity,
    false,
    'overflow',
    primary_slot.id
  )
  returning * into inserted;

  return query
  select
    es.id,
    es.name,
    es.starts_at,
    es.ends_at,
    es.capacity,
    es.is_active,
    es.slot_kind,
    es.primary_slot_id
  from public."ExamSlots" es
  where es.id = inserted.id;
exception
  when unique_violation then
    raise exception 'This primary slot already has an overflow room.' using errcode = '23505';
end;
$$;

create or replace function public.update_exam_slot(
  target_slot_id uuid,
  slot_name text default null,
  slot_starts_at time without time zone default null,
  slot_ends_at time without time zone default null,
  slot_capacity integer default null,
  target_is_active boolean default null
)
returns table (
  slot_id uuid,
  name text,
  starts_at time without time zone,
  ends_at time without time zone,
  capacity integer,
  is_active boolean,
  slot_kind text,
  primary_slot_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing_slot public."ExamSlots"%rowtype;
  parent_slot public."ExamSlots"%rowtype;
  normalized_name text;
  normalized_starts_at time without time zone;
  normalized_ends_at time without time zone;
  normalized_capacity integer;
  old_overflow_name text;
begin
  select *
  into existing_slot
  from public."ExamSlots" es
  where es.id = target_slot_id
  for update;

  if existing_slot.id is null then
    raise exception 'Exam slot is unavailable.' using errcode = '22023';
  end if;

  perform private.assert_school_role(existing_slot.school_id, 'admin'::public.school_role);

  normalized_name := coalesce(nullif(btrim(slot_name), ''), existing_slot.name);
  normalized_starts_at := coalesce(slot_starts_at, existing_slot.starts_at);
  normalized_ends_at := coalesce(slot_ends_at, existing_slot.ends_at);
  normalized_capacity := coalesce(slot_capacity, existing_slot.capacity);

  if normalized_name is null then
    raise exception 'Slot name is required.' using errcode = '22023';
  end if;

  if normalized_capacity is null or normalized_capacity < 1 then
    raise exception 'Capacity must be at least 1.' using errcode = '22023';
  end if;

  if existing_slot.slot_kind = 'overflow' then
    select *
    into parent_slot
    from public."ExamSlots" es
    where es.id = existing_slot.primary_slot_id
      and es.slot_kind = 'primary';

    if parent_slot.id is null then
      raise exception 'Primary exam slot is unavailable.' using errcode = '22023';
    end if;

    normalized_starts_at := parent_slot.starts_at;
    normalized_ends_at := parent_slot.ends_at;

    if target_is_active = true and parent_slot.is_active = false then
      raise exception 'Enable the primary slot before enabling its overflow room.' using errcode = '22023';
    end if;
  else
    if normalized_starts_at is null or normalized_ends_at is null or normalized_ends_at <= normalized_starts_at then
      raise exception 'Slot end time must be after the start time.' using errcode = '22023';
    end if;

    if exists (
      select 1
      from public."ExamSlots" es
      where es.school_id = existing_slot.school_id
        and es.id <> existing_slot.id
        and es.slot_kind = 'primary'
        and es.starts_at = normalized_starts_at
        and es.ends_at = normalized_ends_at
    ) then
      raise exception 'An exam slot with this time already exists.' using errcode = '23505';
    end if;
  end if;

  old_overflow_name := existing_slot.name || ' (overflow)';

  update public."ExamSlots" es
  set
    name = normalized_name,
    starts_at = normalized_starts_at,
    ends_at = normalized_ends_at,
    capacity = normalized_capacity,
    is_active = coalesce(target_is_active, es.is_active)
  where es.id = existing_slot.id;

  if existing_slot.slot_kind = 'primary' then
    update public."ExamSlots" es
    set
      starts_at = normalized_starts_at,
      ends_at = normalized_ends_at,
      name = case
        when es.name = old_overflow_name then normalized_name || ' (overflow)'
        else es.name
      end,
      is_active = case
        when target_is_active = false then false
        else es.is_active
      end
    where es.primary_slot_id = existing_slot.id
      and es.slot_kind = 'overflow';
  end if;

  return query
  select
    es.id,
    es.name,
    es.starts_at,
    es.ends_at,
    es.capacity,
    es.is_active,
    es.slot_kind,
    es.primary_slot_id
  from public."ExamSlots" es
  where es.id = existing_slot.id
     or es.primary_slot_id = existing_slot.id
  order by es.slot_kind desc, es.name;
exception
  when unique_violation then
    raise exception 'An exam room with these details already exists.' using errcode = '23505';
end;
$$;

revoke execute on function public.create_exam_slot(uuid, text, time without time zone, time without time zone, integer) from public;
revoke execute on function public.create_exam_slot(uuid, text, time without time zone, time without time zone, integer) from anon;
grant execute on function public.create_exam_slot(uuid, text, time without time zone, time without time zone, integer) to authenticated;

revoke execute on function public.create_overflow_exam_slot(uuid, integer) from public;
revoke execute on function public.create_overflow_exam_slot(uuid, integer) from anon;
grant execute on function public.create_overflow_exam_slot(uuid, integer) to authenticated;

revoke execute on function public.update_exam_slot(uuid, text, time without time zone, time without time zone, integer, boolean) from public;
revoke execute on function public.update_exam_slot(uuid, text, time without time zone, time without time zone, integer, boolean) from anon;
grant execute on function public.update_exam_slot(uuid, text, time without time zone, time without time zone, integer, boolean) to authenticated;
