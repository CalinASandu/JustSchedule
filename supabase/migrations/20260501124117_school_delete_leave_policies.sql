drop policy if exists "Admins can delete schools" on public."Schools";
create policy "Admins can delete schools"
on public."Schools"
for delete
to authenticated
using (private.is_school_admin(id));

drop policy if exists "Non-admin members can leave schools" on public."SchoolMembers";
create policy "Non-admin members can leave schools"
on public."SchoolMembers"
for delete
to authenticated
using (
  user_id = auth.uid()
  and role <> 'admin'::public.school_role
);
