# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Understanding the Codebase

**Do not read files to explore the architecture.** A knowledge graph has already been built. Read it instead:

```
graphify-out/GRAPH_REPORT.md   ← architecture summary, god nodes, community map
graphify-out/graph.json        ← full graph data (queryable)
```

If the graph feels stale after major refactors, run `/graphify .` to rebuild it — but do **not** do this on every task.

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run lint     # ESLint
```

No test suite exists yet.

## Git Rules

- **Never commit or push to `main`.**
- Work on the current user's branch, which follows the pattern `{name}-dev` (e.g. `calin-dev`, `matei-dev`, `ilie-dev`, `andrew-dev`). Check which branch is active with `git branch --show-current` and use that. If no `*-dev` branch exists yet, ask the user what their name is before creating one.
- **Do not add Claude as a co-author** in commit messages. Commits must appear as the human author only — omit any `Co-Authored-By` trailer.
- Open a PR to `main` only when the user explicitly asks.

## Stack

- **Next.js 16** App Router (React 19). This version has breaking changes — check `node_modules/next/dist/docs/` before using any routing, data-fetching, or middleware API.
- **Tailwind CSS 4** — config is in `tailwind.config` / `postcss.config.mjs`. The v4 API differs from v3.
- **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`) for auth and database.
- **framer-motion** used only in landing components. Everywhere else use the CSS animation utilities in `globals.css`.
- **shadcn** components live in `components/ui/`.

## Architecture

### Auth Flow

1. User clicks Google Sign-In → `supabase.auth.signInWithOAuth` redirects to Google.
2. Google redirects to `/auth/callback?code=...` → `app/auth/callback/route.ts` exchanges the code for a session.
3. Callback checks `public.Profiles` for a non-empty `name`. If missing → redirect to `/login`. If present → redirect to `/schedule`.
4. `/login` (`app/login/page.tsx`) collects the user's real name and writes it to `public.Profiles` via `.update().eq("id", user.id)`, then redirects to `/schedule`.

### Supabase Client Usage

| Context | Import |
|---|---|
| Client components (`"use client"`) | `createClient` from `@/lib/supabase/client` — uses `createBrowserClient` |
| Server components & route handlers | `createClient` from `@/lib/supabase/server` — async, uses `createServerClient` + cookies |

The env helper at `lib/supabase/env.ts` validates `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (note: publishable key, not anon key — different variable name from standard Supabase setups).

### Schedule Page

`app/schedule/page.tsx` is a **server component** that fetches the session and passes data down.
`app/schedule/ScheduleClient.tsx` is the **client component** that owns all interactive state (`handleDateSelect`, `handleReserve`, `handleReset`).

The schedule UI is split into panels: `CalendarPanel` → `SlotPicker` → `BookingSummaryCard` → `SeatAvailabilityOverview` → `BookingsPanel`. All live in `components/schedule/`.

Static slot definitions (`9-11`, `11-1`, `2-4:30`) are in `components/schedule/constants.ts` — no DB table.

### Proxy

`proxy.ts` at the root is a dev proxy that handles cookie/session refresh for Server Components that cannot set cookies themselves (a `@supabase/ssr` limitation).

## UI Design System

All visual conventions are documented in `docs/design.md`. Read it before building any UI. Key rules:

- Page background: `#f7f8fa` — card surfaces: `#ffffff` with `.panel` class (never recreate inline)
- Single accent: `#2563eb` blue. No other accent colors.
- Font: Geist (already loaded globally — do not re-import)
- CSS animation utilities: `anim-fade-in`, `anim-slide-up`, `anim-scale-in` + stagger delays `anim-d1`–`anim-d4` — all defined in `globals.css`
- No dark mode
