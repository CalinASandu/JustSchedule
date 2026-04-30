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
- `framer-motion` is used only in landing components. Everywhere else, use the CSS animation utilities in `globals.css`.
- shadcn components live in `components/ui/`.

## Architecture

### Auth Flow

1. User clicks Google Sign-In, and `supabase.auth.signInWithOAuth` redirects to Google.
2. Google redirects to `/auth/callback?code=...`, where `app/auth/callback/route.ts` exchanges the code for a session.
3. The callback checks `public.Profiles` for a non-empty `name`. If missing, redirect to `/login`. If present, redirect to `/dashboard`.
4. `/login` (`app/login/page.tsx`) collects the user's real name and writes it to `public.Profiles` via `.update().eq("id", user.id)`, then redirects to `/dashboard`.
5. `/` (`app/page.tsx`) checks the cookie-backed Supabase session with `auth.getUser()` and redirects signed-in users to `/dashboard`, so logged-in users do not see the landing page.

### Supabase Client Usage

| Context | Import |
|---|---|
| Client components (`"use client"`) | `createClient` from `@/lib/supabase/client`, which uses `createBrowserClient` |
| Server components and route handlers | `createClient` from `@/lib/supabase/server`, which is async and uses `createServerClient` plus cookies |

The env helper at `lib/supabase/env.ts` validates `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Note the publishable key variable name; this differs from standard Supabase setups that use an anon key variable.

### Schedule Page

`app/dashboard/page.tsx` is the authenticated dashboard overview. It lists the schools the signed-in user belongs to, shows a profile panel, and includes a ghost card with `RegisterSchoolForm` for creating another school. Admin school cards link to `/dashboard/schools/[schoolId]`; student school cards link to `/dashboard/schedule?schoolId=...`.

`app/dashboard/schedule/page.tsx` is the schedule server component that fetches the session and passes data down. `app/dashboard/schedule/ScheduleClient.tsx` is the client component that owns all interactive state (`handleDateSelect`, `handleReserve`, `handleReset`). There is no `/schedule` route; schedule lives at `/dashboard/schedule`.

`app/dashboard/schools/[schoolId]/page.tsx` is the admin-only school dashboard shell. It verifies the signed-in user's `SchoolMembers` row for the selected school before rendering and redirects non-admin members to `/dashboard/schedule?schoolId=...`.

The schedule UI is split into panels: `CalendarPanel`, `SlotPicker`, `BookingSummaryCard`, `SeatAvailabilityOverview`, and `BookingsPanel`. All live in `components/schedule/`.

Static slot definitions (`9-11`, `11-1`, `2-4:30`) are in `components/schedule/constants.ts`; there is no DB table for them.

### Proxy

`proxy.ts` at the root is a dev proxy that handles cookie/session refresh for Server Components that cannot set cookies themselves due to a `@supabase/ssr` limitation.

### Security Notes

- Use `supabase.auth.getUser()` for server-side auth decisions. `user_metadata` is allowed only for display fallbacks, never authorization.
- Do not expose Supabase service-role keys or private secrets to client components. Public client code may only use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Dashboard authorization depends on Supabase RLS for `Profiles`, `Schools`, and `SchoolMembers`; frontend filters are not a substitute for policies.
- `npm audit` currently reports a moderate PostCSS advisory through `next@16.2.4`; do not run `npm audit fix --force` because npm suggests downgrading Next to `9.3.3`. Re-check after a Next release updates the transitive PostCSS version.

## UI Design System

All visual conventions are documented in `docs/design.md`. Read it before building any UI. Key rules:

- Page background: `#f7f8fa`; card surfaces: `#ffffff` with the `.panel` class. Never recreate this inline.
- Single accent: `#2563eb` blue. Do not introduce other accent colors.
- Font: Geist is already loaded globally. Do not re-import it.
- CSS animation utilities: `anim-fade-in`, `anim-slide-up`, `anim-scale-in`, and stagger delays `anim-d1` through `anim-d4`, all defined in `globals.css`.
- No dark mode.
