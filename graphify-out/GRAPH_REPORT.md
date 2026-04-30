# Graph Report - JustSchedule  (2026-04-30)

## Corpus Check
- 39 files · ~56,537 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 103 nodes · 62 edges · 15 communities detected
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 7 edges
2. `GET()` - 3 edges
3. `registerSchool()` - 3 edges
4. `getDayStatus()` - 3 edges
5. `Home()` - 2 edges
6. `SchedulePage()` - 2 edges
7. `handleSubmit()` - 2 edges
8. `isWeekend()` - 2 edges
9. `isPast()` - 2 edges
10. `handleSignOut()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Home()` --calls--> `createClient()`  [INFERRED]
  app\page.tsx → lib\supabase\server.ts
- `SchedulePage()` --calls--> `createClient()`  [INFERRED]
  app\dashboard\schedule\page.tsx → lib\supabase\server.ts
- `handleSubmit()` --calls--> `createClient()`  [INFERRED]
  app\login\page.tsx → lib\supabase\server.ts
- `handleSignOut()` --calls--> `createClient()`  [INFERRED]
  components\schedule\Navbar.tsx → lib\supabase\server.ts
- `GET()` --calls--> `createClient()`  [INFERRED]
  app\auth\callback\route.ts → lib\supabase\server.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.15
Nodes (7): Home(), GET(), registerSchool(), handleSubmit(), handleSignOut(), SchedulePage(), createClient()

### Community 1 - "Community 1"
Cohesion: 0.38
Nodes (3): getDayStatus(), isPast(), isWeekend()

### Community 5 - "Community 5"
Cohesion: 0.5
Nodes (2): cn(), Badge()

### Community 6 - "Community 6"
Cohesion: 0.5
Nodes (4): Google Auth Provider, JustSchedule Project, Next.js Framework, Supabase Integration

### Community 7 - "Community 7"
Cohesion: 0.5
Nodes (4): Spec: Booking Data Model, Booking Record Data Model, Row Level Security Policy, Supabase Bookings Schema

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (2): Exam Scheduler Implementation Plan, Exam Scheduler Design Spec

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (2): JustSchedule UI Mockup (Full Dashboard), JustSchedule System Overview

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (1): Next.js Agent Rules

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (1): Slot Reference (Static Config)

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (1): Swap Requests Schema (Proposed)

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (1): UI Component Structure

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (1): Schedule Page Orchestrator

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (1): Booking Flow

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (1): Design System (CSS Custom Properties)

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (1): Weekly Schedule Grid (Dark Theme Concept)

## Knowledge Gaps
- **16 isolated node(s):** `Next.js Agent Rules`, `Next.js Framework`, `Google Auth Provider`, `JustSchedule System Overview`, `Slot Reference (Static Config)` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 5`** (4 nodes): `badge.tsx`, `cn()`, `utils.ts`, `Badge()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (2 nodes): `Exam Scheduler Implementation Plan`, `Exam Scheduler Design Spec`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (2 nodes): `JustSchedule UI Mockup (Full Dashboard)`, `JustSchedule System Overview`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `Next.js Agent Rules`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `Slot Reference (Static Config)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `Swap Requests Schema (Proposed)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `UI Component Structure`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `Schedule Page Orchestrator`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `Booking Flow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `Design System (CSS Custom Properties)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `Weekly Schedule Grid (Dark Theme Concept)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 6 inferred relationships involving `createClient()` (e.g. with `Home()` and `GET()`) actually correct?**
  _`createClient()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `GET()` (e.g. with `createClient()` and `registerSchool()`) actually correct?**
  _`GET()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `registerSchool()` (e.g. with `GET()` and `createClient()`) actually correct?**
  _`registerSchool()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Next.js Agent Rules`, `Next.js Framework`, `Google Auth Provider` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._