# Single-School Mode Design

**Date:** 2026-05-20  
**Status:** Approved

## Problem

JustSchedule currently allows any authenticated user to create their own school, and joining a school requires an invite link from an admin. For the initial launch, the product should operate with a single, pre-existing school. New users should be able to discover and request to join that school from the dashboard without needing an invite link.

## Goals

1. Show all non-deleted schools to every logged-in user on the dashboard (there will be exactly one).
2. Members see and use their school card exactly as before.
3. Non-members see the school card with a "Request to join" button — no invite link required.
4. Nobody can create new schools through the UI.
5. The admin reviews and approves join requests exactly as before (via the `Join Requests` tab in `SchoolManagementTabs`).
6. Old multi-school / invite-only flow is preserved in code and documented for easy revert.

## Non-Goals

- Multiple school support is not removed, just hidden.
- No changes to the invite link flow — it continues to work.
- No changes to the admin `Join Requests` review UI.
- No changes to anything post-membership (schedule, reservations, attendance, etc.).

## Architecture

### Dashboard page changes

`app/dashboard/page.tsx` gains a third parallel query: all non-deleted schools. The render logic is updated:

- The "No schools yet" empty state (which showed `RegisterSchoolForm`) is replaced by showing the non-member school card.
- The ghost "Register another school" card is removed from the has-schools grid.
- A school the user is NOT a member of is rendered as a `DirectJoinCard` instead of a regular member card.
- If the user already has a pending `JoinRequests` row for that school, `DirectJoinCard` shows a "Request pending" badge instead of the button.

### New server action

`requestDirectJoin(schoolId)` in `app/dashboard/actions.ts` inserts a `JoinRequests` row with `invite_id = null`. A new RLS policy (`Users can create direct join requests`) guards this path.

### New component

`components/dashboard/DirectJoinCard.tsx` — mirrors the visual style of existing school cards. Has three states: default (shows "Request to join" button), pending (shows badge), and submitted (optimistic success state after clicking).

### Database migration

`supabase/migrations/20260520000000_direct_join_requests.sql`:
1. Makes `JoinRequests.invite_id` nullable (it may already be, but the migration is idempotent).
2. Adds a second insert policy that allows `invite_id IS NULL` direct requests.

## Revert Strategy

All changes are isolated to:
- `app/dashboard/page.tsx`
- `app/dashboard/actions.ts`
- `components/dashboard/DirectJoinCard.tsx` (new file, can be deleted)
- One migration (documented in revert guide)

The full revert procedure is in `docs/revert-to-multi-school-mode.md`.

## Files Touched

| File | Change |
|------|--------|
| `app/dashboard/page.tsx` | Add all-schools query, replace empty state and ghost card, render `DirectJoinCard` for non-members |
| `app/dashboard/actions.ts` | Add `requestDirectJoin` server action |
| `components/dashboard/DirectJoinCard.tsx` | New component |
| `supabase/migrations/20260520000000_direct_join_requests.sql` | New migration |
| `docs/revert-to-multi-school-mode.md` | New revert guide |
| `AGENTS.md` | Update Join/Invite section to document single-school mode |
