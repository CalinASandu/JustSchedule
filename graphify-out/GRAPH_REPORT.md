# Graph Report - JustSchedule  (2026-05-01)

## Corpus Check
- 46 files · ~61,614 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 129 nodes · 90 edges · 17 communities detected
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]

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
- `leaveSchool()` --calls--> `createClient()`  [INFERRED]
  components\dashboard\LeaveSchoolButton.tsx → lib\supabase\server.ts
- `Home()` --calls--> `createClient()`  [INFERRED]
  app\page.tsx → lib\supabase\server.ts
- `SchedulePage()` --calls--> `createClient()`  [INFERRED]
  app\dashboard\schedule\page.tsx → lib\supabase\server.ts
- `handleSignOut()` --calls--> `createClient()`  [INFERRED]
  components\schedule\Navbar.tsx → lib\supabase\server.ts
- `GET()` --calls--> `createClient()`  [INFERRED]
  app\auth\callback\route.ts → lib\supabase\server.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.17
Nodes (8): GET(), registerSchool(), requestSchoolJoin(), handleSubmit(), handleSignOut(), getInitials(), SchoolDashboardPage(), createClient()

### Community 1 - "Community 1"
Cohesion: 0.38
Nodes (3): getDayStatus(), isPast(), isWeekend()

### Community 5 - "Community 5"
Cohesion: 0.4
Nodes (4): Home(), sanitizeNext(), getSchoolId(), SchedulePage()

### Community 7 - "Community 7"
Cohesion: 0.5
Nodes (1): leaveSchool()

### Community 8 - "Community 8"
Cohesion: 0.5
Nodes (2): cn(), Badge()

### Community 9 - "Community 9"
Cohesion: 0.5
Nodes (4): Google Auth Provider, JustSchedule Project, Next.js Framework, Supabase Integration

### Community 10 - "Community 10"
Cohesion: 0.5
Nodes (4): Spec: Booking Data Model, Booking Record Data Model, Row Level Security Policy, Supabase Bookings Schema

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (2): Exam Scheduler Implementation Plan, Exam Scheduler Design Spec

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (2): JustSchedule UI Mockup (Full Dashboard), JustSchedule System Overview

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (1): Next.js Agent Rules

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (1): Slot Reference (Static Config)

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (1): Swap Requests Schema (Proposed)

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (1): UI Component Structure

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (1): Schedule Page Orchestrator

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (1): Booking Flow

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (1): Design System (CSS Custom Properties)

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (1): Weekly Schedule Grid (Dark Theme Concept)

## Knowledge Gaps
- **16 isolated node(s):** `Next.js Agent Rules`, `Next.js Framework`, `Google Auth Provider`, `JustSchedule System Overview`, `Slot Reference (Static Config)` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 7`** (4 nodes): `LeaveSchoolButton.tsx`, `closeDialog()`, `leaveSchool()`, `openDialog()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 8`** (4 nodes): `badge.tsx`, `cn()`, `utils.ts`, `Badge()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (2 nodes): `Exam Scheduler Implementation Plan`, `Exam Scheduler Design Spec`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `JustSchedule UI Mockup (Full Dashboard)`, `JustSchedule System Overview`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `Next.js Agent Rules`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `Slot Reference (Static Config)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `Swap Requests Schema (Proposed)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `UI Component Structure`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `Schedule Page Orchestrator`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `Booking Flow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `Design System (CSS Custom Properties)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `Weekly Schedule Grid (Dark Theme Concept)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `Community 0` to `Community 5`, `Community 7`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `leaveSchool()` connect `Community 7` to `Community 0`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
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