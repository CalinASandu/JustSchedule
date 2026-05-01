alter table public."SchoolInvites" enable row level security;
alter table public."JoinRequests" enable row level security;

drop policy if exists "Admins can create school invites" on public."SchoolInvites";
create policy "Admins can create school invites"
on public."SchoolInvites"
for insert
to authenticated
with check (
  created_by = auth.uid()
  and private.is_school_admin(school_id)
);

drop policy if exists "Admins can list school invites" on public."SchoolInvites";
create policy "Admins can list school invites"
on public."SchoolInvites"
for select
to authenticated
using (private.is_school_admin(school_id));

drop policy if exists "Authenticated users can read active invites by token" on public."SchoolInvites";
create policy "Authenticated users can read active invites by token"
on public."SchoolInvites"
for select
to authenticated
using (
  is_active = true
  and expires_at >= now()
);

drop policy if exists "Users can create their own pending join requests" on public."JoinRequests";
create policy "Users can create their own pending join requests"
on public."JoinRequests"
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'::public.status_enum
  and exists (
    select 1
    from public."SchoolInvites" invite
    where invite.id = invite_id
      and invite.school_id = "JoinRequests".school_id
      and invite.is_active = true
      and invite.expires_at >= now()
  )
);
