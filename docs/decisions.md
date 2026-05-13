# JustSchedule — Architecture Decisions

## Soft Delete for Schools

Schools use soft delete (`soft_delete_school` RPC) rather than hard delete. Dependent rows (SchoolMembers, Reservations, ExamSlots) are preserved for audit and history — hard delete would cascade-destroy student booking records. Active school queries filter `deleted_at is null`.

## AttendanceSessions Is Temporary

The `AttendanceSessions` table, `start_attendance_session` RPC, and the Start button in the attendance UI are temporary testing aids. They let exam supervisors override the attendance timing window during development and testing. Once production timing is verified (attendance window: 5 min before → 25 min after slot start), remove the table, RPC, and Start button from the codebase.

## constants.ts Is Fallback Only

`components/schedule/constants.ts` contains static slot definitions from the MVP. It is kept only for isolated component compatibility (rendering components without a DB connection). `ExamSlots` is the authoritative slot source for all scheduling logic. Do not add new slots to `constants.ts` or use it in scheduling paths.

## Slot Times Are Wall-Clock, Not UTC

`ExamSlots.starts_at` and `ends_at` are stored as `time without time zone` representing local wall-clock time (Europe/Bucharest by default). If stored as UTC, a slot at 11:00 AM local would be treated as 11:00 UTC — making the attendance window 3 hours off. The RPC converts using `(date + time) AT TIME ZONE Schools.timezone`. New slots must continue to use wall-clock storage.
