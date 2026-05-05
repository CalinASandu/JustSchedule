# Graph Report - JustSchedule  (2026-05-05)

## Corpus Check
- 51 files · ~69,496 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 163 nodes · 133 edges · 18 communities detected
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 10 edges
2. `GET()` - 7 edges
3. `getUserFacingErrorMessage()` - 7 edges
4. `registerSchool()` - 4 edges
5. `SchedulePage()` - 4 edges
6. `requestSchoolJoin()` - 4 edges
7. `getDayStatus()` - 4 edges
8. `normalizeMessage()` - 4 edges
9. `readFunctionErrorBody()` - 4 edges
10. `getUserFacingFunctionErrorMessage()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `getRequestOrigin()`  [INFERRED]
  app\auth\callback\route.ts → lib\urls.ts
- `registerSchool()` --calls--> `getUserFacingErrorMessage()`  [INFERRED]
  app\dashboard\actions.ts → lib\user-facing-errors.ts
- `SchedulePage()` --calls--> `createClient()`  [INFERRED]
  app\dashboard\schedule\page.tsx → lib\supabase\server.ts
- `requestSchoolJoin()` --calls--> `getUserFacingErrorMessage()`  [INFERRED]
  app\invite\actions.ts → lib\user-facing-errors.ts
- `leaveSchool()` --calls--> `createClient()`  [INFERRED]
  components\dashboard\LeaveSchoolButton.tsx → lib\supabase\server.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.15
Nodes (9): Home(), GET(), registerSchool(), requestSchoolJoin(), getRequestOrigin(), sanitizeRelativePath(), handleSubmit(), handleSignOut() (+1 more)

### Community 1 - "Community 1"
Cohesion: 0.31
Nodes (7): leaveSchool(), getUserFacingErrorMessage(), getUserFacingFunctionErrorMessage(), isResponseLike(), messageIncludes(), normalizeMessage(), readFunctionErrorBody()

### Community 3 - "Community 3"
Cohesion: 0.36
Nodes (4): getDayStatus(), isOutsideBookingWindow(), isPast(), isWeekend()

### Community 4 - "Community 4"
Cohesion: 0.29
Nodes (3): proxy(), createClient(), getSupabaseEnv()

### Community 5 - "Community 5"
Cohesion: 0.38
Nodes (3): formatLocalDate(), getSchoolId(), SchedulePage()

### Community 12 - "Community 12"
Cohesion: 0.5
Nodes (2): cn(), Badge()

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (4): Google Auth Provider, JustSchedule Project, Next.js Framework, Supabase Integration

### Community 16 - "Community 16"
Cohesion: 0.5
Nodes (4): Spec: Booking Data Model, Booking Record Data Model, Row Level Security Policy, Supabase Bookings Schema

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (2): Exam Scheduler Implementation Plan, Exam Scheduler Design Spec

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (2): JustSchedule UI Mockup (Full Dashboard), JustSchedule System Overview

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (1): Next.js Agent Rules

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (1): Slot Reference (Static Config)

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (1): Swap Requests Schema (Proposed)

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (1): UI Component Structure

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (1): Schedule Page Orchestrator

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (1): Booking Flow

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (1): Design System (CSS Custom Properties)

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (1): Weekly Schedule Grid (Dark Theme Concept)

## Knowledge Gaps
- **16 isolated node(s):** `Next.js Agent Rules`, `Next.js Framework`, `Google Auth Provider`, `JustSchedule System Overview`, `Slot Reference (Static Config)` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 12`** (4 nodes): `badge.tsx`, `cn()`, `utils.ts`, `Badge()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `Exam Scheduler Implementation Plan`, `Exam Scheduler Design Spec`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (2 nodes): `JustSchedule UI Mockup (Full Dashboard)`, `JustSchedule System Overview`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `Next.js Agent Rules`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `Slot Reference (Static Config)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `Swap Requests Schema (Proposed)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `UI Component Structure`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `Schedule Page Orchestrator`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `Booking Flow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `Design System (CSS Custom Properties)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `Weekly Schedule Grid (Dark Theme Concept)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `Community 0` to `Community 1`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `getSupabaseEnv()` connect `Community 4` to `Community 0`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `getUserFacingErrorMessage()` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `createClient()` (e.g. with `Home()` and `GET()`) actually correct?**
  _`createClient()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `GET()` (e.g. with `sanitizeRelativePath()` and `createClient()`) actually correct?**
  _`GET()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `getUserFacingErrorMessage()` (e.g. with `registerSchool()` and `requestSchoolJoin()`) actually correct?**
  _`getUserFacingErrorMessage()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `registerSchool()` (e.g. with `GET()` and `createClient()`) actually correct?**
  _`registerSchool()` has 3 INFERRED edges - model-reasoned connections that need verification._