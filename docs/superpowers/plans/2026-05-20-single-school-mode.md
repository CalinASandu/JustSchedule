# Single-School Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the multi-school creation flow with a single visible school that anyone can request to join directly from the dashboard, without an invite link.

**Architecture:** Add a parallel "all schools" query to the dashboard page so non-members see the school; add a `requestDirectJoin` server action with a matching RLS policy that allows invite-free join requests; remove the school creation UI. The old invite-based join flow is untouched.

**Tech Stack:** Next.js 16 App Router, React 19 `useActionState`, Supabase (RLS migrations), Tailwind CSS 4 / `globals.css` animation utilities, TypeScript.

---

## Task 1: Write the revert guide

This must be done before any code changes so the snapshot is accurate.

**Files:**
- Create: `docs/revert-to-multi-school-mode.md`

- [ ] **Step 1: Create the revert guide**

Create `docs/revert-to-multi-school-mode.md` with the following exact content:

```markdown
# Reverting to Multi-School Mode

This document describes exactly how to undo the single-school mode changes introduced in the commit tagged `single-school-mode` (base commit: `11aecdb8ab5bfd82949ed33fe30db683b1c9d880`).

## What was changed

| File | What changed |
|------|-------------|
| `app/dashboard/page.tsx` | Added all-schools query; replaced "No schools yet" empty state (which showed `RegisterSchoolForm`) with non-member school cards; removed ghost "Register another school" card; renders `DirectJoinCard` for non-members |
| `app/dashboard/actions.ts` | Added `requestDirectJoin` server action |
| `components/dashboard/DirectJoinCard.tsx` | New file — non-member school card with join request button |
| `supabase/migrations/20260520000000_direct_join_requests.sql` | Made `JoinRequests.invite_id` nullable; added `Users can create direct join requests` RLS policy |
| `docs/revert-to-multi-school-mode.md` | This file |
| `AGENTS.md` | Updated "Invites and Join Requests" section |

## Option A — Git revert (recommended)

The cleanest revert. All single-school changes were committed under a dedicated commit labelled `feat: single-school mode`. Find it and revert:

```bash
git log --oneline | grep "single-school"
# copy the commit hash, e.g. abc1234
git revert abc1234
```

`git revert` creates a new commit that undoes all the file-level changes in that commit. It does NOT undo the database migration (see below).

If the single-school changes span multiple commits, revert them newest-first:

```bash
git revert <newest-hash>
git revert <older-hash>
```

## Option B — Manual file restore

If you cannot use git revert cleanly, restore each file manually.

### 1. `app/dashboard/page.tsx`

**Remove** the third parallel query (all-schools + pending-requests):

```typescript
// DELETE these two queries from the Promise.all block:
supabase
  .from("Schools")
  .select("id, name, created_at, created_by")
  .is("deleted_at", null)
  .order("created_at", { ascending: true }),

supabase
  .from("JoinRequests")
  .select("school_id")
  .eq("user_id", user.id)
  .eq("status", "pending"),
```

**Restore** the empty state to `RegisterSchoolForm`:

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
  // ...school cards grid
)}
```

**Restore** the ghost card at the end of the school cards grid (inside the `<section className="grid ...">` after the `.map()` call):

```tsx
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
```

**Remove** the import of `DirectJoinCard` and restore the import of `RegisterSchoolForm`.

**Remove** the `allSchools` and `pendingSchoolIds` variables and all logic that uses them.

### 2. `app/dashboard/actions.ts`

**Delete** the `requestDirectJoin` function and its exported types:

```typescript
// DELETE from actions.ts:
export type DirectJoinState = {
  error: string | null;
  success: boolean;
};

export async function requestDirectJoin(
  _state: DirectJoinState,
  formData: FormData,
): Promise<DirectJoinState> { ... }
```

### 3. `components/dashboard/DirectJoinCard.tsx`

**Delete** the entire file:

```bash
rm components/dashboard/DirectJoinCard.tsx
```

### 4. Database migration (manual SQL — cannot be git-reverted)

The migration `20260520000000_direct_join_requests.sql` must be reversed manually in the Supabase SQL editor (or CLI).

**Step 1 — Drop the direct join policy:**

```sql
drop policy if exists "Users can create direct join requests" on public."JoinRequests";
```

**Step 2 — Restore invite_id NOT NULL (only if it was NOT NULL before this migration):**

Check the column before running this — if `invite_id` was already nullable before the migration, skip this step.

```sql
-- Only run if invite_id was previously NOT NULL:
alter table public."JoinRequests"
  alter column invite_id set not null;
```

**Step 3 — Remove the migration record so Supabase CLI does not flag it:**

```sql
delete from supabase_migrations.schema_migrations
where version = '20260520000000';
```

**Step 4 — Verify:**

```sql
-- Should return no rows (policy deleted):
select policyname from pg_policies
where tablename = 'JoinRequests'
  and policyname = 'Users can create direct join requests';

-- Should return the original invite-required policy only:
select policyname from pg_policies
where tablename = 'JoinRequests' and cmd = 'INSERT';
```

## Verifying the revert

1. Start the dev server: `npm run dev`
2. Sign in as a new user who has no school memberships.
3. You should see the "No schools yet" panel with the `RegisterSchoolForm`.
4. Create a school — you should become admin automatically.
5. Sign in as a second user — they should NOT see any school (they need an invite link).
6. The `/invite/[token]` flow should still work and create a pending join request as before.
```

- [ ] **Step 2: Commit the revert guide**

```bash
git add docs/revert-to-multi-school-mode.md
git commit -m "docs: add revert guide for single-school mode"
```

---

## Task 2: Database migration — allow direct join requests

**Files:**
- Create: `supabase/migrations/20260520000000_direct_join_requests.sql`

- [ ] **Step 1: Check the current invite_id column nullability**

Run in the Supabase SQL editor (or via `mcp__supabase__execute_sql`):

```sql
select column_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'JoinRequests'
  and column_name = 'invite_id';
```

Note whether `is_nullable` is `YES` or `NO`.

- [ ] **Step 2: Create the migration file**

Create `supabase/migrations/20260520000000_direct_join_requests.sql`:

```sql
-- Allow direct join requests (no invite token required).
-- The existing "Users can create their own pending join requests" policy
-- (which requires a valid invite_id) is preserved unchanged.

-- Make invite_id nullable so a row can be inserted without an invite.
alter table public."JoinRequests"
  alter column invite_id drop not null;

-- New policy: authenticated users can insert a pending join request
-- directly (invite_id IS NULL), as long as it is for themselves
-- and they are not already a member of the school.
drop policy if exists "Users can create direct join requests" on public."JoinRequests";
create policy "Users can create direct join requests"
on public."JoinRequests"
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'::public.status_enum
  and invite_id is null
  and not exists (
    select 1
    from public."SchoolMembers" sm
    where sm.user_id = auth.uid()
      and sm.school_id = "JoinRequests".school_id
  )
);
```

- [ ] **Step 3: Apply the migration**

Use the Supabase MCP tool `mcp__supabase__apply_migration` with:
- `name`: `direct_join_requests`
- `query`: (paste the SQL above)

Or via CLI: `supabase db push` if working locally.

- [ ] **Step 4: Verify the migration**

Run in Supabase SQL editor:

```sql
-- Should return YES (nullable):
select column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'JoinRequests'
  and column_name = 'invite_id';

-- Should return two insert policies:
select policyname, cmd
from pg_policies
where tablename = 'JoinRequests' and cmd = 'INSERT';
-- Expected rows:
-- "Users can create their own pending join requests" | INSERT
-- "Users can create direct join requests"            | INSERT
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260520000000_direct_join_requests.sql
git commit -m "feat: allow direct join requests without invite token"
```

---

## Task 3: Server action — `requestDirectJoin`

**Files:**
- Modify: `app/dashboard/actions.ts`

- [ ] **Step 1: Add the server action**

Open `app/dashboard/actions.ts`. After the existing `registerSchool` export, add:

```typescript
export type DirectJoinState = {
  error: string | null;
  success: boolean;
};

export async function requestDirectJoin(
  _state: DirectJoinState,
  formData: FormData,
): Promise<DirectJoinState> {
  const schoolId = String(formData.get("schoolId") ?? "").trim();

  if (!schoolId) {
    return { error: "Invalid school.", success: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to sign in again.", success: false };
  }

  const { error } = await supabase.from("JoinRequests").insert({
    school_id: schoolId,
    user_id: user.id,
    status: "pending",
    invite_id: null,
  });

  if (error) {
    console.error("Direct join request failed", {
      code: error?.code,
      message: error?.message,
    });
    if (error.code === "23505") {
      return { error: "You already have a pending request for this school.", success: false };
    }
    return {
      error: getUserFacingErrorMessage("requestDirectJoin", error),
      success: false,
    };
  }

  revalidatePath("/dashboard");
  return { error: null, success: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/actions.ts
git commit -m "feat: add requestDirectJoin server action"
```

---

## Task 4: `DirectJoinCard` component

**Files:**
- Create: `components/dashboard/DirectJoinCard.tsx`

- [ ] **Step 1: Create the component**

Create `components/dashboard/DirectJoinCard.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { Check, GraduationCap, Loader2, Send } from "lucide-react";
import { requestDirectJoin, type DirectJoinState } from "@/app/dashboard/actions";

const initialState: DirectJoinState = {
  error: null,
  success: false,
};

type Props = {
  schoolId: string;
  schoolName: string;
  isPending: boolean;
};

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "JS"
  );
}

export default function DirectJoinCard({ schoolId, schoolName, isPending }: Props) {
  const [state, formAction, submitting] = useActionState(requestDirectJoin, initialState);

  const hasPending = isPending || state.success;

  return (
    <article
      className="panel flex min-h-[178px] flex-col justify-between p-5 anim-slide-up anim-d1"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-semibold"
          style={{ background: "#EFF6FF", color: "#2563EB" }}
        >
          {getInitials(schoolName)}
        </div>
        <div>
          <h2 className="text-[0.9375rem] font-semibold" style={{ color: "#111827" }}>
            {schoolName}
          </h2>
          <p className="mt-1 text-xs" style={{ color: "#9CA3AF" }}>
            {hasPending ? "Request pending admin approval" : "You are not a member yet"}
          </p>
        </div>
      </div>

      <div className="mt-4">
        {hasPending ? (
          <div
            className="inline-flex h-[2.375rem] items-center gap-2 rounded-[10px] px-3 text-[0.8125rem] font-medium"
            style={{ background: "#EFF6FF", color: "#2563EB" }}
          >
            <Check size={14} />
            Request sent
          </div>
        ) : (
          <form action={formAction}>
            <input type="hidden" name="schoolId" value={schoolId} />
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-[2.375rem] items-center gap-2 rounded-[10px] px-4 text-[0.8125rem] font-semibold text-white transition-colors duration-150 disabled:cursor-not-allowed"
              style={{
                background: submitting ? "#93C5FD" : "#2563EB",
                boxShadow: submitting
                  ? "none"
                  : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
              }}
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Request to join
            </button>
          </form>
        )}

        {state.error && (
          <p
            className="anim-fade-in mt-2 text-[0.8125rem]"
            style={{
              color: "#DC2626",
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 8,
              padding: "0.5rem 0.75rem",
            }}
          >
            {state.error}
          </p>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/DirectJoinCard.tsx
git commit -m "feat: add DirectJoinCard component for non-member schools"
```

---

## Task 5: Update `app/dashboard/page.tsx`

**Files:**
- Modify: `app/dashboard/page.tsx`

This is the most involved change. Read the file carefully before editing.

### 5a — Add the two new parallel queries

- [ ] **Step 1: Find the `Promise.all` block** in `DashboardPage`. It currently fetches three things: `Profiles`, `SchoolMembers`, and `Schools` (created by user). Add two more queries:

```typescript
const [
  { data: profile },
  membershipResult,
  createdSchoolsResult,
  allSchoolsResult,
  pendingRequestsResult,
] = await Promise.all([
  supabase.from("Profiles").select("name").eq("id", user.id).single(),
  supabase
    .from("SchoolMembers")
    .select("id, role, joined_at, school_id")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true }),
  supabase
    .from("Schools")
    .select("id, name, created_at, created_by")
    .eq("created_by", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true }),
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
]);
```

- [ ] **Step 2: Compute the derived sets** after building `memberships`:

After the line `const memberships = mergeCreatedSchools(...)`, add:

```typescript
const memberSchoolIds = new Set(memberships.map((m) => m.school.id));
const pendingSchoolIds = new Set(
  (pendingRequestsResult.data ?? []).map((r) => r.school_id as string),
);
const nonMemberSchools = (allSchoolsResult.data ?? []).filter(
  (s) => !memberSchoolIds.has(s.id),
);
```

- [ ] **Step 3: Add the import** for `DirectJoinCard` at the top of the file:

```typescript
import DirectJoinCard from "@/components/dashboard/DirectJoinCard";
```

### 5b — Replace the empty state and ghost card

- [ ] **Step 4: Replace the `memberships.length === 0` branch**

Find this block in the JSX:

```tsx
{memberships.length === 0 ? (
  <section className="panel anim-slide-up anim-d2 p-6">
    ...
    <RegisterSchoolForm />
  </section>
) : (
  <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {memberships.map(...)}
    {/* ghost card here */}
  </section>
)}
```

Replace the entire ternary with a unified grid that always renders:

```tsx
<section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
  {memberships.map((membership, index) => {
    const isAdmin = membership.role === "admin";
    const opensSchoolDashboard =
      isAdmin ||
      membership.role === "professor" ||
      membership.role === "exam_supervisor";
    const href = opensSchoolDashboard
      ? `/dashboard/schools/${membership.school.id}`
      : `/dashboard/schedule?schoolId=${membership.school.id}`;

    return (
      <article
        key={membership.id}
        className={`panel flex min-h-[178px] flex-col justify-between p-5 anim-slide-up ${
          index === 0 ? "anim-d1" : index === 1 ? "anim-d2" : "anim-d3"
        }`}
      >
        {/* existing member card content — keep exactly as it was */}
        ...
      </article>
    );
  })}

  {nonMemberSchools.map((school) => (
    <DirectJoinCard
      key={school.id}
      schoolId={school.id}
      schoolName={school.name}
      isPending={pendingSchoolIds.has(school.id)}
    />
  ))}
</section>
```

**Important:** Keep every line of the existing member card content inside the `.map()` exactly as it was — only the outer conditional and the ghost card are removed.

- [ ] **Step 5: Remove the `RegisterSchoolForm` import** from the top of the file (it is no longer used):

```typescript
// DELETE this line:
import RegisterSchoolForm from "@/components/dashboard/RegisterSchoolForm";
```

- [ ] **Step 6: Verify the build compiles**

```bash
npm run build
```

Expected: no TypeScript or build errors. If there are unused-import errors, remove those imports.

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: show all schools on dashboard; non-members see DirectJoinCard"
```

---

## Task 6: Update AGENTS.md

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Update the "Invites and Join Requests" section**

Find the section in `AGENTS.md` that starts with `### Invites and Join Requests`. Add this paragraph at the end of the section (before the next `###`):

```markdown
In single-school mode (current default), the dashboard also shows all non-deleted schools to every logged-in user. Non-members see a `DirectJoinCard` with a "Request to join" button instead of a link. Clicking it calls `requestDirectJoin` (in `app/dashboard/actions.ts`), which inserts a `JoinRequests` row with `invite_id = null`. A separate RLS policy (`Users can create direct join requests`) permits this. The school creation UI (`RegisterSchoolForm`, `registerSchool` action) is hidden but NOT deleted. See `docs/revert-to-multi-school-mode.md` to restore it.
```

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs: document single-school mode in AGENTS.md"
```

---

## Task 7: Tag the single-school-mode commit

This makes the revert guide's `git log | grep "single-school"` instruction work reliably.

- [ ] **Step 1: Create an annotated tag**

```bash
git tag -a single-school-mode -m "Single-school mode: non-member join request flow"
```

- [ ] **Step 2: Verify the tag**

```bash
git log --oneline | head -8
git tag -l single-school-mode
```

---

## Verification Checklist

After all tasks are complete, verify these scenarios manually:

- [ ] New user (no memberships, no pending requests): sees the school card with "Request to join" button
- [ ] Same user after clicking "Request to join": button changes to "Request sent" badge immediately (optimistic); on refresh still shows "Request pending"
- [ ] User who is already a student member: sees the normal student card linking to `/dashboard/schedule`
- [ ] Admin user: sees the normal admin card linking to `/dashboard/schools/[id]`
- [ ] Admin in `SchoolManagementTabs → Join Requests` tab: sees the direct join request in the list with no errors
- [ ] Admin approves the request: user becomes a student member; on next login sees the normal student card
- [ ] Nobody sees a "Register school" form or ghost card anywhere on the dashboard
- [ ] The `/invite/[token]` flow still works end-to-end (invite link → pending join request → admin approves)
