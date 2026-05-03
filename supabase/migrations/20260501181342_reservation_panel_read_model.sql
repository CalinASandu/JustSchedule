alter table public."Reservations"
  add column if not exists reservation_date date;

update public."Reservations"
set reservation_date = created_at::date
where reservation_date is null;

alter table public."Reservations"
  alter column reservation_date set not null;

alter table public."Reservations"
  drop constraint if exists "Reservations_slot_id_fkey";

alter table public."Reservations"
  add constraint "Reservations_slot_id_fkey"
  foreign key (slot_id)
  references public."ExamSlots"(id)
  on delete restrict;

create index if not exists reservations_school_date_slot_idx
  on public."Reservations" (school_id, reservation_date, slot_id)
  where status = 'confirmed';

create policy "School members can view exam slots"
on public."ExamSlots"
for select
to authenticated
using (
  exists (
    select 1
    from public."SchoolMembers" sm
    where sm.school_id = "ExamSlots".school_id
      and sm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public."Schools" s
    where s.id = "ExamSlots".school_id
      and s.created_by = auth.uid()
  )
);

create policy "Admins and professors can view school reservations"
on public."Reservations"
for select
to authenticated
using (
  exists (
    select 1
    from public."SchoolMembers" sm
    where sm.school_id = "Reservations".school_id
      and sm.user_id = auth.uid()
      and sm.role in ('admin'::public.school_role, 'professor'::public.school_role)
  )
  or exists (
    select 1
    from public."Schools" s
    where s.id = "Reservations".school_id
      and s.created_by = auth.uid()
  )
);
