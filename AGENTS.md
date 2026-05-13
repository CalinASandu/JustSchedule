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
