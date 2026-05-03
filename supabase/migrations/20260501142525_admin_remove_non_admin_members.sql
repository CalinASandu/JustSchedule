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
