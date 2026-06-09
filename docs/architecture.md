# JustSchedule — Architecture

## Supabase Client Usage

| Context                              | Import                                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------- |
| Client components (`"use client"`)   | `createClient` from `@/lib/supabase/client` — uses `createBrowserClient`                 |
| Server components and route handlers | `createClient` from `@/lib/supabase/server` — async, uses `createServerClient` + cookies |

The env helper at `lib/supabase/env.ts` validates `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Note: publishable key, not anon key — different variable name from standard Supabase setups.

---

## Auth Flow

1. User clicks Google Sign-In → `supabase.auth.signInWithOAuth` redirects to Google.
2. Google redirects to `/auth/callback?code=...` → `app/auth/callback/route.ts` exchanges the code for a session.
3. OAuth and landing-page redirects preserve a safe relative `next` path, including invite links like `/invite/[inviteToken]`.
4. Callback checks `public.Profiles` for a non-empty `name`. Missing → redirect to `/login?next=...`. Present → redirect to `next` or `/dashboard`.
5. `/login` collects the user's real name, writes to `public.Profiles` via `.update().eq("id", user.id)`, then redirects to `next` or `/dashboard`.
6. `/` checks the cookie-backed session with `auth.getUser()` and redirects signed-in users — they never see the landing page.

---

## Invites and Join Requests

Admins create invite links from `Settings > Invites` on the school management page. Invite creation calls the Edge Function `create-school-invite` with `{ schoolId, expiresAt, siteUrl }`, receiving `{ inviteLink }`. Invites should stay inside Settings rather than returning as a top-level dashboard tab.

Invite links use `/invite/[inviteToken]`. Unauthenticated visitors redirect to `/?next=/invite/[inviteToken]`. Accepting an invite creates a pending `JoinRequests` row — it does not create direct membership.

Admins review pending join requests in the `Join Requests` tab of `SchoolManagementTabs`. The list loads through `get_school_join_requests_with_profiles` (returns request id, user id, profile name, email, request time for school admins). Review calls the Edge Function `review-school-join-requests`, which verifies the caller is an admin, adds approved users to `SchoolMembers` with role `student`, and deletes processed `JoinRequests` rows.

---

## Schedule Page

`app/dashboard/page.tsx` is the authenticated dashboard overview. It lists the schools the signed-in user belongs to and includes a ghost card with `RegisterSchoolForm`. Admin and professor school cards link to `/dashboard/schools/[schoolId]`; student school cards link to `/dashboard/schedule?schoolId=...`.

`app/dashboard/schedule/page.tsx` fetches the session, validates `schoolId`, redirects admins and professors to `/dashboard/schools/[schoolId]`, and loads active `ExamSlots` plus confirmed school `Reservations` for today through today + 14 days. `ScheduleClient.tsx` owns all interactive schedule state and the URL-backed workspace panel switcher.

The student schedule workspace uses a panel switcher above the content, not navbar tabs. Current panels: `Schedule`, `My Reservations`, `School Profile`. Keep school-specific panels in this workspace switcher — do not add school selectors or tabs to the global navbar.

The schedule UI panels (`CalendarPanel`, `SlotPicker`, `BookingSummaryCard`, `SeatAvailabilityOverview`, `BookingsPanel`) all live in `components/schedule/`. Slot availability is computed from database `Reservations`, not local state.

---

## School Management Shell

`app/dashboard/schools/[schoolId]/page.tsx` verifies the signed-in user's `SchoolMembers` row or `Schools.created_by` ownership before rendering.

- **Admins:** manage members, invites, join requests, and settings.
- **Professors:** view members, search member list, schedule exams for students, cancel school reservations.
- **Exam supervisors:** view reservations and use attendance only.

---

## Reservation Data Model

| Table          | Purpose                                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| `ExamSlots`    | Per-school slot template: `name`, `starts_at`, `ends_at`, `capacity`, `is_active`. No date stored.          |
| `Reservations` | Actual bookings: `school_id`, `user_id`, `slot_id`, `reservation_date`, `exam_name`, `exam_type`, `status`. |

`Reservations.slot_id` references `ExamSlots.id`. `Reservations.reservation_date` is the calendar day. Uniqueness: one confirmed reservation per `(user_id, slot_id, reservation_date)`. Cancelled rows do not block rebooking.

The `Reservations` tab in `SchoolManagementTabs` renders a day/week panel. Day view: `ExamSlots` as columns, seat rows from slot `capacity` (minimum 8 rows visual). Week view: Mon–Fri only, compact clickable chips per day, click opens a detail modal with exam name, type, slot, time, and optional cancel button. Admins/professors can cancel any confirmed reservation; exam supervisors cannot.

Students can view all confirmed school reservations and can cancel reservations assigned to them, regardless of whether the booking was created by the student or by an admin/professor.

---

## Reservation Write Flow

Reservation creation calls Edge Function `reserve-exam-slot` with `{ schoolId, slotId, reservationDate, examName, examType }`.

Server-side checks: caller is signed in and is a `student` member, slot is active and belongs to the school, date is today through today + 14 calendar days, date is not a weekend, exam type is `midterm` or `final`, exam name is non-empty. Acquires advisory lock on `(school_id, reservation_date, slot_id)`, counts confirmed reservations after locking, inserts only if capacity remains.

Duplicate rule: one student cannot hold two confirmed reservations for the same slot on the same date, but can book a different slot on the same date.

Reservation cancellation calls Edge Function `cancel-reservation` with `{ reservationId }`. Allows cancellation when the caller is the reservation's `user_id`, or when the caller is an admin/professor of the reservation's school.

---

## Attendance

Attendance is stored on `Reservations`: `attendance_status`, `attendance_marked_by`, `attendance_marked_at`. New reservations default to `attendance_status = 'present'`. Exam supervisors change a student to `absent` only when the student did not attend.

The `Attendance` tab in `SchoolManagementTabs` is visible to admins, professors, and exam supervisors. Admins/professors have read-only visibility. Only `exam_supervisor` members can mark attendance through the `set_reservation_attendance` RPC.

Attendance UI layout: date navigator header → slot pill buttons (one per active slot, name + time range) → status bar showing session state + Start button (exam supervisors only) → student table with present/absent toggles. Read-only viewers see a badge instead of toggles.

Production timing is enforced server-side: 5 minutes before slot start through 25 minutes after slot start. The attendance UI mirrors this — toggles are disabled outside the window, status bar shows "Opens at …", "Open until …", or "Closed".

The `AttendanceSessions` table and `start_attendance_session` RPC let exam supervisors override the timing window during testing. Both are temporary — remove after production timing is verified. See `decisions.md`.

Slot times (`starts_at`, `ends_at`) are `time without time zone` (local wall-clock). The RPC converts to UTC using `(date + time) AT TIME ZONE school_timezone` where `school_timezone` comes from `Schools.timezone` (default `'Europe/Bucharest'`). See `decisions.md`.

---

## Delete and Leave Flows

School deletion is soft delete via `soft_delete_school` RPC. Sets `Schools.deleted_at` and `Schools.deleted_by`; dependent rows are preserved for audit. Active school queries filter `deleted_at is null`. The UI requires typing the exact school name before enabling delete.

Admins kick non-admin members from the `Members` tab. Kick button → confirmation dialog with 5-second cooldown. Admins update roles through a staged dropdown + confirm panel.

Students leave from the `School Profile` panel in the schedule workspace via `components/dashboard/LeaveSchoolButton.tsx`. Confirmation dialog with 5-second delay. Do not put the leave action on the main school card grid.

---

## Proxy

`proxy.ts` at the root handles Supabase SSR cookie/session refresh. It is not an authorization layer — do not move auth decisions into it.

Flow for a normal request like `/dashboard`:

1. Browser sends request with existing Supabase auth cookies.
2. `proxy.ts` matcher fires. Static assets, images, and favicon are skipped.
3. Proxy creates `NextResponse.next({ request })` and a `createServerClient` from request cookies.
4. `await supabase.auth.getClaims()` inspects the session. If valid, continues unchanged. If stale but refreshable, Supabase refreshes.
5. On refresh, `setAll()` updates both `request.cookies` (so the Server Component sees the fresh session in the same request) and `response.cookies` (so the browser stores the refresh).
6. The real route renders. For `/dashboard`, `app/dashboard/page.tsx` calls `auth.getUser()` — if no user, redirects to `/`.

`lib/supabase/server.ts` still catches cookie writes because Server Components cannot always set cookies themselves; `proxy.ts` is where cookie refresh writes are reliable.
