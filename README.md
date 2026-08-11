# JustSchedule

JustSchedule is a web app for booking exam retake slots at a school. A student picks a day and a time slot, says which subject and whether it is a midterm or a final, and books a seat. Teachers and admins see the whole schedule, manage who is allowed to book, and mark attendance on exam day.

It exists because the alternative was a paper list on a door and a group chat.

The app is live and in use. As of late May 2026 there are around 50 school members and real reservations in the production database, which shapes a lot of the rules in this repo. If you are here to contribute, read the section on working against a live database before you write a migration.

## Contents

- [What it does](#what-it-does)
- [Stack](#stack)
- [Running it locally](#running-it-locally)
- [How the code is organised](#how-the-code-is-organised)
- [Data model](#data-model)
- [Where the logic actually lives](#where-the-logic-actually-lives)
- [Auth flow](#auth-flow)
- [Design system](#design-system)
- [Working against a live database](#working-against-a-live-database)
- [Contributing](#contributing)
- [Deploying](#deploying)
- [Backups](#backups)
- [Further reading](#further-reading)

## What it does

There are four roles, stored on a `SchoolMembers` row rather than on the user account, so the same person can have different roles at different schools.

Students book their own exam slots, but only if an admin or professor has switched on self booking for them. This is off by default. A student without that permission can still ask for a slot by sending a scheduling request to a specific professor, who approves or declines it. Students can also see the school's confirmed reservations, cancel their own, and leave the school.

Professors see the member list, book exams on behalf of students, review the requests addressed to them, and cancel or update any reservation in their school.

Admins do all of that plus manage members and roles, create invite links, approve join requests, manage exam slots and subjects, and soft delete the school.

Exam supervisors are a narrow role that exists for exam day. They see reservations and mark attendance, and that is it. They cannot book or cancel anything.

Booking has a few rules worth knowing, all enforced on the server:

Bookings run from today up to 14 days out, and weekends are excluded because no exams are scheduled then. The subject name has to match an active row in the school's subject list, so people cannot invent a subject by typing it. A student cannot hold two confirmed reservations for the same subject and exam type from today forward, though they can book a different exam in another slot on the same day. Every slot has a capacity, and when a slot fills up the booking is routed automatically into an overflow room if the school has configured one for that time window.

Attendance opens five minutes before a slot starts and closes twenty five minutes after. Slot times are stored as local wall clock time and converted using the school's timezone, which defaults to `Europe/Bucharest`. Getting this wrong is how you end up with an attendance window three hours off, so the conversion happens in the database function rather than in the browser.

## Stack

Next.js 16 with the App Router and React 19. Note that Next 16 has breaking changes compared to what you may be used to, and the version bundles its own docs at `node_modules/next/dist/docs/`. Check there before reaching for a routing or data fetching API from memory.

Supabase handles auth, the database, and row level security, through `@supabase/ssr` and `@supabase/supabase-js`. Privileged writes go through Supabase Edge Functions, which live in this repo under `supabase/functions/`.

Tailwind CSS 4 for styling, with shadcn components under `components/ui/`. The Tailwind 4 API differs from v3, so old config examples will not work. Geist is the font, loaded once globally.

`framer-motion` is installed but restricted to the landing page components. Everywhere else uses the CSS animation utilities in `app/globals.css`.

PostHog and Vercel Analytics are wired up for product analytics.

## Running it locally

You need Node and a Supabase project. There is no Docker setup and no seed script yet, so the fastest path is pointing at your own Supabase project rather than trying to reproduce production data.

Install dependencies:

```bash
npm install
```

Create `.env.local` with your Supabase values:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

That second variable name is deliberate and differs from most Supabase tutorials, which use an anon key variable. `lib/supabase/env.ts` validates both names at startup, so a typo fails loudly instead of producing a confusing auth error later.

In your Supabase project, enable the Google auth provider and add the local callback URL:

```text
http://localhost:3000/auth/callback
```

Apply the migrations in `supabase/migrations/` to your project. There are 30 of them and they are ordered by filename timestamp. The Supabase CLI is already a dev dependency, so `npx supabase` works without a global install.

Then start the dev server:

```bash
npm run dev
```

Open http://localhost:3000. Sign in with Google, enter your real name when asked, and you will land on the dashboard. To get anywhere useful you will need a school, so create one, which makes you its admin.

Other commands:

```bash
npm run build   # production build, also runs the TypeScript check
npm run lint    # ESLint
```

There is no test suite. This is the biggest gap in the project right now, and it means verification is manual: run the build, then click through the flow you changed at a phone width and a desktop width, in both light and dark mode.

## How the code is organised

```
app/
  page.tsx                          landing page, redirects signed in users
  login/                            name capture after first sign in
  auth/callback/                    OAuth code exchange
  invite/[inviteToken]/             invite acceptance
  dashboard/
    page.tsx                        school list for the signed in user
    layout.tsx                      mounts the release notes dialog
    schedule/                       student workspace
    schools/[schoolId]/             admin, professor and supervisor workspace
components/
  schedule/                         calendar, slot picker, booking summary
  dashboard/                        school management, split by tab
  landing/                          marketing page, framer-motion lives here
  release/                          the "what's new" dialog
  skeletons/                        shared loading skeleton pieces
  theme/                            dark mode toggle
  ui/                               shadcn primitives
lib/
  supabase/                         client, server and env helpers
  theme.ts, theme-store.ts          theme cookie and external store
  release-notes.ts, release-seen.ts release notes content and seen state
  user-facing-errors.ts             turns Postgres and function errors into readable text
supabase/
  functions/                        Edge Functions
  migrations/                       SQL migrations, applied in filename order
docs/                               architecture, decisions, UI and layout guides
graphify-out/                       generated code graph, do not hand edit
```

Two conventions that are easy to trip over.

Components should not grow into one enormous file. School management is the example to follow: `SchoolManagementTabs.tsx` is only the tab shell, and the real UI lives in `components/dashboard/school-management-tabs/` split by tab, dialog, action menu and row. The rough limit is 500 lines before something gets split out.

Every authenticated route ships a `loading.tsx` next to it. This is not decoration. For dynamic server rendered routes, Next only prefetches the loading boundary, so a route without one blocks on the click until the server responds. The skeletons have to mirror the real layout's widths and paddings, otherwise the page jumps when data arrives.

## Data model

The tables that matter:

`Profiles` holds the user's real name. The app deliberately does not fall back to Google account metadata for identity, because people sign in with nicknames and a teacher needs to know who actually booked the seat.

`Schools` holds the school and its timezone. Deletion is soft, through `deleted_at` and `deleted_by`, so history survives. Queries for active schools must filter `deleted_at is null`.

`SchoolMembers` links a user to a school with a role and a `can_self_book` flag.

`ExamSlots` is a reusable slot template with a name, start and end time, and capacity. It does not store a date. Slots are either primary or overflow, and an overflow slot points at the primary slot it backs up.

`Reservations` is the actual booking, with the school, user, slot, calendar date, subject name, exam type, status, and the attendance fields.

`ScheduleRequests` holds a student's pending request to a professor. It never creates or holds a reservation while pending, so a pending request cannot block a seat.

`SchoolSubjects`, `SchoolInvites`, `JoinRequests`, `UserNotifications`, `AttendanceSessions` and `ReservationHistory` fill in around those.

## Where the logic actually lives

This is the thing to understand before changing anything.

Authorization and business rules live in the database, in Postgres functions and row level security policies, not in the React components. The frontend checks exist to keep the UI honest, not to enforce anything. If you add a rule in a component and not in the RPC, you have added a suggestion.

Privileged writes go through Edge Functions, which verify the caller's JWT first and only then use service role access. The deployed functions are `reserve-exam-slot`, `cancel-reservation`, `create-school-invite`, `review-school-join-requests` and `schedule-exam-for-student`.

Booking is the clearest example. The client calls `reserve-exam-slot` with the school, slot, date, subject and exam type. The function checks that the caller is signed in, is a student member of that school, has self booking enabled, that the slot is active and belongs to the school, that the date is inside the window and not a weekend, that the exam type is valid, and that the subject matches an active row. Then it takes a lock on the school, date and slot, counts confirmed reservations, and inserts if there is room, falling through to the overflow room if the primary is full. The seat counter you see in the browser is a convenience, and the server does not trust it.

## Auth flow

Google sign in redirects to `/auth/callback`, which exchanges the code for a session. The callback then checks `Profiles` for a non empty name. If the name is missing, the user goes to `/login` to enter one, otherwise on to the dashboard or whatever safe relative path was carried through as `next`. Invite links survive this, so someone can click an invite while logged out and still land on the invite page after signing in.

`proxy.ts` at the repo root refreshes Supabase auth cookies before Server Components run. It is not an authorization layer and should not become one. Every dashboard page makes its own decision with `auth.getUser()` plus a database check.

For server side auth decisions, use `auth.getUser()`. Do not use `user_metadata`, which the user controls, for anything except a display fallback.

## Design system

All colour comes from semantic CSS custom properties defined in `app/globals.css`, with light values on `:root` and dark values under `.dark`. Never hardcode a hex value or a raw Tailwind grey or blue utility in a component. Use `var(--token)` in an inline style, or a Tailwind arbitrary value like `bg-[var(--surface-panel)]`. Inline styles beat the `.dark` class selector, so a hex literal in an inline style silently breaks dark mode.

There is one accent colour, `--accent-color`. Be careful with the name: `--accent` already exists in the imported shadcn theme and means something unrelated. Colliding with it broke dark mode once already.

Card surfaces use the `.panel` class. Loading placeholders use the `Skeleton` component, never a hand rolled grey box or a spinner. Animations use the `anim-` utilities in `globals.css`, which already respect `prefers-reduced-motion`.

Before touching layout, read `docs/ui.md` and `docs/responsive-layout.md`. The layout guide is mobile first and specific about touch targets, table to card conversion, and dialog sizing.

## Working against a live database

Real students have real reservations in this database. That leads to a few hard rules.

Migrations are additive first. A new feature adds tables, columns, indexes, policies and functions without changing or removing anything already deployed. Do not rename a column, rewrite existing rows, or change what a deployed RPC does in the same change that introduces a feature. If a cleanup is genuinely needed, it ships later as its own migration, after the additive version has been running in production.

Never drop a column or table that might hold live data without a migration path.

Do not run destructive SQL against production. No truncate, no drop, no bulk delete.

Row level security and RPC changes take effect for real users the moment they are applied, so they get read carefully before they go out.

Treat `Reservations`, `SchoolMembers`, `Schools` and `Profiles` as production tables at all times, including when you are convinced you are pointed at a test project.

## Contributing

Work on a branch named after you, following the pattern `yourname-dev`. Check with `git branch --show-current`.

Never commit or push directly to `main`. Open a pull request instead.

Keep `AGENTS.md` current. It is the detailed technical reference for this codebase, and the rule is to edit the relevant section in place rather than appending a changelog at the bottom. If you change how something works, the description of how it works changes in the same PR.

If you ship a user facing feature, add a line to `RELEASES` in `lib/release-notes.ts` in the same PR. That is what surfaces in the "what's new" dialog the next time people open the app.

After a substantial change, refresh the generated code graph:

```bash
graphify update .
```

One dependency note: `npm audit` reports a moderate PostCSS advisory reaching in through Next 16. Do not run `npm audit fix --force`, because npm's suggested fix is downgrading Next to 9.3.3. It will resolve when Next updates the transitive dependency.

## Deploying

The app runs on Vercel. Set the same two environment variables there:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Add the production callback URL in Supabase Auth:

```text
https://your-vercel-domain.vercel.app/auth/callback
```

Invite links are built from the browser origin they were created on, so links generated on the production domain point at the production domain without extra configuration.

Edge Functions deploy separately from the Next app. Changing a function's source in this repo does nothing until you deploy it:

```bash
supabase functions deploy reserve-exam-slot --project-ref your_project_ref
supabase functions deploy cancel-reservation --project-ref your_project_ref
supabase functions deploy create-school-invite --project-ref your_project_ref
supabase functions deploy review-school-join-requests --project-ref your_project_ref
supabase functions deploy schedule-exam-for-student --project-ref your_project_ref
```

## Backups

A cron job on a development machine dumps the database three times a day, at midnight, 08:00 and 16:00, producing a separate schema file and data file per run. Rolling dumps are kept for three days, Sunday dumps for four weeks, and first of the month dumps for two months.

Dumps contain student data and are never committed to this repo.

The full plan, including how to restore a single day of lost reservations and how to rebuild from scratch into a new project, is in `docs/notes/free-database-backup-and-recovery.md`. One warning from that document is worth repeating here: do not restore into an existing live Supabase project without clearing it first, because Supabase's internal schemas make that unsafe.

## Further reading

`AGENTS.md` is the deep technical reference and the first place to look for how a feature actually works.

`docs/architecture.md` covers system structure, `docs/decisions.md` records why certain choices were made, `docs/security.md` covers the security model, and `docs/workflows.md` covers development workflows.

`docs/ui.md` and `docs/responsive-layout.md` are the design and layout rules.

`graphify-out/GRAPH_REPORT.md` is a generated map of the codebase, useful for finding which functions connect to what without reading every file.
