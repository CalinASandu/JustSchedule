-- Drops 6 functions with no callers anywhere (app, edge functions, other
-- database functions, RLS policies, triggers, views). No CASCADE on purpose:
-- the drop fails if anything still depends on them.
--   create_overflow_slot         -> superseded by create_overflow_exam_slot
--   set_slot_active              -> superseded by update_exam_slot
--   update_slot_capacity         -> superseded by update_exam_slot
--   get_school_behaviour_indexes -> never wired into the UI
--   get_student_reservation_history -> never wired into the UI
--   private.is_student_school_member -> unused membership check
-- Restore file (outside the repo): JustScheduleBackups/dropped-unused-functions-2026-09-25.sql

drop function public.create_overflow_slot(uuid, uuid, integer);
drop function public.set_slot_active(uuid, boolean);
drop function public.update_slot_capacity(uuid, integer);
drop function public.get_school_behaviour_indexes(uuid);
drop function public.get_student_reservation_history(uuid, uuid);
drop function private.is_student_school_member(uuid);
