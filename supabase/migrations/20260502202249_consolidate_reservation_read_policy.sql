drop policy if exists "Admins and professors can view school reservations" on public."Reservations";
drop policy if exists "School members can view confirmed reservations" on public."Reservations";

create policy "School members can view confirmed reservations"
on public."Reservations"
for select
to authenticated
using (
  status = 'confirmed'
  and (
    exists (
      select 1
      from public."SchoolMembers" sm
      where sm.school_id = "Reservations".school_id
        and sm.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public."Schools" s
      where s.id = "Reservations".school_id
        and s.created_by = (select auth.uid())
    )
  )
);
