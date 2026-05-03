create or replace function private.is_school_admin(target_school_id uuid)
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
      and role = 'admin'::public.school_role
  )
  or exists (
    select 1
    from public."Schools"
    where id = target_school_id
      and created_by = auth.uid()
  );
$$;

create or replace function private.get_school_join_requests_with_profiles(target_school_id uuid)
returns table (
  id uuid,
  user_id uuid,
  school_id uuid,
  requested_at timestamptz,
  profile_name text,
  email text
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    jr.id,
    jr.user_id,
    jr.school_id,
    coalesce(jr.request_at, jr.created_at) as requested_at,
    p.name as profile_name,
    u.email::text as email
  from public."JoinRequests" jr
  left join public."Profiles" p
    on p.id = jr.user_id
  left join auth.users u
    on u.id = jr.user_id
  where jr.school_id = target_school_id
    and jr.status = 'pending'::public.status_enum
    and private.is_school_admin(target_school_id)
  order by coalesce(jr.request_at, jr.created_at) asc;
$$;

create or replace function public.get_school_join_requests_with_profiles(target_school_id uuid)
returns table (
  id uuid,
  user_id uuid,
  school_id uuid,
  requested_at timestamptz,
  profile_name text,
  email text
)
language sql
stable
set search_path = public, private, pg_temp
as $$
  select * from private.get_school_join_requests_with_profiles(target_school_id);
$$;

drop policy if exists "Admins can view school join requests" on public."JoinRequests";
create policy "Admins can view school join requests"
on public."JoinRequests"
for select
to authenticated
using (private.is_school_admin(school_id));
