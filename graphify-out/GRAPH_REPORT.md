# Graph Report - .  (2026-04-30)

## Corpus Check
- 46 files · ~103,821 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 89 nodes · 49 edges · 15 communities detected
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_CalendarPanel Logic|CalendarPanel Logic]]
- [[_COMMUNITY_Auth & Server-Side Routing|Auth & Server-Side Routing]]
- [[_COMMUNITY_UI Utilities (Badgecn)|UI Utilities (Badge/cn)]]
- [[_COMMUNITY_Project README & Stack|Project README & Stack]]
- [[_COMMUNITY_Supabase Schema & RLS|Supabase Schema & RLS]]
- [[_COMMUNITY_Plan & Spec Docs|Plan & Spec Docs]]
- [[_COMMUNITY_UI Mockup & System Overview|UI Mockup & System Overview]]
- [[_COMMUNITY_Agent Rules|Agent Rules]]
- [[_COMMUNITY_Slot Reference Config|Slot Reference Config]]
- [[_COMMUNITY_Swap Requests Schema|Swap Requests Schema]]
- [[_COMMUNITY_UI Component Structure|UI Component Structure]]
- [[_COMMUNITY_Schedule Page (Docs)|Schedule Page (Docs)]]
- [[_COMMUNITY_Booking Flow (Docs)|Booking Flow (Docs)]]
- [[_COMMUNITY_Design System|Design System]]
- [[_COMMUNITY_Weekly Schedule Mockup|Weekly Schedule Mockup]]

## God Nodes (most connected - your core abstractions)
1. `getDayStatus()` - 3 edges
2. `createClient()` - 3 edges
3. `GET()` - 2 edges
4. `SchedulePage()` - 2 edges
5. `isWeekend()` - 2 edges
6. `isPast()` - 2 edges
7. `Badge()` - 2 edges
8. `cn()` - 2 edges
9. `JustSchedule Project` - 2 edges
10. `Supabase Integration` - 2 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `createClient()`  [INFERRED]
  app\auth\callback\route.ts → lib\supabase\server.ts
- `SchedulePage()` --calls--> `createClient()`  [INFERRED]
  app\schedule\page.tsx → lib\supabase\server.ts
- `Badge()` --calls--> `cn()`  [INFERRED]
  components\ui\badge.tsx → lib\utils.ts
- `JustSchedule UI Mockup (Full Dashboard)` --conceptually_related_to--> `JustSchedule System Overview`  [INFERRED]
  docs/ChatGPT Image Apr 29, 2026, 09_51_58 AM.png → docs/system-design.md
- `Spec: Booking Data Model` --conceptually_related_to--> `Booking Record Data Model`  [INFERRED]
  docs/superpowers/specs/2026-04-28-exam-scheduler-design.md → docs/system-design.md

## Communities

### Community 0 - "CalendarPanel Logic"
Cohesion: 0.38
Nodes (3): getDayStatus(), isPast(), isWeekend()

### Community 1 - "Auth & Server-Side Routing"
Cohesion: 0.33
Nodes (3): GET(), SchedulePage(), createClient()

### Community 4 - "UI Utilities (Badge/cn)"
Cohesion: 0.5
Nodes (2): cn(), Badge()

### Community 5 - "Project README & Stack"
Cohesion: 0.5
Nodes (4): Google Auth Provider, JustSchedule Project, Next.js Framework, Supabase Integration

### Community 6 - "Supabase Schema & RLS"
Cohesion: 0.5
Nodes (4): Spec: Booking Data Model, Booking Record Data Model, Row Level Security Policy, Supabase Bookings Schema

### Community 22 - "Plan & Spec Docs"
Cohesion: 1.0
Nodes (2): Exam Scheduler Implementation Plan, Exam Scheduler Design Spec

### Community 23 - "UI Mockup & System Overview"
Cohesion: 1.0
Nodes (2): JustSchedule UI Mockup (Full Dashboard), JustSchedule System Overview

### Community 34 - "Agent Rules"
Cohesion: 1.0
Nodes (1): Next.js Agent Rules

### Community 35 - "Slot Reference Config"
Cohesion: 1.0
Nodes (1): Slot Reference (Static Config)

### Community 36 - "Swap Requests Schema"
Cohesion: 1.0
Nodes (1): Swap Requests Schema (Proposed)

### Community 37 - "UI Component Structure"
Cohesion: 1.0
Nodes (1): UI Component Structure

### Community 38 - "Schedule Page (Docs)"
Cohesion: 1.0
Nodes (1): Schedule Page Orchestrator

### Community 39 - "Booking Flow (Docs)"
Cohesion: 1.0
Nodes (1): Booking Flow

### Community 40 - "Design System"
Cohesion: 1.0
Nodes (1): Design System (CSS Custom Properties)

### Community 41 - "Weekly Schedule Mockup"
Cohesion: 1.0
Nodes (1): Weekly Schedule Grid (Dark Theme Concept)

## Knowledge Gaps
- **16 isolated node(s):** `Next.js Agent Rules`, `Next.js Framework`, `Google Auth Provider`, `JustSchedule System Overview`, `Slot Reference (Static Config)` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `UI Utilities (Badge/cn)`** (4 nodes): `badge.tsx`, `cn()`, `utils.ts`, `Badge()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Plan & Spec Docs`** (2 nodes): `Exam Scheduler Implementation Plan`, `Exam Scheduler Design Spec`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Mockup & System Overview`** (2 nodes): `JustSchedule UI Mockup (Full Dashboard)`, `JustSchedule System Overview`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Agent Rules`** (1 nodes): `Next.js Agent Rules`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Slot Reference Config`** (1 nodes): `Slot Reference (Static Config)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Swap Requests Schema`** (1 nodes): `Swap Requests Schema (Proposed)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Component Structure`** (1 nodes): `UI Component Structure`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Schedule Page (Docs)`** (1 nodes): `Schedule Page Orchestrator`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Booking Flow (Docs)`** (1 nodes): `Booking Flow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Design System`** (1 nodes): `Design System (CSS Custom Properties)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Weekly Schedule Mockup`** (1 nodes): `Weekly Schedule Grid (Dark Theme Concept)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 2 inferred relationships involving `createClient()` (e.g. with `GET()` and `SchedulePage()`) actually correct?**
  _`createClient()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Next.js Agent Rules`, `Next.js Framework`, `Google Auth Provider` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._