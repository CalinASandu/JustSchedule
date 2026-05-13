# AI-Native Repository Instruction System — Design Spec
Date: 2026-05-13

## Goal

Restructure the repository's AI instruction system to be compact, high-signal, and context-efficient. The graph provides structural discovery. AGENTS.md provides invariants and constraints. docs/ provides reasoning and flow detail. CLAUDE.md is a thin wrapper.

## Approach

Extract-then-compact (Approach A):
1. Write all docs/ files by extracting content from current AGENTS.md.
2. Compact AGENTS.md to invariants only.
3. Slim CLAUDE.md to a thin wrapper.
4. Delete outdated docs. Move personal notes to docs/notes/.

---

## File Structure

```
AGENTS.md                                   ← invariants, forbidden patterns, mandatory reads (~60-80 lines)
CLAUDE.md                                   ← @AGENTS.md + @graphify-out/GRAPH_REPORT.md + commands block

docs/
  architecture.md                           ← auth, schedule, reservations, attendance, proxy
  security.md                               ← RLS, auth rules, secrets, Edge Function requirements
  workflows.md                              ← commands, git rules, graph update rule
  ui.md                                     ← renamed from design.md (content unchanged)
  decisions.md                              ← ADR-style key decisions

  notes/                                    ← personal reference files, untouched
    free-database-backup-and-recovery.md

  superpowers/                              ← unchanged
    specs/
    plans/
```

Deleted: `docs/system-design.md`, `docs/plan.md` (outdated, historical sediment).

---

## AGENTS.md Shape

Sections (in order):

1. **Mandatory reads** — graph + relevant doc before touching any subsystem.
2. **Stack constraints** — Next.js 16 (breaking changes), Tailwind 4, Supabase SSR. No walkthroughs.
3. **Graph-first rule** — consult graph before reading files; `graphify update .` after major refactors.
4. **Critical invariants** — one line each, no explanation:
   - Reservations authoritative server-side only. No client writes.
   - ExamSlots is source of truth for slot definitions.
   - `constants.ts` is fallback only — not scheduling source of truth.
   - Authorization through RLS and Edge Function JWT only. No client-side guards.
   - `supabase.auth.getUser()` for server auth. `user_metadata` for display fallbacks only.
   - Slot times are local wall-clock (`time without time zone`). Convert via `school_timezone`.
   - Attendance window enforced server-side: 5 min before → 25 min after slot start.
   - `AttendanceSessions`/`start_attendance_session`/Start button are temporary. Remove after timing verified.
   - School deletion is soft delete via `soft_delete_school`. Active queries filter `deleted_at is null`.
   - Edge Functions perform all privileged writes. Client uses `supabase.functions.invoke()` only.
5. **Forbidden patterns** — bullet list, no explanation.
6. **Git rules** — branch pattern, no main, no co-author trailers.
7. **Maintenance rule** — replace, don't append; rewrite atomically; keep this file lean.

Does NOT contain: migration history, flow walkthroughs, proxy explanations, Supabase client table, implementation detail.

---

## docs/ Content Allocation

### architecture.md
- Auth flow (OAuth → callback → profile check → redirect)
- Invite/join-request flow
- Schedule page server/client split; panel switcher; workspace layout rules
- School management shell (roles, access)
- Reservation read model (ExamSlots + Reservations table definitions, uniqueness rule)
- Reservation write flow (Edge Function, server-side checks, duplicate rule)
- Attendance model (fields on Reservations, timing, AttendanceSessions temporary note)
- Delete/leave flows (soft delete, student leave, kick)
- Proxy (purpose, what not to put in it)
- Supabase client usage table (client vs. server import context)

### security.md
- `getUser()` rule; `user_metadata` display-only
- RLS table list; frontend filters are not substitutes for policies
- Service-role key never in client; publishable key only
- Edge Function JWT verification requirement
- PostCSS/Next audit advisory (do not run `--force`)

### workflows.md
- Dev/build/lint commands
- Git branch rules (branch pattern, no main, no co-author)
- Graph update rule (`graphify update .` after major refactors)
- Edge Function deploy notes

### ui.md
- Rename of current `docs/design.md`. Content unchanged.

### decisions.md
ADR-style, short entries:
- Why soft delete instead of hard delete
- Why `AttendanceSessions` is temporary
- Why `constants.ts` is fallback-only
- Why slot times are wall-clock, not UTC

### notes/
- `free-database-backup-and-recovery.md` — moved here, name and content unchanged.
- Future personal reference files go here.

---

## CLAUDE.md Final Shape

```markdown
@AGENTS.md
@graphify-out/GRAPH_REPORT.md

## Commands
npm run dev       # start dev server (localhost:3000)
npm run build     # production build
npm run lint      # ESLint
graphify update . # refresh code graph after substantial edits
```

No other content. All depth is in docs/ files referenced from AGENTS.md mandatory reads.

---

## Constraints

- No content is duplicated across files. Each fact lives in exactly one place.
- AGENTS.md stays under ~80 lines.
- docs/ files are modular and single-responsibility.
- docs/notes/ files are never edited by agents — they are user reference files.
- `docs/design.md` is renamed to `docs/ui.md`; all existing references in AGENTS.md and CLAUDE.md are updated.
- Graph remains the structural authority. docs/ files do not recreate graph topology.
