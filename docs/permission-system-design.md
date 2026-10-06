# Supabase-backed role permissions

Status: **deferred**, 2026-10-05. Not being implemented now. The immediate need (professors managing Subjects and Exam rooms) shipped as a small role-check change instead; see "Interim implementation" below. Revisit this design when more role/permission combinations need to be configurable.

## Decisions

- Role permissions are shared across the application.
- Supabase is the sole runtime source of role-to-permission assignments.
- There is no permission editor in JustSchedule, local grant configuration, environment-based grant list, or frontend role-to-permission map.
- Operators change grants through Supabase. Adding or removing an already integrated permission requires no application deployment.
- The first behavior change gives professors Subjects and Exam rooms settings access, while withholding Invites, Google Sheet, and Danger zone access (already done by the interim implementation).

Permission identifiers must still appear in code wherever an action is checked. Schema/function migrations should remain versioned under the repository's existing rules. Neither is a second permission configuration. The initial assignments ship as a committed seed migration (review note 1); later grant changes happen only in Supabase.

## Interim implementation (shipped instead)

- Professors see the `Settings` tab with only `Subjects` and `Exam rooms`; `Invites`, `Google Sheet`, and `Danger zone` remain admin-only (`SettingsTab.tsx` `adminOnly` flag).
- `upsert_school_subject`, `remove_school_subject`, `create_exam_slot`, `create_overflow_exam_slot`, and `update_exam_slot` authorize admin-or-professor through `private.caller_staff_role` instead of admin-only checks. Signatures and return shapes are unchanged (migration `20261005112128_professor_rooms_subjects_capacity_guard.sql`).
- `update_exam_slot` refuses to lower capacity below the busiest confirmed date from today forward (see the room-capacity note below).

When this design is picked up, the professor grants become `subjects.manage` and `exam_rooms.manage` only. `invites.manage` is **not** part of the professor bootstrap anymore.

## Review notes (2026-10-05)

Changes to make before implementing:

1. **Commit the bootstrap grants.** Grants are not secrets, and because missing grants fail closed, an empty `RolePermissions` table locks everyone out of every migrated action. A fresh environment (local DB, Supabase branch, schema-only restore) must be reproducible, so ship the initial assignments as a committed seed migration. Later changes can still be made only in Supabase.
2. **Room capacity and activation affect live bookings.** Lowering capacity is already guarded (interim implementation). Deactivating a room or overflow room that holds future confirmed reservations is still allowed and does not notify or move students; decide on a guard before widening `exam_rooms.manage` further.
3. **Invites need a read path, not just a write path.** `page.tsx` reads `SchoolInvites` directly and that table's RLS is admin-only, so granting `invites.manage` to a non-admin role also requires a permission-aware list RPC or policy.
4. **Make the grants readable.** Editing through the Table Editor works for developers only. Add a `role_permission_matrix` view (roles × permissions) so the current state is visible at a glance. Revisit the no-in-app-editor decision if school admins should ever edit grants themselves.
5. **Grants are global, not per school.** Fine in single-school mode; a multi-school return would need a nullable `school_id` on `RolePermissions` (additive) for per-school overrides.
6. **Live definitions are now readable.** Supabase tools are connected, so rollout step 1 can be done; the interim migration was written from the live definitions of the five subject/room RPCs.
7. **Booking-race limit of the capacity guard.** `update_exam_slot` takes the per-slot/date advisory locks before counting, but the booking RPCs read slot capacity before taking that lock, so a booking racing a capacity decrease at the same instant can still exceed the new capacity by one. Closing it fully means re-reading capacity under the lock in the booking helpers.

## Findings from the graph and source

The graph report dated 2026-09-28 identifies the school management shell, settings panels, and API helpers as the relevant communities. Targeted source inspection confirms:

| Layer | Current behavior | Required change |
| --- | --- | --- |
| `app/dashboard/schools/[schoolId]/page.tsx` | Derives capability props from roles and school ownership. Loads invites directly from `SchoolInvites`. | Load effective permissions from Supabase; gate privileged data before passing it to client components. |
| `components/dashboard/SchoolManagementTabs.tsx` | `canManageMembers` controls Settings visibility and rendering. Other tabs infer capabilities from `currentUserRole`. | Separate settings access from member administration. Derive visibility from action permissions. |
| `components/dashboard/school-management-tabs/SettingsTab.tsx` | All five settings sections are available whenever Settings renders. | Filter both section buttons and panel rendering; choose an authorized default section. |
| `components/dashboard/school-management-tabs/api.ts` | Subjects and rooms call admin-only RPCs. Invites call `create-school-invite`. | Route migrated actions through permission-aware server paths. |
| Subject RPCs | `upsert_school_subject` checks `private.is_school_admin`; `remove_school_subject` checks `private.assert_school_role`. | Authorize with `subjects.manage`, preserving validation and school scoping. |
| Room RPCs | `20260605090000_admin_slot_management_rpcs.sql` defines `create_exam_slot`, `create_overflow_exam_slot`, and `update_exam_slot` with admin assertions. | Authorize with `exam_rooms.manage`; preserve overflow behavior and return shapes. |
| Invite Edge Function | Inserts using the caller's Supabase client and relies on RLS. | Use a permission-aware creation path; checking permission in the UI alone cannot authorize the insert. |
| Google Sheets | `handleAdminAction` calls `can_manage_school_sheet`, then uses a privileged client. | Explicitly check `google_sheets.manage` before any privileged operation in the eventual migrated path. |
| School deletion | The UI calls `soft_delete_school`; its private implementation checks admin status. | Explicitly authorize `school.delete` in the eventual migrated path. |

Some room-management definitions exist locally, but AGENTS.md documents missing overflow migrations and says deployed definitions are authoritative. Inspect the live definitions and policies before writing their replacements. The graph is a navigation aid, not proof that the deployed database matches the repository.

## Database model

Use a permission catalog and a global grant relation:

- `Permissions`: unique stable permission key, description, optional category. This lists implemented capabilities, not assignments.
- `RolePermissions`: `role public.school_role`, `permission_key` referencing the catalog, unique `(role, permission_key)`, and timestamps.
- An audit relation records grant insertions/deletions with time, database actor, available authenticated actor, and old/new values. Dashboard SQL access must be distinguishable from an application user; do not assume `auth.uid()` is populated in the SQL editor.

Use public tables if editing through Supabase's Table Editor is desired. Enable RLS and revoke application DML from `anon` and `authenticated`; expose only caller-scoped read RPCs. Supabase project operators can manage grants using their privileged dashboard access. No school admin receives authority to edit these global grants merely because they administer a school.

Do not add wildcard grants, implicit role inheritance, per-user overrides, or custom roles in the first version. Explicit grants keep changes easy to review. Missing/unknown keys deny access.

## Authorization contract

Introduce private helpers plus narrow public RPCs:

- `private.has_school_permission(school_id, permission_key)` derives the caller from `auth.uid()`, verifies the school is active, resolves membership in that school, and checks the global role grants.
- `private.assert_school_permission(...)` raises `42501` when denied.
- `get_my_school_permissions(school_id)` returns only the authenticated caller's effective keys for that school. It accepts no caller-supplied role or user ID.
- A narrow boolean RPC can support caller-authenticated Edge Functions that need to authorize before using a service client.

Global grants do **not** make user roles global. A professor in school A is authorized using their membership in A; being an admin in another school confers no access to A. An active school's creator resolves to the admin role, matching existing ownership behavior, but still needs the corresponding admin grant. Avoid an unconditional owner/admin bypass that would make revocations ineffective.

Use private security-definer implementations with a fixed empty search path and fully qualified identifiers. Public RPC wrappers use security-invoker behavior and narrowly granted execution. Never accept a requested permission from an action's payload as the permission to enforce: each action selects its own fixed key.

Load effective permissions once per server request for presentation. Do not place permission grants in JWT claims, localStorage, or a cross-request cache. Mutation authorization re-reads the authoritative database state; an already-open browser can temporarily show an outdated button, but its next action must be denied after revocation. Define concurrent revocation semantics as taking effect for subsequent requests; an operation already authorized and running may finish.

## Settings permissions

| Section/action | Permission |
| --- | --- |
| Add, restore, or remove subjects | `subjects.manage` |
| Create/edit rooms, adjust capacity, activate/deactivate primary or overflow rooms | `exam_rooms.manage` |
| List and create school invite links | `invites.manage` |
| View Google Sheet configuration, link/unlink a spreadsheet | `google_sheets.manage` |
| Delete a school | `school.delete` |

Show Settings when at least one settings permission is present. This avoids a redundant `settings.view` grant that can drift from section permissions. Check both the navigation and content. A URL or stale section selection must fall back to an authorized section, including the legacy `?tab=invites` entry path. When permissions change while a component remains mounted, derive the effective section again rather than trusting the initial state.

The professor bootstrap is two grant rows: `subjects.manage` and `exam_rooms.manage`. Invites, Google Sheets, and school deletion are withheld by absence of their grants. No member-role-management permission is granted by this settings change.

## Extend the model across existing features

Do not advertise application-wide grant revocation while only Settings is migrated. Inventory and integrate these independent capabilities next:

- Member viewing, role changes, member removal, and self-booking permission management.
- Join-request viewing/review.
- School reservation viewing, scheduling for students, updating, and cancellation.
- Schedule-request viewing/review, with separate assigned-request and all-school scopes where necessary.
- Attendance viewing, marking, and temporary session override.

Roles remain useful for identity and workflow eligibility. Permission grants do not bypass reservation ownership, assigned-teacher constraints, target-member protections, `can_self_book`, active subject validation, duplicate rules, capacity locks, school-local dates, attendance windows, or active-school checks. For example, granting cancellation access for school reservations is distinct from a student's ability to cancel their own reservation.

A new feature still needs a permission key and checks implemented in its UI/server/database paths. Once that capability is integrated, assigning it to or removing it from a role is a Supabase-only change.

## Production rollout under AGENTS.md

1. Read the deployed RPC definitions, grants, policies, and relevant indexes. Capture the baseline access contract before changing it. Supabase tools are now connected; the subject/room RPCs were read for the interim migration, the rest remain to be inspected.
2. Prepare an additive migration adding the catalog, grant/audit tables, permission helpers, and caller-scoped read RPCs. Do not change existing role helpers, booking helpers, reservation rows, or existing RPC behavior.
3. Bootstrap existing access assignments through a committed seed migration (see review note 1), including the two professor settings grants. Validate these assignments before enabling the new application paths. Empty grants must fail closed; do not silently fall back to role-based access.
4. Add new permission-aware settings RPCs and, where necessary, an additional Edge Function. Preserve current validation, result shapes, and overflow logic after reviewing live definitions. Calling an old admin-only RPC from a wrapper does not grant professors access and is not a valid implementation.
5. Deploy permission-driven data loading, settings navigation/panels, and new action paths. Handle permission-load failures explicitly and deny privileged content. Preserve existing skeleton layout and request-loading behavior.
6. Verify the additive version in production with approved test accounts/actions. The booking harness writes to production and requires separate explicit authorization.
7. In a separate migration, after production verification and explicit approval, retire superseded application entry points and direct-table privileges/policies that could bypass the new permission checks. Inspect all clients first; do not revoke a shared underlying read policy needed by student workflows.
8. Integrate remaining feature groups using the same model. Once their legacy bypasses are closed, grant removal is authoritative across the application.

Important limitation: old role-based RPCs and permissive RLS policies continue authorizing their existing callers while the additive version is being verified. Hiding their UI or switching the frontend to a new RPC does not close this bypass. In particular, removing a grant from an admin is not fully enforced while that admin can still call an old admin-only endpoint. The legacy retirement phase is a security requirement, not optional housekeeping.

Before applying any remote migration, present its exact objects, privilege/policy changes, bootstrap assignments, verification steps, and rollback behavior for explicit user approval. A UI rollback does not remove newly granted backend access; bootstrap/grant rollback is a separate operation.

## Verification

Use an isolated database for authorization tests and fixtures; do not use production bookings as the default test suite.

- Anonymous callers, non-members, wrong-school callers, inactive schools, and unknown permissions are denied.
- School creators resolve consistently to admin grants without bypassing the grant relation.
- Adding/removing a grant changes the next authorized request without a login or deployment.
- Professors can use Subjects and Exam rooms (including overflow); Invites, Google Sheets, and school deletion are denied on direct calls as well as hidden in the UI.
- A denied requested settings section falls back safely; no available section hides Settings.
- Application users cannot edit global grants or audit history, forge a role, or change another school's data.
- Feature-specific protections remain unchanged when a new role receives a permission.
- After retirement, old RPCs, direct writes, and Edge Function paths cannot bypass revocation.
- Run lint and a production build for application changes. SQL parsing alone does not verify RLS or security-definer behavior.

## References

- Installed Next.js guidance: `node_modules/next/dist/docs/01-app/02-guides/authentication.md`.
- [Supabase RBAC model](https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac): role/permission relations and an authorization helper. This design resolves school membership from the database rather than copying the single JWT-role example.
- [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [Supabase function security](https://supabase.com/docs/guides/database/functions).
