-- Let professors review join requests alongside admins.
-- private.is_school_admin and the JoinRequests RLS policies are unchanged;
-- only the join-request listing RPC widens its access check.

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
    and (
      private.is_school_admin(target_school_id)
      or exists (
        select 1
        from public."SchoolMembers" sm
        inner join public."Schools" s
          on s.id = sm.school_id
        where sm.user_id = auth.uid()
          and sm.school_id = target_school_id
          and sm.role = 'professor'::public.school_role
          and s.deleted_at is null
      )
    )
  order by coalesce(jr.request_at, jr.created_at) asc;
$$;
