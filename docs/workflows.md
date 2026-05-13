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
