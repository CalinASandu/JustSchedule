create table if not exists public."ReservationHistory" (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid,
  school_id uuid,
  action text not null check (action in ('insert', 'update', 'delete')),
  changed_at timestamptz not null default now(),
  changed_by uuid,
  old_row jsonb,
  new_row jsonb
);

alter table public."ReservationHistory" enable row level security;

-- Admins and professors can read history for their own schools
create policy "school staff can read reservation history"
  on public."ReservationHistory"
  for select
  to authenticated
  using (
    exists (
      select 1 from public."SchoolMembers"
      where school_id = "ReservationHistory".school_id
        and user_id = auth.uid()
        and role in ('admin', 'professor')
    )
    or exists (
      select 1 from public."Schools"
      where id = "ReservationHistory".school_id
        and created_by = auth.uid()
    )
  );

-- No direct inserts/updates/deletes from clients — history is append-only via trigger
create or replace function public.record_reservation_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public."ReservationHistory" (
      reservation_id,
      school_id,
      action,
      changed_by,
      new_row
    ) values (
      new.id,
      new.school_id,
      'insert',
      auth.uid(),
      to_jsonb(new)
    );
    return new;

  elsif tg_op = 'UPDATE' then
    insert into public."ReservationHistory" (
      reservation_id,
      school_id,
      action,
      changed_by,
      old_row,
      new_row
    ) values (
      new.id,
      new.school_id,
      'update',
      auth.uid(),
      to_jsonb(old),
      to_jsonb(new)
    );
    return new;

  elsif tg_op = 'DELETE' then
    insert into public."ReservationHistory" (
      reservation_id,
      school_id,
      action,
      changed_by,
      old_row
    ) values (
      old.id,
      old.school_id,
      'delete',
      auth.uid(),
      to_jsonb(old)
    );
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists reservations_history_trigger on public."Reservations";

create trigger reservations_history_trigger
  after insert or update or delete on public."Reservations"
  for each row execute function public.record_reservation_history();
