alter type public.school_role add value if not exists 'professor';

drop function if exists public.get_school_members_with_profiles(uuid);
drop function if exists private.get_school_members_with_profiles(uuid);

create or replace function private.can_view_school_members(target_school_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public."SchoolMembers"
    where user_id = auth.uid()
      and school_id = target_school_id
      and role::text in ('admin', 'professor')
  )
  or exists (
    select 1
    from public."Schools"
    where id = target_school_id
      and created_by = auth.uid()
  );
$$;

create or replace function private.get_school_members_with_profiles(target_school_id uuid)
returns table (
  id uuid,
  user_id uuid,
  role public.school_role,
  joined_at timestamptz,
  profile_name text,
  email text
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    sm.id,
    sm.user_id,
    sm.role,
    sm.joined_at,
    p.name as profile_name,
    u.email::text as email
  from public."SchoolMembers" sm
  left join public."Profiles" p
    on p.id = sm.user_id
  left join auth.users u
    on u.id = sm.user_id
  where sm.school_id = target_school_id
    and private.can_view_school_members(target_school_id)
  order by sm.joined_at asc;
$$;

create or replace function public.get_school_members_with_profiles(target_school_id uuid)
returns table (
  id uuid,
  user_id uuid,
  role public.school_role,
  joined_at timestamptz,
  profile_name text,
  email text
)
language sql
stable
set search_path = public, private, pg_temp
as $$
  select * from private.get_school_members_with_profiles(target_school_id);
$$;

drop policy if exists "Admins and professors can view school members" on public."SchoolMembers";
create policy "Admins and professors can view school members"
on public."SchoolMembers"
for select
to authenticated
using (private.can_view_school_members(school_id));

drop policy if exists "Admins can update school member roles" on public."SchoolMembers";
create policy "Admins can update school member roles"
on public."SchoolMembers"
for update
to authenticated
using (
  private.is_school_admin(school_id)
  and user_id <> auth.uid()
)
with check (
  private.is_school_admin(school_id)
  and user_id <> auth.uid()
);

drop policy if exists "Admins can remove student members" on public."SchoolMembers";
drop policy if exists "Admins can remove non-admin members" on public."SchoolMembers";
create policy "Admins can remove non-admin members"
on public."SchoolMembers"
for delete
to authenticated
using (
  private.is_school_admin(school_id)
  and user_id <> auth.uid()
  and role <> 'admin'::public.school_role
);
