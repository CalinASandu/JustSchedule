# Booking integration tests

`run.mjs` exercises the booking Edge Functions and RPCs against the **live**
Supabase project, then diffs the results against an earlier run.

## What it touches in production

- Creates (once) three auth accounts: `justschedule.test.{student,professor,admin}@example.com`.
  Sessions are minted through the admin API, so no Google sign-in is involved.
- For the duration of the run, adds them to the school (as professor, admin, and,
  through a real join-request approval, student).
- Books and cancels a few reservations on a weekday 10 to 14 days out, in the
  slot with the most free seats. Other students can see these bookings in the
  schedule for a few seconds. `ReservationHistory` keeps a record of them.
- Creates, approves, and declines schedule requests between the test accounts.
  Notifications only go to the test accounts.
- Creates one invite link and deactivates it during cleanup.

Cleanup always runs (also on failure): cancels test bookings and pending
requests, deactivates test invites, deletes test join requests, and removes the
test memberships. The auth accounts are kept for the next run.

## Setup

Create `.env.test.local` in the repo root (git-ignored):

```
SUPABASE_SERVICE_ROLE_KEY=...
# Optional when more than one active school exists:
# TEST_SCHOOL_ID=...
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are read
from `.env.local`. Never commit or share the service-role key.

## Usage

```bash
# 1. Record how production behaves today.
node scripts/booking-tests/run.mjs --run --label baseline

# 2. After deploying new Edge Functions under "-canary" names:
node scripts/booking-tests/run.mjs --run --label canary --suffix -canary --compare baseline

# 3. After applying a migration or swapping the real functions:
node scripts/booking-tests/run.mjs --run --label after --compare baseline
```

Results are saved in `results/<label>.json` (git-ignored). `--compare` prints
every case whose status, error code, message, or response keys changed.

## Expected differences after the 2026-09 refactor

- `invite: non-http siteUrl`: message is now "siteUrl must be a valid http or https URL."
- `reserve: same exam in another slot`: code `duplicate_exam` ("You already have a future
  reservation for this exam and type.") instead of `duplicate_reservation`. The deployed
  function never had the `duplicate_exam` rule; the app already showed the right message.
- After `20260924104425_fix_booking_date_and_staff_overflow.sql`: no difference
  expected in these cases unless the run happens between 00:00 and 03:00
  Europe/Bucharest, or a test slot's main room is full.
