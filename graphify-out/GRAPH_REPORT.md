# Graph Report - D:/Programming/JustSchedule  (2026-04-29)

## Corpus Check
- Corpus is ~6,090 words - fits in a single context window. You may not need a graph.

## Summary
- 54 nodes · 47 edges · 6 communities detected
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Schedule Component Plan|Schedule Component Plan]]
- [[_COMMUNITY_Spec & Design Docs|Spec & Design Docs]]
- [[_COMMUNITY_Shared Type System|Shared Type System]]
- [[_COMMUNITY_Next.js & Vercel Config|Next.js & Vercel Config]]
- [[_COMMUNITY_Vercel Assets|Vercel Assets]]
- [[_COMMUNITY_Project README|Project README]]

## God Nodes (most connected - your core abstractions)
1. `Exam Scheduler Implementation Plan` - 11 edges
2. `Schedule Page Component` - 5 edges
3. `SeatPickerModal Component` - 5 edges
4. `Exam Scheduler Design Spec` - 5 edges
5. `Schedule Types Module` - 4 edges
6. `CalendarPicker Component` - 3 edges
7. `SlotCardList Component` - 3 edges
8. `SlotCard Component` - 3 edges
9. `SeatGrid Component` - 3 edges
10. `Next.js Framework` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Next.js Logo SVG` --conceptually_related_to--> `Next.js Framework`  [INFERRED]
  public/next.svg → README.md
- `Vercel Logo SVG` --conceptually_related_to--> `Vercel Deployment Platform`  [INFERRED]
  public/vercel.svg → README.md
- `Next.js Agent Rules` --conceptually_related_to--> `Next.js Framework`  [INFERRED]
  AGENTS.md → README.md
- `Seat Picker Modal Spec` --semantically_similar_to--> `SeatPickerModal Component`  [INFERRED] [semantically similar]
  docs/superpowers/specs/2026-04-28-exam-scheduler-design.md → docs/superpowers/plans/2026-04-28-exam-scheduler.md
- `Date Picker Spec` --semantically_similar_to--> `CalendarPicker Component`  [INFERRED] [semantically similar]
  docs/superpowers/specs/2026-04-28-exam-scheduler-design.md → docs/superpowers/plans/2026-04-28-exam-scheduler.md

## Hyperedges (group relationships)
- **Schedule Page Component Tree** — plan_schedule_page, plan_calendarpicker, plan_slotcardlist, plan_slotcard, plan_seatpickermodal, plan_seatgrid, plan_seaticon, plan_daybookingsummary, plan_debugpanel [EXTRACTED 1.00]
- **Shared Schedule Type System** — plan_types_ts, plan_booking_type, plan_slotid_type, plan_slotdef_type, plan_constants_ts [EXTRACTED 1.00]

## Communities

### Community 0 - "Schedule Component Plan"
Cohesion: 0.27
Nodes (12): Schedule Constants Module, DayBookingSummary Component, DebugPanel Component, Exam Scheduler Implementation Plan, Schedule Page Component, SeatGrid Component, SeatIcon Component, SeatPickerModal Component (+4 more)

### Community 3 - "Spec & Design Docs"
Cohesion: 0.5
Nodes (5): CalendarPicker Component, Date Picker Spec, Exam Scheduler Design Spec, Local In-Memory State, Supabase Future Integration

### Community 4 - "Shared Type System"
Cohesion: 0.5
Nodes (4): Booking Type, SlotDef Interface, SlotId Type Union, Schedule Types Module

### Community 5 - "Next.js & Vercel Config"
Cohesion: 0.67
Nodes (3): Next.js Agent Rules, Next.js Logo SVG, Next.js Framework

### Community 10 - "Vercel Assets"
Cohesion: 1.0
Nodes (2): Vercel Logo SVG, Vercel Deployment Platform

### Community 19 - "Project README"
Cohesion: 1.0
Nodes (1): JustSchedule Project README

## Knowledge Gaps
- **9 isolated node(s):** `Next.js Agent Rules`, `JustSchedule Project README`, `Vercel Deployment Platform`, `Schedule Constants Module`, `Booking Type` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Vercel Assets`** (2 nodes): `Vercel Logo SVG`, `Vercel Deployment Platform`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Project README`** (1 nodes): `JustSchedule Project README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Exam Scheduler Implementation Plan` connect `Schedule Component Plan` to `Spec & Design Docs`, `Shared Type System`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Why does `Schedule Types Module` connect `Shared Type System` to `Schedule Component Plan`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `Exam Scheduler Design Spec` connect `Spec & Design Docs` to `Schedule Component Plan`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `Next.js Agent Rules`, `JustSchedule Project README`, `Vercel Deployment Platform` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._