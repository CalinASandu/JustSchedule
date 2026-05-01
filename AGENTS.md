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

`app/dashboard/schedule/page.tsx` is the schedule server component that fetches the session, validates the `schoolId` query param, redirects admins and professors to `/dashboard/schools/[schoolId]`, and passes the current non-admin membership down. `app/dashboard/schedule/ScheduleClient.tsx` is the client component that owns all interactive schedule state (`handleDateSelect`, `handleReserve`, `handleReset`) plus the URL-backed workspace panel switcher. There is no `/schedule` route; schedule lives at `/dashboard/schedule`.

The student schedule workspace uses a panel switcher above the content, not navbar tabs. The current panels are `Schedule` and `School Profile`; `School Profile` currently shows membership details and a `Leave school` action. Keep school-specific panels in this workspace switcher rather than adding school selectors or school tabs to the global navbar.

`app/dashboard/schools/[schoolId]/page.tsx` is the school management shell for admins and professors. It verifies the signed-in user's `SchoolMembers` row or `Schools.created_by` ownership for the selected school before rendering. Admins can manage members, invites, join requests, and settings; professors can only view the members list.

The schedule UI is split into panels: `CalendarPanel`, `SlotPicker`, `BookingSummaryCard`, `SeatAvailabilityOverview`, and `BookingsPanel`. All live in `components/schedule/`.

Static slot definitions (`9-11`, `11-1`, `2-4:30`) are in `components/schedule/constants.ts`; there is no DB table for them.

### Delete and Leave Flows

School deletion and student leave use normal Supabase database calls guarded by RLS, not Edge Functions. The relevant policies live in `supabase/migrations/20260501140000_school_delete_leave_policies.sql`.

Admins delete schools from the `Settings` tab in `SchoolManagementTabs`. The UI requires typing the exact school name before enabling the delete button. The live foreign keys use `ON DELETE CASCADE` from `Schools` to `SchoolMembers`, `SchoolInvites`, and `JoinRequests`, so deleting a school cleans up those dependent rows.

Admins kick non-admin members from the `Members` tab in `SchoolManagementTabs`. The UI shows a `Kick` button on each non-admin member card, opens a confirmation dialog, and requires a 5-second cooldown before confirmation. Professors can be listed but cannot manage members, and admins must be able to update roles through the staged dropdown plus confirm panel before members are updated.

Students leave schools from the `School Profile` panel in the schedule workspace via `components/dashboard/LeaveSchoolButton.tsx`. The leave flow opens a confirmation dialog and requires a 5-second delay before confirmation. Do not put the leave action on the main school card grid.

### Proxy

`proxy.ts` at the root is a dev proxy that handles cookie/session refresh for Server Components that cannot set cookies themselves due to a `@supabase/ssr` limitation.

### Security Notes

- Use `supabase.auth.getUser()` for server-side auth decisions. `user_metadata` is allowed only for display fallbacks, never authorization.
- Do not expose Supabase service-role keys or private secrets to client components. Public client code may only use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Dashboard authorization depends on Supabase RLS for `Profiles`, `Schools`, `SchoolMembers`, `SchoolInvites`, and `JoinRequests`; frontend filters are not a substitute for policies. The `school_role` enum now includes `admin`, `professor`, and `student`, and member-management policies must match that three-role model.
- Edge Functions that perform privileged writes must first verify the caller with the user's JWT before using service-role access.
- `npm audit` currently reports a moderate PostCSS advisory through `next@16.2.4`; do not run `npm audit fix --force` because npm suggests downgrading Next to `9.3.3`. Re-check after a Next release updates the transitive PostCSS version.

## UI Design System

All visual conventions are documented in `docs/design.md`. Read it before building any UI. Key rules:

- Page background: `#f7f8fa`; card surfaces: `#ffffff` with the `.panel` class. Never recreate this inline.
- Single accent: `#2563eb` blue. Do not introduce other accent colors.
- Font: Geist is already loaded globally. Do not re-import it.
- CSS animation utilities: `anim-fade-in`, `anim-slide-up`, `anim-scale-in`, and stagger delays `anim-d1` through `anim-d4`, all defined in `globals.css`.
- No dark mode.
