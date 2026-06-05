create or replace function public.remove_school_subject(
  target_school_id uuid,
  target_subject_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  removed_subject_id uuid;
begin
  perform private.assert_school_role(target_school_id, 'admin'::public.school_role);

  update public."SchoolSubjects" subject
  set deleted_at = now()
  where subject.id = target_subject_id
    and subject.school_id = target_school_id
    and subject.deleted_at is null
  returning subject.id into removed_subject_id;

  if removed_subject_id is null then
    raise exception 'School subject is unavailable.' using errcode = 'P0002';
  end if;

  return removed_subject_id;
end;
$$;

revoke execute on function public.remove_school_subject(uuid, uuid) from public;
revoke execute on function public.remove_school_subject(uuid, uuid) from anon;
grant execute on function public.remove_school_subject(uuid, uuid) to authenticated;
