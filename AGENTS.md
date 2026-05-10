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
4. The callback checks `public.Profiles` for a non-empty `name`. If missing, redirect to `/login?next=...`. If present, redirect to `next` or `/dashboard`.
5. `/login` (`app/login/page.tsx`) collects the user's real name and writes it to `public.Profiles` via `.update().eq("id", user.id)`, then redirects to the safe `next` path or `/dashboard`.
6. `/` (`app/page.tsx`) checks the cookie-backed Supabase session with `auth.getUser()` and redirects signed-in users to the safe `next` path or `/dashboard`, so logged-in users do not see the landing page.

### Supabase Client Usage

| Context | Import |
|---|---|
| Client components (`"use client"`) | `createClient` from `@/lib/supabase/client`, which uses `createBrowserClient` |
| Server components and route handlers | `createClient` from `@/lib/supabase/server`, which is async and uses `createServerClient` plus cookies |

The env helper at `lib/supabase/env.ts` validates `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Note the publishable key variable name; this differs from standard Supabase setups that use an anon key variable.

### Invites and Join Requests

Admins create invite links from the school management page. Invite creation is handled by the deployed Supabase Edge Function `create-school-invite` (`supabase/functions/create-school-invite/index.ts`) with JWT verification enabled in `supabase/config.toml`. The client calls `supabase.functions.invoke("create-school-invite")` with the signed-in user's access token, `{ schoolId, expiresAt, siteUrl }`, and receives `{ inviteLink }`.

Invite links use `/invite/[inviteToken]`; the old `/dashboard/join/[inviteToken]` route was removed. If unauthenticated, `/invite/[inviteToken]` redirects to `/?next=/invite/[inviteToken]`. Accepting an invite creates a pending `JoinRequests` row; it does not create direct membership.

Admins review pending join requests in the `Join Requests` tab of `components/dashboard/SchoolManagementTabs.tsx`. The list is loaded through `get_school_join_requests_with_profiles`, which returns request id, user id, profile name, email, and request time for school admins. Review submission calls the deployed Supabase Edge Function `review-school-join-requests`, which verifies the caller is an admin, adds approved users to `SchoolMembers` with role `student`, and deletes processed `JoinRequests` rows.

### Schedule Page

`app/dashboard/page.tsx` is the authenticated dashboard overview. It lists the schools the signed-in user belongs to, shows a profile panel, and includes a ghost card with `RegisterSchoolForm` for creating another school. Admin and professor school cards link to `/dashboard/schools/[schoolId]`; student school cards link to `/dashboard/schedule?schoolId=...`.

`app/dashboard/schedule/page.tsx` is the schedule server component that fetches the session, validates the `schoolId` query param, redirects admins and professors to `/dashboard/schools/[schoolId]`, loads active `ExamSlots` plus confirmed school `Reservations` for today through today + 14 days, and passes the current non-admin membership down. `app/dashboard/schedule/ScheduleClient.tsx` is the client component that owns all interactive schedule state (`handleDateSelect`, `handleReserve`, `handleReset`) plus the URL-backed workspace panel switcher. Student names are read from `Profiles`/auth fallback and shown as locked profile data in the reservation form; students must not edit the booking owner name in the schedule form. There is no `/schedule` route; schedule lives at `/dashboard/schedule`.

The student schedule workspace uses a panel switcher above the content, not navbar tabs. The current panels are `Schedule`, `My Reservations`, and `School Profile`; `School Profile` currently shows membership details and a `Leave school` action. Keep school-specific panels in this workspace switcher rather than adding school selectors or school tabs to the global navbar. The `Schedule` panel still includes the broad `BookingsPanel` overview for school reservations; use `My Reservations` for the student's own detailed reservation management and cancellation.

`app/dashboard/schools/[schoolId]/page.tsx` is the school management shell for admins, professors, and exam supervisors. It verifies the signed-in user's `SchoolMembers` row or `Schools.created_by` ownership for the selected active school before rendering. Admins can manage members, invites, join requests, and settings; professors can view members, search the member list, schedule exams for students, and cancel school reservations; exam supervisors can view reservations and use attendance only.

The schedule UI is split into panels: `CalendarPanel`, `SlotPicker`, `BookingSummaryCard`, `SeatAvailabilityOverview`, and `BookingsPanel`. All live in `components/schedule/`. The student schedule UI computes slot availability from database `Reservations`, not local mock booking state.

`ExamSlots` is now the authoritative slot source for active school slots. `components/schedule/constants.ts` only contains fallback/default slot shapes for isolated component compatibility and must not be treated as the scheduling source of truth.

### Reservation Read Model

Admin/professor reservation visibility is implemented in the school dashboard, not the student schedule workspace. `app/dashboard/schools/[schoolId]/page.tsx` loads active `ExamSlots` plus confirmed `Reservations` for the selected school and passes them into `components/dashboard/SchoolManagementTabs.tsx`.

`SchoolManagementTabs` has a `Reservations` tab for admins, professors, and exam supervisors. It renders a day/week reservation panel with previous/next arrows. Day view uses `ExamSlots` as columns and seat rows based on slot `capacity` with a minimum visual height of 8 rows. Week view shows Mon–Fri only (weekends are filtered out since no exams can be scheduled then) as a 5-column grid; each day column shows compact clickable chips — student name and slot start time — and clicking a chip opens a detail modal with exam name, type, slot, time, and an optional cancel button. Admins/professors can cancel any confirmed reservation in their school; exam supervisors cannot cancel reservations.

The current database model is:

| Table | Purpose |
|---|---|
| `ExamSlots` | Reusable per-school slot template: `name`, `starts_at`, `ends_at`, `capacity`, `is_active`. Does not store a date. |
| `Reservations` | Actual bookings: `school_id`, `user_id`, `slot_id`, `reservation_date`, `exam_name`, `exam_type`, `status`. |

`Reservations.slot_id` references `ExamSlots.id`. `Reservations.reservation_date` stores the actual calendar day. The uniqueness rule is date-aware and confirmed-only: one user cannot hold two confirmed reservations for the same slot on the same date, but cancelled historical rows do not block rebooking.

Students can view full confirmed reservations for schools where they are members. The student bookings panel intentionally shows student name, exam name, exam type, reservation date, and slot times for confirmed school reservations, because this read model supports visibility and future swap flows. Students can cancel reservations assigned to them, regardless of whether the booking was created by the student or by an admin/professor.

Relevant migrations:

- `supabase/migrations/20260501181342_reservation_panel_read_model.sql` adds `reservation_date`, the `slot_id` foreign key, the confirmed-reservation lookup index, and read policies for slots/reservations.
- `supabase/migrations/20260501181425_date_aware_reservation_uniqueness.sql` replaces the old `(user_id, slot_id)` uniqueness with `(user_id, slot_id, reservation_date)`.
- `supabase/migrations/20260502202056_reserve_exam_slot.sql` adds member-scoped confirmed reservation listing RPCs and transactional reservation RPCs with a per-school/date/slot advisory transaction lock.
- `supabase/migrations/20260502202249_consolidate_reservation_read_policy.sql` replaces overlapping reservation read policies with one member-scoped confirmed-reservation read policy.
- `supabase/migrations/20260502202326_add_reservations_slot_fk_index.sql` adds the plain `Reservations.slot_id` foreign-key index requested by Supabase advisors.
- `supabase/migrations/20260505144142_cancel_reservations.sql` replaces all-row reservation uniqueness with a confirmed-only unique index and adds the `cancel_reservation` RPC.
- `supabase/migrations/20260508114018_attendance_supervisor_soft_delete.sql` adds school soft delete, the `exam_supervisor` role, attendance fields/session override support, broad admin/professor reservation cancellation, and attendance RPCs.

### Reservation Write Flow

Reservation creation is implemented through the deployed Supabase Edge Function `reserve-exam-slot` (`supabase/functions/reserve-exam-slot/index.ts`) with JWT verification enabled in `supabase/config.toml`. The client calls `supabase.functions.invoke("reserve-exam-slot")` with the signed-in user's access token and `{ schoolId, slotId, reservationDate, examName, examType }`.

Server-side checks are authoritative. The RPC verifies the caller is signed in, is a `student` member of the target school, the slot is active and belongs to that school, the date is today through today + 14 calendar days, the date is not a weekend, the exam type is `midterm` or `final`, and the exam name is non-empty. It locks `school_id + reservation_date + slot_id`, counts confirmed reservations after acquiring the lock, compares that count with `ExamSlots.capacity`, and inserts a confirmed reservation only if capacity remains. Do not trust a frontend-only seat availability check for booking enforcement.

Duplicate rule: one student cannot hold two confirmed reservations for the same slot on the same date, but can book another slot on the same date. Cancelling a reservation changes `Reservations.status` to `cancelled`, which frees both the seat and that student's ability to book the same date/slot again.

Reservation cancellation is implemented through the deployed Supabase Edge Function `cancel-reservation` (`supabase/functions/cancel-reservation/index.ts`) with JWT verification enabled in `supabase/config.toml`. The client calls it with `{ reservationId }`. The RPC allows cancellation when the caller is the reservation's `user_id`, or when the caller is an admin/professor member of the reservation's school. Do not implement cancellation as a direct client-side table update.

### Attendance

Attendance is stored on `Reservations` with `attendance_status`, `attendance_marked_by`, and `attendance_marked_at`. New reservations default to `attendance_status = 'present'`; exam supervisors only change a student to `absent` when the student did not attend.

The `Attendance` tab in `SchoolManagementTabs` is visible to admins, professors, and exam supervisors. Admins/professors have read-only attendance visibility. Only `exam_supervisor` members can mark attendance through the `set_reservation_attendance` RPC. Attendance is slot-scoped: the selected slot determines which reservations are shown.

The attendance UI has a date navigator (prev/next arrows + date label) in the header, a row of clickable slot pill buttons below it (one per active slot, showing name + time range), a status bar showing the current session state and an inline Start button for exam supervisors, and a bordered table of students with present/absent toggle buttons. Read-only viewers see a badge instead of the toggle.

Production timing is enforced server-side: attendance can be marked only from five minutes before the slot start until the slot ends. The `AttendanceSessions` table and `start_attendance_session` RPC let exam supervisors unlock a slot early for testing via the Start button. Remove that table/RPC/button after real timing is verified.

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
- Edge Functions that perform privileged writes must first verify the caller with the user's JWT before using service-role access.
- `npm audit` currently reports a moderate PostCSS advisory through `next@16.2.4`; do not run `npm audit fix --force` because npm suggests downgrading Next to `9.3.3`. Re-check after a Next release updates the transitive PostCSS version.

## Keeping AGENTS.md Current

When making a change, update the relevant section of this file in place — replace outdated information rather than appending. Do not accumulate a changelog. The goal is a compact, always-accurate reference.

## UI Design System

All visual conventions are documented in `docs/design.md`. Read it before building any UI. Key rules:

- Page background: `#f7f8fa`; card surfaces: `#ffffff` with the `.panel` class. Never recreate this inline.
- Single accent: `#2563eb` blue. Do not introduce other accent colors.
- Font: Geist is already loaded globally. Do not re-import it.
- CSS animation utilities: `anim-fade-in`, `anim-slide-up`, `anim-scale-in`, and stagger delays `anim-d1` through `anim-d4`, all defined in `globals.css`.
- No dark mode.

Before UI, React, or Next.js component work, read and follow the relevant installed design and Vercel skills in addition to `docs/design.md`:

- `web-design-guidelines` for UI/accessibility/design review.
- `vercel-react-best-practices` for React and Next.js performance patterns.
- `vercel-composition-patterns` for reusable component architecture.
- `vercel-react-view-transitions` when adding or changing transitions/animations between UI states or routes.
- `build-web-apps:frontend-app-builder` for new app surfaces, dashboards, major redesigns, or visually driven UI work.
