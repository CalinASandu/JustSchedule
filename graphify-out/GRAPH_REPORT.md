# Graph Report - JustSchedule  (2026-05-01)

## Corpus Check
- 46 files · ~64,032 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 135 nodes · 96 edges · 18 communities detected
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 10 edges
2. `GET()` - 6 edges
3. `SchoolDashboardPage()` - 4 edges
4. `Home()` - 3 edges
5. `registerSchool()` - 3 edges
6. `SchedulePage()` - 3 edges
7. `requestSchoolJoin()` - 3 edges
8. `handleSubmit()` - 3 edges
9. `getDayStatus()` - 3 edges
10. `sanitizeNext()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Home()` --calls--> `createClient()`  [INFERRED]
  app\page.tsx → lib\supabase\server.ts
- `GET()` --calls--> `SchoolDashboardPage()`  [INFERRED]
  app\auth\callback\route.ts → app\dashboard\schools\[schoolId]\page.tsx
- `SchedulePage()` --calls--> `createClient()`  [INFERRED]
  app\dashboard\schedule\page.tsx → lib\supabase\server.ts
- `SchoolDashboardPage()` --calls--> `createClient()`  [INFERRED]
  app\dashboard\schools\[schoolId]\page.tsx → lib\supabase\server.ts
- `leaveSchool()` --calls--> `createClient()`  [INFERRED]
  components\dashboard\LeaveSchoolButton.tsx → lib\supabase\server.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.15
Nodes (7): GET(), registerSchool(), leaveSchool(), requestSchoolJoin(), handleSubmit(), handleSignOut(), createClient()

### Community 2 - "Community 2"
Cohesion: 0.38
Nodes (3): getDayStatus(), isPast(), isWeekend()

### Community 6 - "Community 6"
Cohesion: 0.5
Nodes (2): getInitials(), SchoolDashboardPage()

### Community 7 - "Community 7"
Cohesion: 0.5
Nodes (2): cn(), Badge()

### Community 8 - "Community 8"
Cohesion: 0.5
Nodes (4): Google Auth Provider, JustSchedule Project, Next.js Framework, Supabase Integration

### Community 9 - "Community 9"
Cohesion: 0.5
Nodes (4): Spec: Booking Data Model, Booking Record Data Model, Row Level Security Policy, Supabase Bookings Schema

### Community 10 - "Community 10"
Cohesion: 1.0
Nodes (2): Home(), sanitizeNext()

### Community 12 - "Community 12"
Cohesion: 1.0
Nodes (2): getSchoolId(), SchedulePage()

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (2): JustSchedule UI Mockup (Full Dashboard), JustSchedule System Overview

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (2): Exam Scheduler Implementation Plan, Exam Scheduler Design Spec

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (1): Next.js Agent Rules

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (1): Slot Reference (Static Config)

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (1): Swap Requests Schema (Proposed)

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (1): UI Component Structure

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (1): Schedule Page Orchestrator

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (1): Booking Flow

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (1): Design System (CSS Custom Properties)

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (1): Weekly Schedule Grid (Dark Theme Concept)

## Knowledge Gaps
- **16 isolated node(s):** `Next.js Agent Rules`, `Next.js Framework`, `Google Auth Provider`, `JustSchedule System Overview`, `Slot Reference (Static Config)` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 6`** (5 nodes): `page.tsx`, `formatMemberName()`, `getInitials()`, `normalizeRole()`, `SchoolDashboardPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 7`** (4 nodes): `badge.tsx`, `cn()`, `utils.ts`, `Badge()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (3 nodes): `Home()`, `sanitizeNext()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (3 nodes): `page.tsx`, `getSchoolId()`, `SchedulePage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `JustSchedule UI Mockup (Full Dashboard)`, `JustSchedule System Overview`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (2 nodes): `Exam Scheduler Implementation Plan`, `Exam Scheduler Design Spec`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `Next.js Agent Rules`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `Slot Reference (Static Config)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `Swap Requests Schema (Proposed)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `UI Component Structure`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `Schedule Page Orchestrator`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `Booking Flow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `Design System (CSS Custom Properties)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `Weekly Schedule Grid (Dark Theme Concept)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `Community 0` to `Community 10`, `Community 12`, `Community 6`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `SchoolDashboardPage()` connect `Community 6` to `Community 0`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `createClient()` (e.g. with `Home()` and `GET()`) actually correct?**
  _`createClient()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `GET()` (e.g. with `createClient()` and `registerSchool()`) actually correct?**
  _`GET()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `SchoolDashboardPage()` (e.g. with `createClient()` and `GET()`) actually correct?**
  _`SchoolDashboardPage()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `registerSchool()` (e.g. with `GET()` and `createClient()`) actually correct?**
  _`registerSchool()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Next.js Agent Rules`, `Next.js Framework`, `Google Auth Provider` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._