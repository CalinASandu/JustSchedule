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
