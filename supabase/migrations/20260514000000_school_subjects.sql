create table public."SchoolSubjects" (
  id uuid default gen_random_uuid() primary key,
  school_id uuid not null references public."Schools"(id) on delete cascade,
  name text not null,
  deleted_at timestamptz default null,
  created_at timestamptz default now() not null
);

create unique index school_subjects_school_name_unique
  on public."SchoolSubjects" (school_id, lower(name));

alter table public."SchoolSubjects" enable row level security;

create policy "members can view school subjects"
  on public."SchoolSubjects"
  for select
  to authenticated
  using (
    deleted_at is null
    and private.is_school_member(school_id)
  );

create policy "admins can add school subjects"
  on public."SchoolSubjects"
  for insert
  to authenticated
  with check (
    private.is_school_admin(school_id)
  );

create policy "admins can update school subjects"
  on public."SchoolSubjects"
  for update
  to authenticated
  using (private.is_school_admin(school_id))
  with check (private.is_school_admin(school_id));

-- RPC used by admin UI to add or restore a soft-deleted subject
create or replace function public.upsert_school_subject(
  target_school_id uuid,
  subject_name text
)
returns public."SchoolSubjects"
language plpgsql
security definer
set search_path = public
as $$
declare
  result public."SchoolSubjects";
begin
  if not private.is_school_admin(target_school_id) then
    raise exception 'Only admins can manage school subjects.';
  end if;

  insert into public."SchoolSubjects" (school_id, name, deleted_at)
  values (target_school_id, trim(subject_name), null)
  on conflict (school_id, lower(name)) do update
    set deleted_at = null
  returning * into result;

  return result;
end;
$$;

revoke execute on function public.upsert_school_subject(uuid, text) from public;
revoke execute on function public.upsert_school_subject(uuid, text) from anon;
grant execute on function public.upsert_school_subject(uuid, text) to authenticated;

-- Trigger: seed default subjects when a new school is created
create or replace function public.create_default_subjects_for_school()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public."SchoolSubjects" (school_id, name)
  values
    (new.id, '6th Grade English A'),
    (new.id, '6th Grade Math A'),
    (new.id, '6th Grade Math B'),
    (new.id, '6th Grade Science A'),
    (new.id, '7th Grade English A'),
    (new.id, '7th Grade English B'),
    (new.id, '7th Grade Math A'),
    (new.id, '7th Grade Math B'),
    (new.id, '7th Grade Science A'),
    (new.id, '7th Grade Science B'),
    (new.id, '7th Grade Social Studies A'),
    (new.id, '7th Grade Social Studies B'),
    (new.id, '8th Grade English A'),
    (new.id, '8th Grade English B'),
    (new.id, '8th Grade Math A'),
    (new.id, '8th Grade Math B'),
    (new.id, '8th Grade Science A'),
    (new.id, '8th Grade Science B'),
    (new.id, '8th Grade Social Studies A'),
    (new.id, '8th Grade Social Studies B'),
    (new.id, 'Algebra 1A'),
    (new.id, 'Algebra 1B'),
    (new.id, 'Algebra 2A'),
    (new.id, 'Algebra 2B'),
    (new.id, 'AP Calculus AB, SEM 2'),
    (new.id, 'AP Computer Science, SEM 2'),
    (new.id, 'AP English Language & Composition, SEM 2'),
    (new.id, 'AP Environmental Science, SEM 2'),
    (new.id, 'AP European History, SEM 2'),
    (new.id, 'AP Psychology, SEM 2'),
    (new.id, 'AP Statistics, SEM 2'),
    (new.id, 'Art 1'),
    (new.id, 'Art Appreciation'),
    (new.id, 'Biology A'),
    (new.id, 'Biology B'),
    (new.id, 'Business Math'),
    (new.id, 'Career Planning'),
    (new.id, 'Chemistry A'),
    (new.id, 'Chemistry B'),
    (new.id, 'Computing Literacy'),
    (new.id, 'Creative Writing: Short Fiction'),
    (new.id, 'Critical Thinking and Study Skills'),
    (new.id, 'Earth Science A'),
    (new.id, 'Earth Science B'),
    (new.id, 'Economics'),
    (new.id, 'English 10A'),
    (new.id, 'English 10B'),
    (new.id, 'English 11A'),
    (new.id, 'English 11B'),
    (new.id, 'English 12A'),
    (new.id, 'English 12B'),
    (new.id, 'English 9A'),
    (new.id, 'English 9B'),
    (new.id, 'Fitness for Life'),
    (new.id, 'Fitness for Well-Being'),
    (new.id, 'Food & Nutrition'),
    (new.id, 'Geometry A'),
    (new.id, 'Geometry B'),
    (new.id, 'German 1B'),
    (new.id, 'Health'),
    (new.id, 'Humanities'),
    (new.id, 'Introduction to Programming'),
    (new.id, 'Marketing'),
    (new.id, 'Music Appreciation'),
    (new.id, 'Personal Development'),
    (new.id, 'Personal Finance'),
    (new.id, 'Personalized Fitness'),
    (new.id, 'Photography'),
    (new.id, 'Physical Science A'),
    (new.id, 'Physical Science B'),
    (new.id, 'Physics A'),
    (new.id, 'Physics B'),
    (new.id, 'Pre-Algebra, First Half Unit'),
    (new.id, 'Pre-Algebra, Second Half Unit'),
    (new.id, 'Precalculus B'),
    (new.id, 'Psychology'),
    (new.id, 'Sociology'),
    (new.id, 'Spanish 1A'),
    (new.id, 'Speech 1'),
    (new.id, 'U.S. Government'),
    (new.id, 'U.S. History B'),
    (new.id, 'United States Government'),
    (new.id, 'United States History A'),
    (new.id, 'United States History B'),
    (new.id, 'World Geography A'),
    (new.id, 'World Geography B'),
    (new.id, 'World History A'),
    (new.id, 'World History B'),
    (new.id, 'World Religions')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists create_default_subjects_after_school_insert on public."Schools";

create trigger create_default_subjects_after_school_insert
  after insert on public."Schools"
  for each row
  execute function public.create_default_subjects_for_school();

revoke execute on function public.create_default_subjects_for_school() from public;
revoke execute on function public.create_default_subjects_for_school() from anon;
revoke execute on function public.create_default_subjects_for_school() from authenticated;

-- Seed existing schools
insert into public."SchoolSubjects" (school_id, name)
select s.id, sub.name
from public."Schools" s
cross join (
  values
    ('6th Grade English A'),
    ('6th Grade Math A'),
    ('6th Grade Math B'),
    ('6th Grade Science A'),
    ('7th Grade English A'),
    ('7th Grade English B'),
    ('7th Grade Math A'),
    ('7th Grade Math B'),
    ('7th Grade Science A'),
    ('7th Grade Science B'),
    ('7th Grade Social Studies A'),
    ('7th Grade Social Studies B'),
    ('8th Grade English A'),
    ('8th Grade English B'),
    ('8th Grade Math A'),
    ('8th Grade Math B'),
    ('8th Grade Science A'),
    ('8th Grade Science B'),
    ('8th Grade Social Studies A'),
    ('8th Grade Social Studies B'),
    ('Algebra 1A'),
    ('Algebra 1B'),
    ('Algebra 2A'),
    ('Algebra 2B'),
    ('AP Calculus AB, SEM 2'),
    ('AP Computer Science, SEM 2'),
    ('AP English Language & Composition, SEM 2'),
    ('AP Environmental Science, SEM 2'),
    ('AP European History, SEM 2'),
    ('AP Psychology, SEM 2'),
    ('AP Statistics, SEM 2'),
    ('Art 1'),
    ('Art Appreciation'),
    ('Biology A'),
    ('Biology B'),
    ('Business Math'),
    ('Career Planning'),
    ('Chemistry A'),
    ('Chemistry B'),
    ('Computing Literacy'),
    ('Creative Writing: Short Fiction'),
    ('Critical Thinking and Study Skills'),
    ('Earth Science A'),
    ('Earth Science B'),
    ('Economics'),
    ('English 10A'),
    ('English 10B'),
    ('English 11A'),
    ('English 11B'),
    ('English 12A'),
    ('English 12B'),
    ('English 9A'),
    ('English 9B'),
    ('Fitness for Life'),
    ('Fitness for Well-Being'),
    ('Food & Nutrition'),
    ('Geometry A'),
    ('Geometry B'),
    ('German 1B'),
    ('Health'),
    ('Humanities'),
    ('Introduction to Programming'),
    ('Marketing'),
    ('Music Appreciation'),
    ('Personal Development'),
    ('Personal Finance'),
    ('Personalized Fitness'),
    ('Photography'),
    ('Physical Science A'),
    ('Physical Science B'),
    ('Physics A'),
    ('Physics B'),
    ('Pre-Algebra, First Half Unit'),
    ('Pre-Algebra, Second Half Unit'),
    ('Precalculus B'),
    ('Psychology'),
    ('Sociology'),
    ('Spanish 1A'),
    ('Speech 1'),
    ('U.S. Government'),
    ('U.S. History B'),
    ('United States Government'),
    ('United States History A'),
    ('United States History B'),
    ('World Geography A'),
    ('World Geography B'),
    ('World History A'),
    ('World History B'),
    ('World Religions')
) as sub(name)
where s.deleted_at is null
on conflict do nothing;
