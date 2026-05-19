# Graph Report - JustSchedule  (2026-05-14)

## Corpus Check
- 55 files · ~81,008 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 193 nodes · 175 edges · 21 communities detected
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 10 edges
2. `GET()` - 9 edges
3. `getUserFacingErrorMessage()` - 9 edges
4. `select()` - 6 edges
5. `SchedulePage()` - 5 edges
6. `requestSchoolJoin()` - 5 edges
7. `getUserFacingFunctionErrorMessage()` - 5 edges
8. `registerSchool()` - 4 edges
9. `getDayStatus()` - 4 edges
10. `normalizeMessage()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `handleCancelReservation()` --calls--> `getUserFacingFunctionErrorMessage()`  [INFERRED]
  app\dashboard\schedule\ScheduleClient.tsx → lib\user-facing-errors.ts
- `GET()` --calls--> `select()`  [INFERRED]
  app\auth\callback\route.ts → components\schedule\SubjectCommandPalette.tsx
- `GET()` --calls--> `getRequestOrigin()`  [INFERRED]
  app\auth\callback\route.ts → lib\urls.ts
- `registerSchool()` --calls--> `getUserFacingErrorMessage()`  [INFERRED]
  app\dashboard\actions.ts → lib\user-facing-errors.ts
- `SchedulePage()` --calls--> `createClient()`  [INFERRED]
  app\dashboard\schedule\page.tsx → lib\supabase\server.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.15
Nodes (10): Home(), decodeCookieValue(), GET(), registerSchool(), requestSchoolJoin(), getRequestOrigin(), sanitizeRelativePath(), handleSubmit() (+2 more)

### Community 1 - "Community 1"
Cohesion: 0.18
Nodes (9): leaveSchool(), getUserFacingErrorMessage(), getUserFacingFunctionErrorMessage(), isResponseLike(), messageIncludes(), normalizeMessage(), readFunctionErrorBody(), joinRequestsError() (+1 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (7): addDays(), getAttendanceWindowLabel(), getMaxBookingDate(), getSlotDateTime(), getTodayKey(), isAttendanceMarkingOpen(), SchoolManagementTabs()

### Community 3 - "Community 3"
Cohesion: 0.24
Nodes (6): formatLocalDate(), getSchoolId(), SchedulePage(), closePalette(), handleKey(), select()

### Community 4 - "Community 4"
Cohesion: 0.36
Nodes (4): getDayStatus(), isOutsideBookingWindow(), isPast(), isWeekend()

### Community 5 - "Community 5"
Cohesion: 0.29
Nodes (3): proxy(), createClient(), getSupabaseEnv()

### Community 7 - "Community 7"
Cohesion: 0.29
Nodes (1): handleCancelReservation()

### Community 12 - "Community 12"
Cohesion: 0.5
Nodes (2): handleKeyDown(), selectSubject()

### Community 13 - "Community 13"
Cohesion: 0.5
Nodes (2): cn(), Badge()

### Community 17 - "Community 17"
Cohesion: 0.5
Nodes (4): Google Auth Provider, JustSchedule Project, Next.js Framework, Supabase Integration

### Community 18 - "Community 18"
Cohesion: 0.5
Nodes (4): Spec: Booking Data Model, Booking Record Data Model, Row Level Security Policy, Supabase Bookings Schema

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (2): Exam Scheduler Implementation Plan, Exam Scheduler Design Spec

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (2): JustSchedule UI Mockup (Full Dashboard), JustSchedule System Overview

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (1): Next.js Agent Rules

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (1): Slot Reference (Static Config)

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (1): Swap Requests Schema (Proposed)

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (1): UI Component Structure

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (1): Schedule Page Orchestrator

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (1): Booking Flow

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (1): Design System (CSS Custom Properties)

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (1): Weekly Schedule Grid (Dark Theme Concept)

## Knowledge Gaps
- **16 isolated node(s):** `Next.js Agent Rules`, `Next.js Framework`, `Google Auth Provider`, `JustSchedule System Overview`, `Slot Reference (Static Config)` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 7`** (7 nodes): `ScheduleClient.tsx`, `handleCancelReservation()`, `handleDateSelect()`, `handleReserve()`, `handleReset()`, `handleSlotSelect()`, `selectPanel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (5 nodes): `SubjectCombobox.tsx`, `handleInputChange()`, `handleKeyDown()`, `handlePointerDown()`, `selectSubject()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (4 nodes): `badge.tsx`, `cn()`, `utils.ts`, `Badge()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (2 nodes): `Exam Scheduler Implementation Plan`, `Exam Scheduler Design Spec`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (2 nodes): `JustSchedule UI Mockup (Full Dashboard)`, `JustSchedule System Overview`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `Next.js Agent Rules`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `Slot Reference (Static Config)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `Swap Requests Schema (Proposed)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `UI Component Structure`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `Schedule Page Orchestrator`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `Booking Flow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `Design System (CSS Custom Properties)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `Weekly Schedule Grid (Dark Theme Concept)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `Community 0` to `Community 1`, `Community 3`, `Community 5`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `getUserFacingErrorMessage()` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `requestSchoolJoin()` connect `Community 0` to `Community 1`, `Community 3`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `createClient()` (e.g. with `Home()` and `GET()`) actually correct?**
  _`createClient()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 7 inferred relationships involving `GET()` (e.g. with `sanitizeRelativePath()` and `createClient()`) actually correct?**
  _`GET()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `getUserFacingErrorMessage()` (e.g. with `registerSchool()` and `membersError()`) actually correct?**
  _`getUserFacingErrorMessage()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `select()` (e.g. with `GET()` and `SchedulePage()`) actually correct?**
  _`select()` has 3 INFERRED edges - model-reasoned connections that need verification._