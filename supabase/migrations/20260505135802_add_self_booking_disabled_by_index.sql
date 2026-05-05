create index if not exists school_members_self_booking_disabled_by_idx
on public."SchoolMembers" (self_booking_disabled_by)
where self_booking_disabled_by is not null;
