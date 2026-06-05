# Graph Report - JustSchedule  (2026-06-05)

## Corpus Check
- 83 files · ~97,309 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 270 nodes · 288 edges · 24 communities detected
- Extraction: 71% EXTRACTED · 29% INFERRED · 0% AMBIGUOUS · INFERRED: 83 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 28 edges
2. `getUserFacingErrorMessage()` - 20 edges
3. `GET()` - 11 edges
4. `getUserFacingFunctionErrorMessage()` - 9 edges
5. `getAccessToken()` - 6 edges
6. `select()` - 6 edges
7. `SchedulePage()` - 5 edges
8. `requestSchoolJoin()` - 5 edges
9. `createSchoolInvite()` - 5 edges
10. `reviewSchoolJoinRequests()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `handleCancelReservation()` --calls--> `getUserFacingFunctionErrorMessage()`  [INFERRED]
  app\dashboard\schedule\ScheduleClient.tsx → lib\user-facing-errors.ts
- `GET()` --calls--> `select()`  [INFERRED]
  app\auth\callback\route.ts → components\schedule\SubjectCommandPalette.tsx
- `GET()` --calls--> `getRequestOrigin()`  [INFERRED]
  app\auth\callback\route.ts → lib\urls.ts
- `registerSchool()` --calls--> `getUserFacingErrorMessage()`  [INFERRED]
  app\dashboard\actions.ts → lib\user-facing-errors.ts
- `requestDirectJoin()` --calls--> `getUserFacingErrorMessage()`  [INFERRED]
  app\dashboard\actions.ts → lib\user-facing-errors.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.1
Nodes (17): Home(), decodeCookieValue(), GET(), registerSchool(), requestDirectJoin(), requestSchoolJoin(), getRequestOrigin(), sanitizeRelativePath() (+9 more)

### Community 1 - "Community 1"
Cohesion: 0.14
Nodes (17): cancelSchoolReservation(), createExamSlot(), createOverflowExamSlot(), getAccessToken(), normalizeExamSlot(), reviewSchoolJoinRequests(), scheduleExamForStudent(), setExamSlotActive() (+9 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (11): leaveSchool(), getUserFacingErrorMessage(), getUserFacingFunctionErrorMessage(), isResponseLike(), messageIncludes(), normalizeMessage(), readFunctionErrorBody(), softDeleteSchool() (+3 more)

### Community 3 - "Community 3"
Cohesion: 0.24
Nodes (6): formatLocalDate(), getSchoolId(), SchedulePage(), closePalette(), handleKey(), select()

### Community 4 - "Community 4"
Cohesion: 0.23
Nodes (7): createSchoolInvite(), addDays(), dateInputToEndOfDay(), getDefaultExpiryDate(), getMaxBookingDate(), getTodayKey(), createInvite()

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (7): kickSchoolMember(), setStudentSelfBookingPermission(), updateMemberRoles(), confirmRoleChanges(), kickMember(), openScheduleDialog(), toggleSelfBooking()

### Community 6 - "Community 6"
Cohesion: 0.39
Nodes (5): getDayStatus(), isOutsideBookingWindow(), isPast(), isWeekend(), toISO()

### Community 8 - "Community 8"
Cohesion: 0.29
Nodes (1): handleCancelReservation()

### Community 9 - "Community 9"
Cohesion: 0.29
Nodes (3): proxy(), createClient(), getSupabaseEnv()

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (2): handleKeyDown(), selectSubject()

### Community 16 - "Community 16"
Cohesion: 0.83
Nodes (3): getAttendanceWindowLabel(), getSlotDateTime(), isAttendanceMarkingOpen()

### Community 17 - "Community 17"
Cohesion: 0.5
Nodes (2): cn(), Badge()

### Community 21 - "Community 21"
Cohesion: 0.5
Nodes (4): Google Auth Provider, JustSchedule Project, Next.js Framework, Supabase Integration

### Community 22 - "Community 22"
Cohesion: 0.5
Nodes (4): Spec: Booking Data Model, Booking Record Data Model, Row Level Security Policy, Supabase Bookings Schema

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (2): Exam Scheduler Implementation Plan, Exam Scheduler Design Spec

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (2): JustSchedule UI Mockup (Full Dashboard), JustSchedule System Overview

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (1): Next.js Agent Rules

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (1): Slot Reference (Static Config)

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (1): Swap Requests Schema (Proposed)

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (1): UI Component Structure

### Community 71 - "Community 71"
Cohesion: 1.0
Nodes (1): Schedule Page Orchestrator

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (1): Booking Flow

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (1): Design System (CSS Custom Properties)

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (1): Weekly Schedule Grid (Dark Theme Concept)

## Knowledge Gaps
- **16 isolated node(s):** `Next.js Agent Rules`, `Next.js Framework`, `Google Auth Provider`, `JustSchedule System Overview`, `Slot Reference (Static Config)` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 8`** (7 nodes): `ScheduleClient.tsx`, `handleCancelReservation()`, `handleDateSelect()`, `handleReserve()`, `handleReset()`, `handleSlotSelect()`, `selectPanel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (5 nodes): `SubjectCombobox.tsx`, `handleInputChange()`, `handleKeyDown()`, `handlePointerDown()`, `selectSubject()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (4 nodes): `badge.tsx`, `utils.ts`, `cn()`, `Badge()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (2 nodes): `Exam Scheduler Implementation Plan`, `Exam Scheduler Design Spec`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `JustSchedule UI Mockup (Full Dashboard)`, `JustSchedule System Overview`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (1 nodes): `Next.js Agent Rules`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (1 nodes): `Slot Reference (Static Config)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (1 nodes): `Swap Requests Schema (Proposed)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `UI Component Structure`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (1 nodes): `Schedule Page Orchestrator`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (1 nodes): `Booking Flow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (1 nodes): `Design System (CSS Custom Properties)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (1 nodes): `Weekly Schedule Grid (Dark Theme Concept)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 9`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `getUserFacingErrorMessage()` connect `Community 2` to `Community 0`, `Community 1`, `Community 5`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `getUserFacingFunctionErrorMessage()` connect `Community 2` to `Community 8`, `Community 1`, `Community 4`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Are the 27 inferred relationships involving `createClient()` (e.g. with `Home()` and `GET()`) actually correct?**
  _`createClient()` has 27 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `getUserFacingErrorMessage()` (e.g. with `registerSchool()` and `requestDirectJoin()`) actually correct?**
  _`getUserFacingErrorMessage()` has 16 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `GET()` (e.g. with `sanitizeRelativePath()` and `createClient()`) actually correct?**
  _`GET()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `getUserFacingFunctionErrorMessage()` (e.g. with `handleCancelReservation()` and `createSchoolInvite()`) actually correct?**
  _`getUserFacingFunctionErrorMessage()` has 5 INFERRED edges - model-reasoned connections that need verification._