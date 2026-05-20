alter table public."Reservations"
drop constraint if exists reservations_user_slot_date_unique;

create unique index if not exists reservations_user_slot_date_confirmed_unique
on public."Reservations" (user_id, slot_id, reservation_date)
where status = 'confirmed';

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
begin
  if caller_id is null then
    raise exception 'Invalid session.' using errcode = '28000';
  end if;

  select *
  into reservation_record
  from public."Reservations" r
  where r.id = target_reservation_id
    and r.status = 'confirmed'
  for update;

  if reservation_record.id is null then
    raise exception 'Reservation is unavailable or already cancelled.' using errcode = 'P0002';
  end if;

  if reservation_record.user_id = caller_id then
    update public."Reservations"
    set status = 'cancelled'
    where id = reservation_record.id;

    return query select reservation_record.id;
    return;
  end if;

  select sm.role
  into caller_role
  from public."SchoolMembers" sm
  where sm.school_id = reservation_record.school_id
    and sm.user_id = caller_id
    and sm.role in ('admin'::public.school_role, 'professor'::public.school_role)
  limit 1;

  if caller_role is null and exists (
    select 1
    from public."Schools" s
    where s.id = reservation_record.school_id
      and s.created_by = caller_id
  ) then
    caller_role := 'admin'::public.school_role;
  end if;

  if caller_role is null
    or reservation_record.created_by <> caller_id
    or reservation_record.created_by_role not in ('admin'::public.school_role, 'professor'::public.school_role)
  then
    raise exception 'Only the student or the admin/professor who scheduled this reservation can cancel it.'
      using errcode = '42501';
  end if;

  update public."Reservations"
  set status = 'cancelled'
  where id = reservation_record.id;

  return query select reservation_record.id;
end;
$$;

create or replace function public.cancel_reservation(
  target_reservation_id uuid
)
returns table (
  reservation_id uuid
)
language sql
set search_path = public, private, pg_temp
as $$
  select *
  from private.cancel_reservation(target_reservation_id);
$$;
