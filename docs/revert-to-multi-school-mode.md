# Reverting to Multi-School Mode

This document describes exactly how to undo the single-school mode changes introduced in the commit tagged `single-school-mode` (base commit before the change: `11aecdb8ab5bfd82949ed33fe30db683b1c9d880`).

## What was changed

| File | What changed |
|------|-------------|
| `app/dashboard/page.tsx` | Added all-schools and pending-requests queries; replaced "No schools yet" empty state (which showed `RegisterSchoolForm`) with non-member school cards; removed ghost "Register another school" card; renders `DirectJoinCard` for non-members |
| `app/dashboard/actions.ts` | Added `requestDirectJoin` server action and `DirectJoinState` type |
| `components/dashboard/DirectJoinCard.tsx` | New file — non-member school card with join request button |
| `supabase/migrations/20260520000000_direct_join_requests.sql` | Made `JoinRequests.invite_id` nullable; added `Users can create direct join requests` RLS policy |
| `docs/revert-to-multi-school-mode.md` | This file |
| `AGENTS.md` | Updated "Invites and Join Requests" section |

---

## Option A — Git revert (recommended)

The cleanest revert. All single-school file changes were committed under commits made after `11aecdb8ab5bfd82949ed33fe30db683b1c9d880`. Find the single-school-mode tag and revert the commits it covers:

```bash
# See all commits since the base
git log --oneline 11aecdb8..HEAD

# Revert them newest-first (one per line shown above)
# Example — adjust hashes to match your git log output:
git revert <newest-hash>
git revert <next-hash>
# ...continue until you've reverted past the single-school changes
```

Or, if the changes were squashed into a single commit tagged `single-school-mode`:

```bash
git log --oneline | grep "single-school"
# copy the commit hash, e.g. abc1234
git revert abc1234
```

`git revert` creates a new commit that undoes all file-level changes. It does **not** undo the database migration — handle that separately (see below).

### Hard reset (destructive — only if the branch has not been pushed/shared)

If you have not pushed and want no trace of the single-school commits:

```bash
git reset --hard 11aecdb8ab5bfd82949ed33fe30db683b1c9d880
```

This destroys all commits after that hash. Only use this on an unpushed local branch.

---

## Option B — Manual file restore

Use this if git revert produces conflicts or you need to restore individual files.

### 1. `app/dashboard/page.tsx`

**Remove** the two extra queries from the `Promise.all` block:

```typescript
// DELETE these two queries (the 4th and 5th entries in Promise.all):
supabase
  .from("Schools")
  .select("id, name")
  .is("deleted_at", null)
  .order("created_at", { ascending: true }),

supabase
  .from("JoinRequests")
  .select("school_id")
  .eq("user_id", user.id)
  .eq("status", "pending"),
```

Restore the destructuring to three items:

```typescript
const [{ data: profile }, membershipResult, createdSchoolsResult] = await Promise.all([
  // ...only the original 3 queries
]);
```

**Remove** these three derived variables (added after `const memberships = mergeCreatedSchools(...)`):

```typescript
// DELETE these three lines:
const memberSchoolIds = new Set(memberships.map((m) => m.school.id));
const pendingSchoolIds = new Set(
  (pendingRequestsResult.data ?? []).map((r) => r.school_id as string),
);
const nonMemberSchools = (allSchoolsResult.data ?? []).filter(
  (s) => !memberSchoolIds.has(s.id),
);
```

**Replace** the unified grid JSX back to the original conditional. Find the `<section className="grid ...">` block and restore the ternary:

```tsx
{memberships.length === 0 ? (
  <section className="panel anim-slide-up anim-d2 p-6">
    <div className="mb-5 flex items-start gap-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "#EFF6FF" }}
      >
        <GraduationCap size={19} color="#2563EB" strokeWidth={1.8} />
      </div>
      <div>
        <h2 className="text-sm font-semibold" style={{ color: "#111827" }}>
          No schools yet
        </h2>
        <p className="mt-1 max-w-xl text-sm" style={{ color: "#6B7280", lineHeight: 1.5 }}>
          Register your first school. You will become its admin automatically.
        </p>
      </div>
    </div>
    <RegisterSchoolForm />
  </section>
) : (
  <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {memberships.map((membership, index) => {
      // ...existing school card code (unchanged)
    })}

    {/* Ghost card — add another school */}
    <article className="panel flex min-h-[178px] flex-col justify-between p-5 anim-slide-up anim-d3">
      <div className="mb-3 flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "#EFF6FF" }}
        >
          <Building2 size={19} color="#2563EB" strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="text-[0.9375rem] font-semibold" style={{ color: "#111827" }}>
            Add another school
          </h2>
          <p className="mt-1 text-xs" style={{ color: "#9CA3AF" }}>
            Register a new school and become its admin.
          </p>
        </div>
      </div>
      <RegisterSchoolForm />
    </article>
  </section>
)}
```

**Restore** the `RegisterSchoolForm` import and **remove** the `DirectJoinCard` import:

```typescript
// RESTORE:
import RegisterSchoolForm from "@/components/dashboard/RegisterSchoolForm";

// DELETE:
import DirectJoinCard from "@/components/dashboard/DirectJoinCard";
```

### 2. `app/dashboard/actions.ts`

**Delete** the `requestDirectJoin` function and its type:

```typescript
// DELETE from actions.ts:
export type DirectJoinState = {
  error: string | null;
  success: boolean;
};

export async function requestDirectJoin(
  _state: DirectJoinState,
  formData: FormData,
): Promise<DirectJoinState> {
  // ...entire function body
}
```

### 3. `components/dashboard/DirectJoinCard.tsx`

**Delete** the entire file:

```bash
rm components/dashboard/DirectJoinCard.tsx
```

### 4. `AGENTS.md`

Remove the paragraph added to the "Invites and Join Requests" section that begins with "In single-school mode (current default)..."

---

## Database migration revert (required regardless of which option above you used)

The migration `20260520000000_direct_join_requests.sql` must be reversed manually — git revert does not touch the database. Run this SQL in the Supabase SQL editor or via `supabase db execute`.

### Step 1 — Drop the direct join policy

```sql
drop policy if exists "Users can create direct join requests" on public."JoinRequests";
```

### Step 2 — Restore invite_id NOT NULL (only if it was NOT NULL before this migration)

Before running, check whether `invite_id` was originally `NOT NULL`. If you are unsure, check the git history of the original migration that created `JoinRequests`:

```bash
git log --all --oneline -- supabase/migrations/
# find the migration that created JoinRequests and read it
```

If `invite_id` was `NOT NULL` originally:

```sql
-- Restore NOT NULL constraint (this will fail if any rows have invite_id = null)
-- First, delete any direct join request rows (status = 'pending' and invite_id is null):
delete from public."JoinRequests"
where invite_id is null;

-- Then restore the constraint:
alter table public."JoinRequests"
  alter column invite_id set not null;
```

### Step 3 — Remove the migration record

```sql
delete from supabase_migrations.schema_migrations
where version = '20260520000000';
```

### Step 4 — Verify

```sql
-- Should return no rows (policy deleted):
select policyname from pg_policies
where tablename = 'JoinRequests'
  and policyname = 'Users can create direct join requests';

-- Should return only the original invite-required policy:
select policyname, cmd from pg_policies
where tablename = 'JoinRequests' and cmd = 'INSERT';
-- Expected: "Users can create their own pending join requests" | INSERT

-- invite_id nullable status (should match original):
select column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'JoinRequests'
  and column_name = 'invite_id';
```

---

## Verifying the revert

1. Start the dev server: `npm run dev`
2. Sign in as a new user who has no school memberships.
3. You should see the **"No schools yet"** panel with the `RegisterSchoolForm`.
4. Create a school — you should become admin automatically.
5. Sign in as a second user — they should **not** see any school (they need an invite link to join).
6. The `/invite/[token]` flow should still work and create a pending join request as before.
7. Direct join requests (no invite) should be blocked by the database (RLS policy removed).
