<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Understanding the Codebase

Do not read files broadly just to explore the architecture. A knowledge graph has already been built; read it first:

```bash
graphify-out/GRAPH_REPORT.md   # architecture summary, god nodes, community map
graphify-out/graph.json        # full graph data, queryable
```

If the graph feels stale after major refactors, run `graphify update .` to rebuild it, but do not do this on every task.

## Production Status

**The app is live with real users.** As of late May 2026, there are ~50 school members and active reservations in the production database.

This means:
- Schema migrations must be backward-compatible and non-destructive. Never drop columns or tables that may hold live data without a safe migration path.
- Use an additive-first production change rule: new features must start by adding new tables, columns, indexes, policies, functions, and UI paths without changing or removing the existing live contract. Do not rewrite existing reservation rows, replace deployed RPC behavior, rename columns, or remove old fields in the same step that introduces a feature. If a non-backward-compatible cleanup is needed, ship it later as a separate migration only after the additive version has been verified in production and the user explicitly approves removing the unused legacy path.
- Before applying any Supabase migration to the remote project, explain the exact migration plan to the user and wait for explicit approval.
- Do not run destructive SQL (truncate, drop, bulk delete) against production without explicit user confirmation.
- RLS policy changes and RPC modifications affect real users immediately after deployment — review carefully before applying.
- Treat `Reservations`, `SchoolMembers`, `Schools`, and `Profiles` as live production tables at all times.

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run lint     # ESLint
graphify update . # refresh the code graph after substantial repo edits
```

No test suite exists yet.

## Git Rules

- Never commit or push to `main`.
- Work on the current user's branch, which follows the pattern `{name}-dev` such as `calin-dev`, `matei-dev`, `ilie-dev`, or `andrew-dev`. Check the active branch with `git branch --show-current` and use it. If no `*-dev` branch exists yet, ask the user what their name is before creating one.
- Do not add AI assistant co-author trailers in commit messages. Commits must appear as the human author only; omit any `Co-Authored-By` trailer.
- Open a PR to `main` only when the user explicitly asks.

## Stack

- Next.js 16 App Router with React 19. This version has breaking changes; check `node_modules/next/dist/docs/` before using any routing, data-fetching, or middleware API.
- Tailwind CSS 4. Config is in `tailwind.config` / `postcss.config.mjs`; the v4 API differs from v3.
- Supabase (`@supabase/ssr` and `@supabase/supabase-js`) for auth and database.
- Supabase Edge Functions live under `supabase/functions/`; function source, `supabase/config.toml`, and `supabase/migrations/` are repo source and should be versioned.
- `framer-motion` is used only in landing components. Everywhere else, use the CSS animation utilities in `globals.css`.
- shadcn components live in `components/ui/`.

## Architecture

### Auth Flow

1. User clicks Google Sign-In, and `supabase.auth.signInWithOAuth` redirects to Google.
2. Google redirects to `/auth/callback?code=...`, where `app/auth/callback/route.ts` exchanges the code for a session.
3. OAuth and landing-page redirects preserve a safe relative `next` path, including invite links like `/invite/[inviteToken]`.
4. The callback checks `public.Profiles` for a non-empty trimmed `name`. If missing, redirect to `/login?next=...`. If present, redirect to `next` or `/dashboard`.
5. `/login` (`app/login/page.tsx`) collects the user's real name and writes it to `public.Profiles` via `.update().eq("id", user.id)`, then redirects to the safe `next` path or `/dashboard`.
6. `/` (`app/page.tsx`) checks the cookie-backed Supabase session with `auth.getUser()` and redirects signed-in users to the safe `next` path or `/dashboard`, so logged-in users do not see the landing page. Existing sessions are still forced through `/login?next=...` when `Profiles.name` is missing or blank.
7. Authenticated entry pages (`/dashboard`, `/dashboard/schedule`, `/dashboard/schools/[schoolId]`, and `/invite/[inviteToken]`) also require the trimmed `Profiles.name`. Do not fall back to Google metadata or email for platform identity; request-creation actions should reject unnamed users instead.

### Supabase Client Usage

| Context | Import |
|---|---|
| Client components (`"use client"`) | `createClient` from `@/lib/supabase/client`, which uses `createBrowserClient` |
| Server components and route handlers | `createClient` from `@/lib/supabase/server`, which is async and uses `createServerClient` plus cookies |

The env helper at `lib/supabase/env.ts` validates `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Note the publishable key variable name; this differs from standard Supabase setups that use an anon key variable.

### Invites and Join Requests

Admins create invite links from `Settings > Invites` on the school management page. Invite creation is handled by the deployed Supabase Edge Function `create-school-invite` (`supabase/functions/create-school-invite/index.ts`) with JWT verification enabled in `supabase/config.toml`. The client calls `supabase.functions.invoke("create-school-invite")` with the signed-in user's access token, `{ schoolId, expiresAt, siteUrl }`, and receives `{ inviteLink }`. Do not add Invites back as a top-level school dashboard tab.

Invite links use `/invite/[inviteToken]`; the old `/dashboard/join/[inviteToken]` route was removed. If unauthenticated, `/invite/[inviteToken]` redirects to `/?next=/invite/[inviteToken]`. Accepting an invite creates a pending `JoinRequests` row; it does not create direct membership.

Admins review pending join requests in the `Join Requests` tab of `components/dashboard/SchoolManagementTabs.tsx`. The list is loaded through `get_school_join_requests_with_profiles`, which returns request id, user id, profile name, email, and request time for school admins. Review submission calls the deployed Supabase Edge Function `review-school-join-requests`, which verifies the caller is an admin, adds approved users to `SchoolMembers` with role `student`, and deletes processed `JoinRequests` rows.

In single-school mode (current default), the dashboard also shows all non-deleted schools to every logged-in user. Non-members see a `DirectJoinCard` (`components/dashboard/DirectJoinCard.tsx`) with a "Request to join" button instead of a link. Clicking it calls `requestDirectJoin` (in `app/dashboard/actions.ts`), which inserts a `JoinRequests` row with `invite_id = null`. A separate RLS policy (`Users can create direct join requests`, migration `20260520000000_direct_join_requests.sql`) permits this path. The school creation UI (`RegisterSchoolForm`, `registerSchool` action) is hidden but NOT deleted. See `docs/revert-to-multi-school-mode.md` to restore it.

### Schedule Page

`app/dashboard/page.tsx` is the authenticated dashboard overview. It lists the schools the signed-in user belongs to, shows a profile panel, and includes a ghost card with `RegisterSchoolForm` for creating another school. Admin and professor school cards link to `/dashboard/schools/[schoolId]`; student school cards link to `/dashboard/schedule?schoolId=...`.

`app/dashboard/schedule/page.tsx` is the schedule server component that fetches the session, validates the `schoolId` query param, redirects admins and professors to `/dashboard/schools/[schoolId]`, loads active `ExamSlots` plus confirmed school `Reservations` for today through today + 14 days, and passes the current non-admin membership down. `app/dashboard/schedule/ScheduleClient.tsx` is the client component that owns all interactive schedule state (`handleDateSelect`, `handleReserve`, `handleReset`) plus the URL-backed workspace panel switcher. Student names are read from `Profiles.name` only and shown as locked profile data in the reservation form; students must not edit the booking owner name in the schedule form. There is no `/schedule` route; schedule lives at `/dashboard/schedule`.

The student schedule workspace uses a panel switcher above the content, not navbar tabs. The current panels are `Schedule`, `My Reservations`, and `School Profile`; `School Profile` currently shows membership details and a `Leave school` action. Keep school-specific panels in this workspace switcher rather than adding school selectors or school tabs to the global navbar. The `Schedule` panel still includes the broad `BookingsPanel` overview for school reservations; use `My Reservations` for the student's own detailed reservation management and cancellation.

`app/dashboard/schools/[schoolId]/page.tsx` is the school management shell for admins, professors, and exam supervisors. It verifies the signed-in user's `SchoolMembers` row or `Schools.created_by` ownership for the selected active school before rendering. Admins can manage members, invites, join requests, and settings; professors can view members, search the member list, schedule exams for students, and cancel school reservations; exam supervisors can view reservations and use attendance only.

The schedule UI is split into panels: `CalendarPanel`, `SlotPicker`, `BookingSummaryCard`, `SeatAvailabilityOverview`, and `BookingsPanel`. All live in `components/schedule/`. The student schedule UI computes slot availability from database `Reservations`, not local mock booking state.

`ExamSlots` is now the authoritative slot source for active school slots. `components/schedule/constants.ts` only contains fallback/default slot shapes for isolated component compatibility and must not be treated as the scheduling source of truth.

### Reservation Read Model

Admin/professor reservation visibility is implemented in the school dashboard, not the student schedule workspace. `app/dashboard/schools/[schoolId]/page.tsx` loads active `ExamSlots` plus confirmed `Reservations` for the selected school and passes them into `components/dashboard/SchoolManagementTabs.tsx`.

`SchoolManagementTabs` has a `Reservations` tab for admins, professors, and exam supervisors. `SchoolManagementTabs` is only the shell; reservation UI and mutations live under `components/dashboard/school-management-tabs/`. The tab reuses the page-loaded `ExamSlots`, `Reservations`, and members data rather than refetching the same data in each view. Day view renders responsive slot cards with dynamic occupancy bars, booked reservation rows, open-seat indicators, and an action menu on each manageable reservation. Week view shows Mon-Fri only (weekends are filtered out since no exams can be scheduled then) as weekday agenda columns with clickable reservation chips. Admins/professors can open the action menu to update or cancel any confirmed reservation in their school; exam supervisors can view reservations but cannot update or cancel them.

The current database model is:

| Table | Purpose |
|---|---|
| `ExamSlots` | Reusable per-school slot template: `name`, `starts_at`, `ends_at`, `capacity`, `is_active`, `slot_kind`, `primary_slot_id`. Does not store a date. Primary slots have `slot_kind = 'primary'`; overflow slots have `slot_kind = 'overflow'` and point to their primary slot. |
| `Reservations` | Actual bookings: `school_id`, `user_id`, `slot_id`, `reservation_date`, `exam_name`, `exam_type`, `status`. |

`Reservations.slot_id` references `ExamSlots.id`. `Reservations.reservation_date` stores the actual calendar day. The duplicate rule is enforced by reservation RPCs, not a new table constraint: one student cannot hold two confirmed reservations for the same primary/overflow pair on the same date, and one student cannot create or update into a confirmed reservation from today forward with the same school, trimmed case-insensitive exam name, and exam type. Past confirmed reservations do not block rebooking.

Students can view full confirmed reservations for schools where they are members. The student bookings panel intentionally shows student name, exam name, exam type, reservation date, and slot times for confirmed school reservations, because this read model supports visibility and future swap flows. Students can cancel reservations assigned to them, regardless of whether the booking was created by the student or by an admin/professor.

Relevant migrations:

- `supabase/migrations/20260501181342_reservation_panel_read_model.sql` adds `reservation_date`, the `slot_id` foreign key, the confirmed-reservation lookup index, and read policies for slots/reservations.
- `supabase/migrations/20260501181425_date_aware_reservation_uniqueness.sql` replaces the old `(user_id, slot_id)` uniqueness with `(user_id, slot_id, reservation_date)`.
- `supabase/migrations/20260502202056_reserve_exam_slot.sql` adds member-scoped confirmed reservation listing RPCs and transactional reservation RPCs with a per-school/date/slot advisory transaction lock.
- `supabase/migrations/20260502202249_consolidate_reservation_read_policy.sql` replaces overlapping reservation read policies with one member-scoped confirmed-reservation read policy.
- `supabase/migrations/20260502202326_add_reservations_slot_fk_index.sql` adds the plain `Reservations.slot_id` foreign-key index requested by Supabase advisors.
- `supabase/migrations/20260505144142_cancel_reservations.sql` replaces all-row reservation uniqueness with a confirmed-only unique index and adds the `cancel_reservation` RPC.
- `supabase/migrations/20260508114018_attendance_supervisor_soft_delete.sql` adds school soft delete, the `exam_supervisor` role, attendance fields/session override support, broad admin/professor reservation cancellation, and attendance RPCs.
- `supabase/migrations/20260529000000_default_self_booking_false.sql` changes the default for `SchoolMembers.can_self_book` from `true` to `false`; new members must be explicitly granted self-booking permission by an admin or professor.
- `supabase/migrations/20260603000000_overflow_exam_rooms.sql` adds primary/overflow slot metadata, overflow-aware reservation routing, and slot management RPCs.
- `supabase/migrations/20260603170000_slot_management_rooms_fix.sql` adds `create_exam_slot` and fixes overflow-name collisions so same-name primary slots are not mislabeled as existing overflow rooms.
- `supabase/migrations/20260603195500_allow_overflow_slot_time_overlap.sql` replaces the old all-slot `(school_id, starts_at, ends_at)` uniqueness with a primary-slot-only unique index, allowing overflow rooms to share their primary slot's time window.
- `supabase/migrations/20260604091603_fix_reserve_exam_slot_created_by.sql` restores `created_by` and `created_by_role` writes in the overflow-aware `reserve_exam_slot` RPC.
- `supabase/migrations/20260625000000_validate_reservation_exam_subjects.sql` adds `private.assert_school_subject_name(...)` and calls it from the public reservation and schedule-request RPCs so submitted exam names must match an active `SchoolSubjects` row for the same school.

### Reservation Write Flow

Reservation creation is implemented through the deployed Supabase Edge Function `reserve-exam-slot` (`supabase/functions/reserve-exam-slot/index.ts`) with JWT verification enabled in `supabase/config.toml`. The client calls `supabase.functions.invoke("reserve-exam-slot")` with the signed-in user's access token and `{ schoolId, slotId, reservationDate, examName, examType }`.

Server-side checks are authoritative. The RPC verifies the caller is signed in, is a `student` member of the target school, has `can_self_book = true` on their `SchoolMembers` row, the selected slot is an active primary slot that belongs to the school, the date is today through today + 14 calendar days, the date is not a weekend, the exam type is `midterm` or `final`, and the exam name is non-empty and matches an active `SchoolSubjects` row for the same school. The RPC locks the primary `school_id + reservation_date + slot_id`, counts confirmed primary reservations, and inserts into the primary slot when capacity remains. If the primary is full and has an active overflow room, it locks the overflow slot and books there only if overflow capacity remains. Do not trust a frontend-only seat availability check for booking enforcement.

`SchoolMembers.can_self_book` defaults to `false` for all new members (migration `20260529000000_default_self_booking_false.sql`; previously defaulted to `true`). Admins and professors enable or disable self-booking per student via the `set_student_self_booking_permission` RPC from the Members tab. When disabled, the student's booking UI must reflect this state and the RPC will reject any booking attempt with an error.

Duplicate rule: one student cannot hold two confirmed reservations for the same primary/overflow pair on the same date, but can book another time slot on the same date when it is a different exam. A matching confirmed reservation with the same `school_id`, `user_id`, trimmed case-insensitive `exam_name`, and `exam_type` from today forward blocks new direct bookings, admin/professor bookings, reservation updates, and schedule-request approvals. Cancelled reservations and past confirmed reservations do not block rebooking.

Reservation cancellation is implemented through the deployed Supabase Edge Function `cancel-reservation` (`supabase/functions/cancel-reservation/index.ts`) with JWT verification enabled in `supabase/config.toml`. The client calls it with `{ reservationId }`. The RPC allows cancellation when the caller is the reservation's `user_id`, or when the caller is an admin/professor member of the reservation's school. Do not implement cancellation as a direct client-side table update.

Admin/professor reservation updates are implemented in the school dashboard reservations tab through the `update_reservation` RPC, not through direct table updates. Each manageable reservation uses an action menu with `Update` and `Cancel reservation`. The update dialog is prefilled from the existing reservation, so unchanged date, slot, exam name, and exam type are submitted as-is, but the exam name must be selected from the school's active subject list. The client calls `update_reservation` with `target_reservation_id`, `target_slot_id`, `target_reservation_date`, `target_exam_name`, and `target_exam_type`; the RPC performs the same date/weekend/exam validation, active `SchoolSubjects` exam-name validation, and primary/overflow capacity routing server-side. Because overflow reservations store the overflow `slot_id`, the dashboard loads `ExamSlots.slot_kind` and `ExamSlots.primary_slot_id` so the update dropdown can default overflow-routed reservations back to their primary slot.

### Exam Scheduling Requests

Students with `SchoolMembers.can_self_book = false` cannot reserve directly, but can create an exam scheduling request for a professor in their school. Students with self-booking enabled should keep using the direct reservation flow instead of requests. A schedule request is stored in `ScheduleRequests` and never creates or locks a `Reservations` row while pending. Other students must not see pending requests in booking overviews.

Request creation uses the `create_schedule_request` RPC with `{ target_school_id, target_teacher_user_id, target_slot_id, target_reservation_date, target_exam_name, target_exam_type }`. The RPC validates that the caller is a student member with self-booking disabled, the selected teacher is a professor in the same active school, the date and exam fields match the normal booking rules, the exam name matches an active `SchoolSubjects` row, and the selected slot belongs to the same primary/overflow slot group. One student may have only one pending request for the same school/date/primary-slot group. Requests expire two hours before the requested slot start using the school's timezone.

Professors review only requests assigned to them. Admins can view and review all requests, including requests assigned to professors who were later removed from the school. Review uses the `review_schedule_request` RPC with `approved` or `declined` and an optional message. Teachers/admins cannot edit the requested date, slot, exam name, or exam type during approval. Approval re-checks membership, duplicate booking, active slot state, and primary/overflow capacity transactionally; only then does it insert a confirmed `Reservations` row. If the primary and overflow rooms fill before approval, the request becomes `failed_capacity` and no reservation is created.

Students can cancel their own pending requests through `cancel_schedule_request`. Approved and declined requests can be dismissed from the student's request panel with `mark_schedule_request_seen`, which sets `ScheduleRequests.student_seen_at`; once marked seen, those approved/declined requests are omitted from `get_student_schedule_requests`. Teachers/admins have a separate seen marker: opening a request for review calls `mark_schedule_request_teacher_seen`, which sets `teacher_seen_at` / `teacher_seen_by` without hiding pending requests. Expired, cancelled, failed, and unseen approved/declined requests remain as request history for the student and school dashboard.

The school dashboard `Exam Requests` tab shows only pending requests in a week table: weekdays are columns, active primary exam slots are stacked vertically by start time, and each slot section renders one row per seat based on `ExamSlots.capacity`. Request cells emphasize the student name, exam name, and exam type only; selecting a cell opens the review rail, and the rail can be hidden. Overflow slot sections and overflow capacity details are shown only when the corresponding overflow `ExamSlots` row is active.

In-app notices are stored in `UserNotifications` and loaded on page render; there is no realtime subscription or email for v1. `get_user_notifications` returns only unread rows, and the UI removes a notice once it is marked seen/read. Assigned professors receive request-created/cancelled notices. Students receive approval, decline, expiry, and failure notices. Admins do not receive request notification rows; they see all requests from the school dashboard `Exam Requests` tab.
### Attendance

Attendance is stored on `Reservations` with `attendance_status`, `attendance_marked_by`, and `attendance_marked_at`. New reservations default to `attendance_status = 'present'`, but the UI must treat `attendance_marked_at is null` as `Not marked`; display `present` or `absent` only after attendance has actually been marked. Exam supervisors only change a student to `absent` when the student did not attend.

The `Attendance` tab in `SchoolManagementTabs` is visible to admins, professors, and exam supervisors. Admins/professors have read-only attendance visibility. Only `exam_supervisor` members can mark attendance through the `set_reservation_attendance` RPC. Attendance is slot-scoped: the selected slot determines which reservations are shown.

The attendance UI has a date navigator (prev/next arrows + date label) in the header, a row of clickable slot pill buttons below it (one per active slot, showing name + time range), a status bar showing the current session state and an inline Start button for exam supervisors, and a bordered table of students with a status badge plus present/absent toggle buttons for supervisors. Read-only viewers see only the status badge.

Production timing is enforced server-side in `private.set_reservation_attendance`: attendance can be marked only from five minutes before the slot start until twenty-five minutes after the slot start (`supabase/migrations/20260511172234_attendance_close_window.sql`). The attendance UI mirrors this — present/absent toggles are disabled outside that window and the status bar shows "Opens at …", "Open until …", or "Closed". The `AttendanceSessions` table and `start_attendance_session` RPC let exam supervisors unlock a slot early/longer for testing via the Start button (an active session overrides the timing window in both the RPC and the UI). Remove that table/RPC/button after real timing is verified.

Slot times (`starts_at`, `ends_at`) are stored as `time without time zone` representing local wall-clock time. The RPC converts them to UTC using `(date + time) AT TIME ZONE school_timezone` where `school_timezone` comes from `Schools.timezone` (default `'Europe/Bucharest'`). Without this, the DB (UTC) would treat an 11:00 AM local slot as 11:00 UTC, making the attendance window 3 hours off. The migration is `supabase/migrations/20260512000000_attendance_timezone_fix.sql`.

### Delete and Leave Flows

School deletion is now soft delete through the `soft_delete_school` RPC, not a direct table delete. Student leave still uses normal Supabase database calls guarded by RLS. The old delete policies started in `supabase/migrations/20260501140000_school_delete_leave_policies.sql`, and the current soft-delete behavior is in `supabase/migrations/20260508114018_attendance_supervisor_soft_delete.sql`.

Admins delete schools from the `Settings` tab in `SchoolManagementTabs`. The UI requires typing the exact school name before enabling the delete button. Deleting a school sets `Schools.deleted_at` and `Schools.deleted_by`; dependent rows are preserved for audit/history, and active school queries must filter `deleted_at is null`.

Admins kick non-admin members from the `Members` tab in `SchoolManagementTabs`. The UI shows a `Kick` button on each non-admin member card, opens a confirmation dialog, and requires a 5-second cooldown before confirmation. Professors can be listed but cannot manage members, and admins must be able to update roles through the staged dropdown plus confirm panel before members are updated.

Students leave schools from the `School Profile` panel in the schedule workspace via `components/dashboard/LeaveSchoolButton.tsx`. The leave flow opens a confirmation dialog and requires a 5-second delay before confirmation. Do not put the leave action on the main school card grid.

### Proxy

`proxy.ts` at the root is the Next.js 16 proxy for auth cookie/session refresh. It is part of the app integration with Supabase SSR, not a custom authorization layer. Dashboard pages still make their own authorization decisions with `supabase.auth.getUser()` and database/RLS checks.

For a normal request like `/dashboard`, the flow is:

1. The browser sends `/dashboard` with any existing Supabase auth cookies.
2. Next.js checks `proxy.ts`'s matcher. Normal app routes match; static assets, optimized images, favicon, and common image files are skipped.
3. `proxy(request)` creates `NextResponse.next({ request })`, meaning the request should continue to the real route after proxy work finishes.
4. The proxy creates a Supabase `createServerClient` using the incoming request cookies via `getAll()`.
5. `await supabase.auth.getClaims()` asks Supabase to inspect the cookie-backed session. If the access token is still valid, the request continues unchanged. If it is stale but refreshable, Supabase refreshes the session.
6. When Supabase refreshes, the proxy `setAll()` updates both `request.cookies` and `response.cookies`. Updating `request.cookies` lets the Server Component for the same request see the fresh session immediately; updating `response.cookies` stores the refreshed cookies in the browser for future requests.
7. The proxy returns the response, then the actual page renders. For `/dashboard`, `app/dashboard/page.tsx` calls `auth.getUser()` through `lib/supabase/server.ts`; if there is no user it redirects to `/`, otherwise it loads the dashboard data.

Do not move authorization decisions into `proxy.ts`. Keep it focused on keeping Supabase SSR cookies fresh before Server Components run. The server client in `lib/supabase/server.ts` still catches cookie writes because Server Components cannot always set cookies themselves; `proxy.ts` is the place where cookie refresh writes are reliable.

### Security Notes

- Use `supabase.auth.getUser()` for server-side auth decisions. `user_metadata` is allowed only for display fallbacks, never authorization.
- Do not expose Supabase service-role keys or private secrets to client components. Public client code may only use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Dashboard authorization depends on Supabase RLS for `Profiles`, `Schools`, `SchoolMembers`, `SchoolInvites`, and `JoinRequests`; frontend filters are not a substitute for policies. The `school_role` enum now includes `admin`, `professor`, `exam_supervisor`, and `student`, and member-management policies must match that four-role model.
- In Supabase database functions, assert the signed-in caller's school role through `private.assert_school_role`; see `docs/decisions.md`.
- Edge Functions that perform privileged writes must first verify the caller with the user's JWT before using service-role access.
- `npm audit` currently reports a moderate PostCSS advisory through `next@16.2.4`; do not run `npm audit fix --force` because npm suggests downgrading Next to `9.3.3`. Re-check after a Next release updates the transitive PostCSS version.

## Disaster Recovery

The full recovery plan is documented in `docs/free-database-backup-and-recovery.md`. Layers 1, 2, and 4 are implemented; Layers 3, 5, and 6 are not yet implemented.

Layer 1 (soft delete): `SchoolSubjects` uses `deleted_at`. Schools use `soft_delete_school` RPC. Hard-delete RLS policy on `Schools` was dropped in `20260508114018`.

Layer 2 (audit history): `ReservationHistory` table with insert/update/delete trigger (`reservations_history_trigger` → `record_reservation_history()`). Migration: `20260517000000_reservation_history.sql`. Admins and professors can read history for their schools; no client writes allowed.

### Automated Backups

A cron job on the development machine runs `~/Documents/programming/JustScheduleBackups/backup.sh` at 00:00, 08:00, and 16:00 every day. It uses `supabase db dump --linked` (Supabase CLI v2.98.2, linked to project ref `trklyoutnojcdnxordhv`) and produces two gzip-compressed files per run:

- `<timestamp>_schema.sql.gz` — table definitions, functions, triggers, RLS policies
- `<timestamp>_data.sql.gz` — all row data

Retention policy:

| Folder | Contents | Kept |
|---|---|---|
| `rolling/` | Every 8-hour dump | Last 9 (3 days) |
| `weekly/` | Sunday's dump | Last 4 (4 weeks) |
| `monthly/` | 1st-of-month dump | Last 2 (2 months) |

All backups live in `~/Documents/programming/JustScheduleBackups/`. Do not commit dumps to Git — they contain user data. A log of every run is at `JustScheduleBackups/backup.log`.

### Restoring Data

For partial recovery (e.g. a day of reservations lost): decompress the nearest dump before the loss, extract the relevant `INSERT` statements for the affected table, and run them in the Supabase SQL editor.

```bash
gunzip -k rolling/<timestamp>_data.sql.gz
grep 'INSERT INTO "Reservations"' rolling/<timestamp>_data.sql | grep '<date-to-restore>'
# paste matching rows into Supabase SQL editor
```

For full recovery (total database loss): create a new Supabase project, then restore:

```bash
gunzip -k <timestamp>_schema.sql.gz <timestamp>_data.sql.gz
psql "postgres://postgres:<password>@db.<new-ref>.supabase.co:5432/postgres" -f <timestamp>_schema.sql
psql "postgres://postgres:<password>@db.<new-ref>.supabase.co:5432/postgres" -f <timestamp>_data.sql
# update NEXT_PUBLIC_SUPABASE_URL and keys in .env.local
```

Do not restore into an existing live Supabase project without manually clearing it first — Supabase internal schemas (`auth`, `storage`, `realtime`) make that unsafe.

## Keeping AGENTS.md Current

When making a change, update the relevant section of this file in place — replace outdated information rather than appending. Do not accumulate a changelog. The goal is a compact, always-accurate reference.

## Component Modularity

Do not let dashboard components grow into one large file. Split substantial feature surfaces by tab, panel, dialog, action menu, helper/API module, and repeated row/card component before a file approaches roughly 500 lines. For school management, keep `components/dashboard/SchoolManagementTabs.tsx` as the tab glue shell and put tab-specific UI, local interaction state, and tab-specific mutations under `components/dashboard/school-management-tabs/`. Reuse page-loaded data between tabs instead of refetching the same `ExamSlots`, `Reservations`, members, invites, or join requests in each tab. Reservation-specific UI should stay further split into toolbar, summary strip, day view, week view, action menu, update dialog, and cancel dialog instead of being embedded back into the shell.

## UI Design System

All visual conventions are documented in `docs/ui.md`. Read it before building any UI. Key rules:

- Page background: `#f7f8fa`; card surfaces: `#ffffff` with the `.panel` class. Never recreate this inline.
- Single accent: `#2563eb` blue. Do not introduce other accent colors.
- Font: Geist is already loaded globally. Do not re-import it.
- CSS animation utilities: `anim-fade-in`, `anim-slide-up`, `anim-scale-in`, and stagger delays `anim-d1` through `anim-d4`, all defined in `globals.css`.
- No dark mode.

Before editing layout, spacing, responsive behavior, page shells, tabs, tables, cards, dialogs, or navigation, read `docs/responsive-layout.md` and follow its mobile-first layout rules, breakpoint model, table-to-card guidance, touch target requirements, overflow rules, and viewport verification checklist.

Before UI, React, or Next.js component work, read and follow the relevant installed design and Vercel skills in addition to `docs/ui.md`:

### Vercel / React skills (always read for any component work)
- `web-design-guidelines` — UI/accessibility/design review against Vercel's web interface guidelines. Fetch fresh rules from source before each review.
- `vercel-react-best-practices` — React and Next.js performance patterns (memoization, Suspense, bundle splitting).
- `vercel-composition-patterns` — reusable component architecture, compound components, composition over inheritance.
- `vercel-react-view-transitions` — when adding or changing transitions/animations between UI states or routes.

### Design craft skills (read when doing visual or UX work)
- `impeccable` — end-to-end production design workflow: shape → craft → polish → audit. Use for any new page or significant component. Enforces PRODUCT.md/DESIGN.md context gates, shared design laws (OKLCH color, typography, motion), and an anti-slop checklist. Commands: `shape`, `craft`, `polish`, `bolder`, `quieter`, `distill`, `colorize`, `typeset`, `layout`, `animate`, `critique`, `audit`.
- `frontend-design:frontend-design` — bold aesthetic direction for one-off components and interfaces. Pick a conceptual direction (brutalist, editorial, luxury, toy-like, etc.) and commit fully. Use when a component needs to be memorable and visually distinctive.
- `high-end-visual-design` — agency-tier motion choreography and haptic micro-aesthetics. Use for hero sections, landing pages, or any surface where cinematic quality matters. Provides the Double-Bezel nested card architecture, custom cubic-bezier springs, staggered scroll reveals, and Magnetic Button hover physics.
- `minimalist-ui` — premium utilitarian minimalism. Warm monochrome palette, editorial serif/sans pairing, bento grid layouts, ultra-flat components with 1px `#EAEAEA` borders. Use when the interface should feel like a high-end workspace tool (Notion/Linear tier).
- `ui-ux-pro-max:ui-ux-pro-max` — comprehensive design reference: 50+ styles, 161 color palettes, 57 font pairings, 99 UX guidelines. Run `python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system` for full design system recommendations. Also contains a priority-ordered accessibility/touch/performance/animation checklist and a pre-delivery verification matrix.
- `stitch-design-taste` — generates `DESIGN.md` files encoding visual atmosphere, color palette, typography, component behavior, layout principles, and motion philosophy as a semantic design system document. Use when establishing or refreshing the project's design system spec.
