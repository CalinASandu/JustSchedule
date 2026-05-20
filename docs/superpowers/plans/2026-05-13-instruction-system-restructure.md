# Instruction System Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the repository's AI instruction system so AGENTS.md contains only invariants/constraints, docs/ contains modular reasoning files, and CLAUDE.md is a thin wrapper.

**Architecture:** Extract content from the monolithic AGENTS.md into purpose-specific docs/ files (architecture.md, security.md, workflows.md, ui.md, decisions.md), then compact AGENTS.md to ~60 lines of invariants only. CLAUDE.md becomes @AGENTS.md + @graph + commands block.

**Tech Stack:** Markdown files only — no code changes, no migrations, no dependencies.

---

### Task 1: Create docs/notes/ and relocate the notes file

**Files:**
- Create: `docs/notes/` (directory)
- Move: `docs/free-database-backup-and-recovery.md` → `docs/notes/free-database-backup-and-recovery.md`

- [ ] **Step 1: Read the file to confirm content before moving**

Run: `cat docs/free-database-backup-and-recovery.md`

Confirm it reads cleanly. Do not modify its content.

- [ ] **Step 2: Read the file using the Read tool so it's in context for the Write**

Read `docs/free-database-backup-and-recovery.md` fully.

- [ ] **Step 3: Write it to the new location**

Write the file content (unchanged) to `docs/notes/free-database-backup-and-recovery.md`.

- [ ] **Step 4: Delete the original**

```bash
Remove-Item docs\free-database-backup-and-recovery.md
```

- [ ] **Step 5: Verify**

```bash
ls docs\notes\
```

Expected: `free-database-backup-and-recovery.md` appears.

---

### Task 2: Delete outdated docs

**Files:**
- Delete: `docs/system-design.md`
- Delete: `docs/plan.md`

- [ ] **Step 1: Delete both files**

```bash
Remove-Item docs\system-design.md
Remove-Item docs\plan.md
```

- [ ] **Step 2: Verify**

```bash
ls docs\
```

Expected: neither `system-design.md` nor `plan.md` appears.

---

### Task 3: Create docs/ui.md (rename from design.md)

`docs/design.md` is renamed to `docs/ui.md`. The Supabase Client Usage section at the bottom of design.md is removed (it belongs in architecture.md, not the UI doc). All other content is preserved exactly.

**Files:**
- Create: `docs/ui.md`
- Delete: `docs/design.md`

- [ ] **Step 1: Write docs/ui.md**

Write the following content to `docs/ui.md`:

```markdown
# JustSchedule — UI Design Reference

Use this document before building any new UI in this project. All new pages and components must follow these conventions exactly.

---

## Aesthetic Direction

Clean, professional, light-mode SaaS. Think: Notion × Linear × Vercel dashboard. Restrained whitespace, one dominant blue accent, no gradients on core surfaces. Everything feels precise and fast. Dark mode is **not implemented** — build only light-mode.

---

## Color Palette

| Token | Value | Usage |
|---|---|---|
| Page background | `#f7f8fa` | Every page body |
| Surface / card | `#ffffff` | Panels, modals, inputs |
| Border | `#e4e8ef` | Cards, dividers, input borders, navbar bottom |
| Border (interactive) | `#e2e8f0` | SlotCard default border |
| Text primary | `#111827` | Headings, body |
| Text secondary | `#374151` | Labels |
| Text muted | `#6b7280` | Sub-labels, descriptions |
| Text placeholder | `#9ca3af` | Input placeholders, footer notes |
| Text faint | `#94a3b8` | Section labels (e.g. "TIME SLOT") |
| Blue primary | `#2563eb` | Buttons, avatar bg, logo mark, active borders |
| Blue hover | `#1d4ed8` | Button hover |
| Blue focus ring | `rgba(59,130,246,0.12)` | Input box-shadow on focus |
| Blue badge bg | `#dbeafe` | Available seat badge |
| Blue badge text | `#1d4ed8` | Available seat text |
| Blue muted | `#93c5fd` | Disabled button fill |
| Warning badge bg | `#fef3c7` | Low-availability badge |
| Warning badge text | `#b45309` | Low-availability text |
| Neutral badge bg | `#e2e8f0` | Full / disabled badge |
| Neutral badge text | `#94a3b8` | Full / disabled text |
| Error text | `#dc2626` | Inline error messages |
| Error bg | `#fef2f2` | Error banner background |
| Error border | `#fecaca` | Error banner border |

---

## Typography

Font: **Geist** (loaded via `next/font/google`, variable `--font-geist`). Already applied globally — do not import again.

| Role | Size | Weight | Color | Notes |
|---|---|---|---|---|
| Page heading (h1) | `1.35rem` | 700 | `#111827` | letter-spacing: `-0.025em`, line-height: 1.25 |
| Section heading | `0.9375rem` | 600 | `#111827` | letter-spacing: `-0.01em` |
| Body / description | `0.875rem` | 400 | `#6b7280` | line-height: 1.5 |
| Label | `0.8125rem` | 500 | `#374151` | |
| Small muted | `0.78rem` | 400 | `#9ca3af` | Footer notes |
| Navbar brand | `15px` | 600 | `#111827` | |
| Badge / slot meta | `11px` | 500 | `#94a3b8` | uppercase |
| Input value | `0.9375rem` | 400 | `#111827` | |

---

## Spacing & Sizing

- Page padding: `1.5rem` on all sides
- Card padding: `2rem`
- Navbar height: `h-14` (56px)
- Standard gap between stacked items: `1rem`
- Gap between heading and description: `0.4rem`
- Heading block bottom margin: `1.75rem`

---

## Border Radius

| Component | Radius |
|---|---|
| Panel / card | `18px` |
| Input | `10px` |
| Button | `10px` |
| Logo mark / avatar | `8px` (logo mark), `rounded-full` (avatar) |
| Navbar utility buttons | `rounded-xl` (12px) |
| SlotCard | `rounded-xl` (12px) |
| Badge / pill | `rounded-full` |
| Error banner | `8px` |

---

## Panel (Card Surface)

Use the `.panel` CSS class for all card surfaces:

```css
/* already in globals.css */
.panel {
  background: #ffffff;
  border: 1px solid #e4e8ef;
  border-radius: 18px;
}
```

Never recreate this inline. Always use `className="panel"`.

---

## Logo Mark

Blue `#2563eb` rounded square (`8px` radius), `30–32px` side. Contains a white calendar-grid or schedule icon. Always sits left of the "JustSchedule" wordmark.

```tsx
<div style={{ width: 30, height: 30, borderRadius: 8, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  {/* schedule icon SVG, white strokes/fills */}
</div>
<span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827', letterSpacing: '-0.01em' }}>
  JustSchedule
</span>
```

---

## Navbar

```
height: h-14 (56px)
background: white
border-bottom: 1px solid #e4e8ef
position: sticky top-0 z-30
padding: px-6
```

Layout: logo left → `flex-1` spacer → utility buttons right (institution selector, bell, sign-out, avatar).

Utility buttons: `rounded-xl`, `border: 1px solid #e4e8ef`, `hover:bg-slate-50`.
Avatar: `w-8 h-8 rounded-full bg-[#2563eb]` showing 2-letter initials in white `text-[11px] font-semibold`.

---

## Buttons

### Primary (blue CTA)

```
height: 2.625rem
border-radius: 10px
background: #2563eb  →  hover: #1d4ed8  →  disabled: #93c5fd
color: white
font-weight: 600
font-size: 0.9375rem
box-shadow: 0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)
cursor: not-allowed when disabled
transform: scale(0.985) on mousedown
```

### Secondary / outline (utility)

```
border: 1px solid #e4e8ef
border-radius: rounded-xl
background: white  →  hover: bg-slate-50
color: #6b7280
padding: px-3 py-1.5
```

---

## Inputs

```
height: 2.625rem
border-radius: 10px
border: 1.5px solid #e4e8ef  →  focus: #3b82f6 + box-shadow: 0 0 0 3px rgba(59,130,246,0.12)
background: #ffffff
padding: 0 0.875rem
font-size: 0.9375rem
color: #111827
outline: none
```

Always use `onFocus`/`onBlur` handlers to apply the focus ring — Tailwind focus utilities don't handle the combined border + ring we use here.

---

## Badges / Pills

Three states used in SlotCard and similar:

```tsx
// Available
className="rounded-full px-3 py-1 text-sm font-semibold bg-[#DBEAFE] text-[#1D4ED8]"

// Low availability (≤ 2)
className="rounded-full px-3 py-1 text-sm font-semibold bg-[#FEF3C7] text-[#B45309]"

// Full / disabled
className="rounded-full px-3 py-1 text-sm font-semibold bg-[#E2E8F0] text-[#94A3B8]"
```

---

## Animations

All keyframes and utility classes are defined in `globals.css`. Use the classes, never recreate them inline.

| Class | Effect | Duration |
|---|---|---|
| `anim-fade-in` | opacity 0 → 1 | 200ms ease-out |
| `anim-slide-up` | opacity + translateY(10px) → normal | 300ms cubic-bezier |
| `anim-slide-right` | opacity + translateX(14px) → normal | 300ms cubic-bezier |
| `anim-scale-in` | opacity + scale(0.97) → normal | 200ms cubic-bezier |
| `anim-success` | scale bounce | 400ms cubic-bezier |

Stagger delays: `anim-d1` (60ms) → `anim-d2` (110ms) → `anim-d3` (160ms) → `anim-d4` (210ms).

**Pattern for page entry:** wrap the outer container in `anim-slide-up`, then apply `anim-d1` / `anim-d2` to inner card and sub-elements.

**Spinner (loading state):** use the `swapSpin` keyframe (already in globals.css) — `animation: swapSpin 0.7s linear infinite`.

For the landing/hero: `framer-motion` is used (`motion.button`, `whileHover`, `whileTap`). For all other UI, prefer CSS-only animations via the globals.css utilities.

---

## Page Layout Pattern (full-page centered forms)

Used for `/login` and any onboarding-style pages:

```tsx
// Outer wrapper
minHeight: "100vh"
background: "#f7f8fa"
display: flex, alignItems: center, justifyContent: center
padding: "1.5rem"

// Subtle grid overlay (atmospheric, not structural)
position: fixed, inset: 0
backgroundImage: "linear-gradient(#e4e8ef 1px, transparent 1px), linear-gradient(90deg, #e4e8ef 1px, transparent 1px)"
backgroundSize: "40px 40px"
opacity: 0.35
pointerEvents: none

// Content column
width: "100%", maxWidth: 420
```

Above the card: logo mark + wordmark centered, `marginBottom: "1.75rem"`.
Below the card: small muted footnote centered, `marginTop: "1.25rem"`, color `#9ca3af`, `0.78rem`.

---

## Dashboard Layout Pattern

Used for `/schedule` and other app pages:

```
Sticky navbar (h-14) at top
Page background: #f7f8fa
Content: padded container with .schedule-main-grid and .schedule-bottom-grid (defined in globals.css)
All data panels use .panel class
```

Grid breakpoint: `1024px` — stacks to single-column below, 3-column above for main grid.

---

## Error State

Inline red banner, shown below the input it relates to:

```tsx
<p style={{
  fontSize: "0.8125rem",
  color: "#dc2626",
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: 8,
  padding: "0.5rem 0.75rem",
}}>
  {error}
</p>
```

Wrap in `className="anim-fade-in"` so it appears smoothly.

---

## Don'ts

- No dark mode — build light only.
- No gradients on backgrounds or cards (grid overlay is the only atmospheric effect).
- No Inter, Roboto, or system fonts — Geist is already loaded globally.
- No purple accents — blue (`#2563eb`) is the sole accent color.
- No Tailwind `shadow-*` utilities on panels — the `.panel` border is the only elevation signal.
- Do not recreate `.panel` inline — always use the class.
- Do not add animation durations longer than 400ms for UI transitions.
```

- [ ] **Step 2: Delete docs/design.md**

```bash
Remove-Item docs\design.md
```

- [ ] **Step 3: Verify**

```bash
ls docs\
```

Expected: `ui.md` present, `design.md` absent.

---

### Task 4: Create docs/architecture.md

Extracts all flow and model documentation from AGENTS.md. Does not duplicate graph topology. Omits migration history lists (those are in git history).

**Files:**
- Create: `docs/architecture.md`

- [ ] **Step 1: Write docs/architecture.md**

```markdown
# JustSchedule — Architecture

## Supabase Client Usage

| Context | Import |
|---|---|
| Client components (`"use client"`) | `createClient` from `@/lib/supabase/client` — uses `createBrowserClient` |
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

Admins create invite links from the school management page. Invite creation calls the Edge Function `create-school-invite` with `{ schoolId, expiresAt, siteUrl }`, receiving `{ inviteLink }`.

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

| Table | Purpose |
|---|---|
| `ExamSlots` | Per-school slot template: `name`, `starts_at`, `ends_at`, `capacity`, `is_active`. No date stored. |
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
```

- [ ] **Step 2: Verify file exists and is readable**

```bash
Get-Content docs\architecture.md | Select-Object -First 5
```

Expected: `# JustSchedule — Architecture` on line 1.

---

### Task 5: Create docs/security.md

**Files:**
- Create: `docs/security.md`

- [ ] **Step 1: Write docs/security.md**

```markdown
# JustSchedule — Security

## Auth Rules

Use `supabase.auth.getUser()` for all server-side auth decisions. Never use `auth.getSession()` for authorization on the server — it trusts the client-provided JWT without re-verification.

`user_metadata` is allowed for display fallbacks only (e.g. showing an avatar name). Never use it for authorization decisions.

## RLS

Authorization depends on Supabase RLS for: `Profiles`, `Schools`, `SchoolMembers`, `SchoolInvites`, `JoinRequests`, `ExamSlots`, `Reservations`.

Frontend filters are not a substitute for RLS policies. Every write path must be covered by a policy or an Edge Function that verifies the caller.

The `school_role` enum: `admin`, `professor`, `exam_supervisor`, `student`. Member-management policies must cover all four roles.

## Secrets

- Public client code may only use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Never expose the Supabase service-role key in client components or public env vars.
- Edge Functions that perform privileged writes must verify the caller's JWT before using service-role access.

## Edge Functions

All privileged writes go through Edge Functions with JWT verification enabled in `supabase/config.toml`. Clients call `supabase.functions.invoke()` with the user's access token. The function verifies identity server-side before using service-role access.

Current privileged Edge Functions: `create-school-invite`, `review-school-join-requests`, `reserve-exam-slot`, `cancel-reservation`.

## Known Advisory

`npm audit` reports a moderate PostCSS advisory through `next@16.2.4`. Do not run `npm audit fix --force` — npm suggests downgrading Next.js to 9.3.3. Re-check after a Next.js release updates the transitive PostCSS version.
```

- [ ] **Step 2: Verify**

```bash
Get-Content docs\security.md | Select-Object -First 3
```

Expected: `# JustSchedule — Security` on line 1.

---

### Task 6: Create docs/workflows.md

**Files:**
- Create: `docs/workflows.md`

- [ ] **Step 1: Write docs/workflows.md**

```markdown
# JustSchedule — Workflows

## Commands

```bash
npm run dev       # start dev server (localhost:3000)
npm run build     # production build
npm run lint      # ESLint
graphify update . # refresh code graph after substantial architectural changes
```

No test suite exists yet.

## Git Rules

- Branch pattern: `{name}-dev` (e.g. `calin-dev`, `matei-dev`, `ilie-dev`, `andrew-dev`). Check with `git branch --show-current`. If no `*-dev` branch exists, ask the user for their name before creating one.
- Never commit or push to `main`.
- Open a PR to `main` only when the user explicitly asks.
- No `Co-Authored-By` trailers in commit messages. Commits must appear as the human author only.

## Graph Updates

Run `graphify update .` after substantial architectural changes (new subsystems, major file moves, large refactors). Do not run on every task — only when the graph would be meaningfully stale.

The graph is the primary structural navigation tool. Read `graphify-out/GRAPH_REPORT.md` before reading implementation files. Consult graph relationships to identify relevant files, then read only those.

## Edge Functions

Edge Function source lives in `supabase/functions/`. `supabase/config.toml` and `supabase/migrations/` are repo source and must be versioned.

Deploy a function:
```bash
supabase functions deploy <function-name>
```

JWT verification is enabled for all privileged functions in `supabase/config.toml`. Do not disable it.
```

- [ ] **Step 2: Verify**

```bash
Get-Content docs\workflows.md | Select-Object -First 3
```

Expected: `# JustSchedule — Workflows` on line 1.

---

### Task 7: Create docs/decisions.md

**Files:**
- Create: `docs/decisions.md`

- [ ] **Step 1: Write docs/decisions.md**

```markdown
# JustSchedule — Architecture Decisions

## Soft Delete for Schools

Schools use soft delete (`soft_delete_school` RPC) rather than hard delete. Dependent rows (SchoolMembers, Reservations, ExamSlots) are preserved for audit and history — hard delete would cascade-destroy student booking records. Active school queries filter `deleted_at is null`.

## AttendanceSessions Is Temporary

The `AttendanceSessions` table, `start_attendance_session` RPC, and the Start button in the attendance UI are temporary testing aids. They let exam supervisors override the attendance timing window during development and testing. Once production timing is verified (attendance window: 5 min before → 25 min after slot start), remove the table, RPC, and Start button from the codebase.

## constants.ts Is Fallback Only

`components/schedule/constants.ts` contains static slot definitions from the MVP. It is kept only for isolated component compatibility (rendering components without a DB connection). `ExamSlots` is the authoritative slot source for all scheduling logic. Do not add new slots to `constants.ts` or use it in scheduling paths.

## Slot Times Are Wall-Clock, Not UTC

`ExamSlots.starts_at` and `ends_at` are stored as `time without time zone` representing local wall-clock time (Europe/Bucharest by default). If stored as UTC, a slot at 11:00 AM local would be treated as 11:00 UTC — making the attendance window 3 hours off. The RPC converts using `(date + time) AT TIME ZONE Schools.timezone`. New slots must continue to use wall-clock storage.
```

- [ ] **Step 2: Verify**

```bash
Get-Content docs\decisions.md | Select-Object -First 3
```

Expected: `# JustSchedule — Architecture Decisions` on line 1.

---

### Task 8: Rewrite AGENTS.md (compact)

Replace the full monolithic AGENTS.md with the compact invariants-only version. All flow detail now lives in docs/. This file must stay under 80 lines.

**Files:**
- Modify: `AGENTS.md` (full rewrite)

- [ ] **Step 1: Write the compact AGENTS.md**

```markdown
# JustSchedule — Agent Constitution

## Mandatory Reads

Before touching any subsystem, consult the graph, then the relevant doc:

- Structural navigation: `graphify-out/GRAPH_REPORT.md`
- Architecture and flows: `docs/architecture.md`
- Security and auth rules: `docs/security.md`
- Dev/deploy workflows: `docs/workflows.md`
- UI system: `docs/ui.md`
- Key decisions: `docs/decisions.md`

## Stack

- **Next.js 16** App Router with React 19. Breaking changes — read `node_modules/next/dist/docs/` before using any routing, data-fetching, or middleware API.
- **Tailwind CSS 4** — config in `tailwind.config` / `postcss.config.mjs`. The v4 API differs from v3.
- **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`) for auth and database. Edge Functions in `supabase/functions/`.
- **framer-motion** in landing components only. Everywhere else use CSS utilities in `globals.css`.
- **shadcn** components in `components/ui/`.

## Graph-First

Consult the graph before reading code files. Use graph relationships to identify relevant files. Run `graphify update .` after major architectural refactors — not on every task.

## Critical Invariants

- Reservations are authoritative server-side only. Do not write to Reservations from client components.
- ExamSlots is the source of truth for slot definitions.
- `components/schedule/constants.ts` is fallback only — not the scheduling source of truth.
- Authorization through RLS and Edge Function JWT verification only. No client-side guards.
- `supabase.auth.getUser()` for server-side auth decisions. `user_metadata` for display fallbacks only.
- Slot times are local wall-clock (`time without time zone`). Convert to UTC via `school_timezone` from `Schools`.
- Attendance window is server-enforced: 5 min before slot start through 25 min after slot start.
- `AttendanceSessions`, `start_attendance_session`, and the Start button are temporary testing aids. Remove after production timing is verified.
- School deletion is soft delete via `soft_delete_school` RPC. Active queries must filter `deleted_at is null`.
- Edge Functions perform all privileged writes. Clients call `supabase.functions.invoke()` only.

## Forbidden

- Client-side table writes for reservations, cancellations, or attendance.
- Service-role key in client components or public env vars.
- `npm audit fix --force` — downgrades Next.js to 9.3.3.
- Co-author trailers in commit messages. Pushing to `main`.
- Duplicating architectural truths across docs. Each fact lives in one place.
- Appending "UPDATE YYYY" style edits. Rewrite in place.

## Git

- Branch pattern: `{name}-dev` (e.g. `calin-dev`). Check with `git branch --show-current`.
- Never commit or push to `main`. PR to `main` only when user explicitly asks.
- No `Co-Authored-By` trailers in commit messages.

## Maintenance

Replace outdated information rather than appending. Rewrite sections atomically. Keep this file under 80 lines. Move deep explanations to `docs/`.
```

- [ ] **Step 2: Count lines to confirm under 80**

```bash
(Get-Content AGENTS.md | Measure-Object -Line).Lines
```

Expected: number less than 80.

---

### Task 9: Rewrite CLAUDE.md (thin wrapper)

Replace the full CLAUDE.md with a minimal file that imports AGENTS.md and the graph report, plus a commands block.

**Files:**
- Modify: `CLAUDE.md` (full rewrite)

- [ ] **Step 1: Write the thin CLAUDE.md**

```markdown
# CLAUDE.md

@AGENTS.md
@graphify-out/GRAPH_REPORT.md

## Commands

```bash
npm run dev       # start dev server (localhost:3000)
npm run build     # production build
npm run lint      # ESLint
graphify update . # refresh code graph after substantial edits
```
```

- [ ] **Step 2: Verify the file has the @imports**

```bash
Get-Content CLAUDE.md
```

Expected: `@AGENTS.md` and `@graphify-out/GRAPH_REPORT.md` both appear.

---

### Task 10: Commit

- [ ] **Step 1: Stage all changes**

```bash
git add AGENTS.md CLAUDE.md docs/architecture.md docs/security.md docs/workflows.md docs/ui.md docs/decisions.md docs/notes/free-database-backup-and-recovery.md
git add -u docs/design.md docs/system-design.md docs/plan.md docs/free-database-backup-and-recovery.md
```

- [ ] **Step 2: Verify staged changes**

```bash
git status
```

Expected: AGENTS.md, CLAUDE.md, and all docs/ files show as modified/added/deleted.

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
refactor: modular AI instruction system — compact AGENTS.md, extract docs/

AGENTS.md reduced to invariants/constraints (~70 lines). Content moved to:
- docs/architecture.md (flows, data models, proxy)
- docs/security.md (RLS, auth rules, secrets)
- docs/workflows.md (commands, git rules, graph updates)
- docs/ui.md (renamed from design.md, content preserved)
- docs/decisions.md (ADR-style: soft delete, wall-clock times, constants.ts)
- docs/notes/ (personal reference files, untouched)

CLAUDE.md is now a thin wrapper: @AGENTS.md + @graph + commands.
Deleted outdated docs: system-design.md, plan.md.
EOF
)"
```

- [ ] **Step 4: Verify commit**

```bash
git log --oneline -1
```

Expected: commit message starts with `refactor: modular AI instruction system`.
