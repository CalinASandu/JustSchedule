create unique index if not exists exam_slots_school_name_unique
on public."ExamSlots" (school_id, lower(name));

create or replace function public.create_default_exam_slots_for_school()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public."ExamSlots" (
    school_id,
    name,
    starts_at,
    ends_at,
    capacity,
    is_active
  )
  values
    (new.id, 'morning', time '09:00', time '11:00', 8, true),
    (new.id, 'midday', time '11:00', time '13:00', 8, true),
    (new.id, 'afternoon', time '14:00', time '16:30', 8, true)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists create_default_exam_slots_after_school_insert on public."Schools";

create trigger create_default_exam_slots_after_school_insert
after insert on public."Schools"
for each row
execute function public.create_default_exam_slots_for_school();

revoke execute on function public.create_default_exam_slots_for_school() from public;
revoke execute on function public.create_default_exam_slots_for_school() from anon;
revoke execute on function public.create_default_exam_slots_for_school() from authenticated;

insert into public."ExamSlots" (
  school_id,
  name,
  starts_at,
  ends_at,
  capacity,
  is_active
)
select
  school.id,
  slot.name,
  slot.starts_at,
  slot.ends_at,
  slot.capacity,
  true
from public."Schools" school
cross join (
  values
    ('morning', time '09:00', time '11:00', 8),
    ('midday', time '11:00', time '13:00', 8),
    ('afternoon', time '14:00', time '16:30', 8)
) as slot(name, starts_at, ends_at, capacity)
on conflict do nothing;
