-- Allow direct join requests (no invite token required).
-- The existing "Users can create their own pending join requests" policy
-- (which requires a valid invite_id) is preserved unchanged.

-- Make invite_id nullable so a row can be inserted without an invite.
alter table public."JoinRequests"
  alter column invite_id drop not null;

-- New policy: authenticated users can insert a pending join request
-- directly (invite_id IS NULL), as long as it is for themselves
-- and they are not already a member of the school.
drop policy if exists "Users can create direct join requests" on public."JoinRequests";
create policy "Users can create direct join requests"
on public."JoinRequests"
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'::public.status_enum
  and invite_id is null
  and not exists (
    select 1
    from public."SchoolMembers" sm
    where sm.user_id = auth.uid()
      and sm.school_id = "JoinRequests".school_id
  )
);
