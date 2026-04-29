# Graph Report - JustSchedule  (2026-04-29)

## Corpus Check
- 27 files · ~103,271 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 83 nodes · 66 edges · 8 communities detected
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 31|Community 31]]

## God Nodes (most connected - your core abstractions)
1. `Exam Scheduler Implementation Plan` - 11 edges
2. `Schedule Page Component` - 5 edges
3. `SeatPickerModal Component` - 5 edges
4. `Exam Scheduler Design Spec` - 5 edges
5. `Schedule Types Module` - 4 edges
6. `getDayStatus()` - 3 edges
7. `CalendarPicker Component` - 3 edges
8. `SlotCardList Component` - 3 edges
9. `SlotCard Component` - 3 edges
10. `SeatGrid Component` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Next.js Framework` --conceptually_related_to--> `Next.js Logo SVG`  [INFERRED]
  README.md → public/next.svg
- `Vercel Deployment Platform` --conceptually_related_to--> `Vercel Logo SVG`  [INFERRED]
  README.md → public/vercel.svg
- `SeatPickerModal Component` --semantically_similar_to--> `Seat Picker Modal Spec`  [INFERRED] [semantically similar]
  docs/superpowers/plans/2026-04-28-exam-scheduler.md → docs/superpowers/specs/2026-04-28-exam-scheduler-design.md
- `Badge()` --calls--> `cn()`  [INFERRED]
  components\ui\badge.tsx → lib\utils.ts
- `Next.js Agent Rules` --conceptually_related_to--> `Next.js Framework`  [INFERRED]
  AGENTS.md → README.md

## Hyperedges (group relationships)
- **Schedule Page Component Tree** — plan_schedule_page, plan_calendarpicker, plan_slotcardlist, plan_slotcard, plan_seatpickermodal, plan_seatgrid, plan_seaticon, plan_daybookingsummary, plan_debugpanel [EXTRACTED 1.00]
- **Shared Schedule Type System** — plan_types_ts, plan_booking_type, plan_slotid_type, plan_slotdef_type, plan_constants_ts [EXTRACTED 1.00]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.33
Nodes (11): CalendarPicker Component, Schedule Constants Module, DayBookingSummary Component, DebugPanel Component, Exam Scheduler Implementation Plan, Schedule Page Component, SeatGrid Component, SeatIcon Component (+3 more)

### Community 1 - "Community 1"
Cohesion: 0.38
Nodes (3): getDayStatus(), isPast(), isWeekend()

### Community 3 - "Community 3"
Cohesion: 0.4
Nodes (6): Date Picker Spec, Exam Scheduler Design Spec, Local In-Memory State, Seat Picker Modal Spec, Slot Cards Section Spec, Supabase Future Integration

### Community 5 - "Community 5"
Cohesion: 0.5
Nodes (2): cn(), Badge()

### Community 6 - "Community 6"
Cohesion: 0.5
Nodes (4): Booking Type, SlotDef Interface, SlotId Type Union, Schedule Types Module

### Community 7 - "Community 7"
Cohesion: 0.67
Nodes (3): Next.js Agent Rules, Next.js Logo SVG, Next.js Framework

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (2): Vercel Logo SVG, Vercel Deployment Platform

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (1): JustSchedule Project README

## Knowledge Gaps
- **9 isolated node(s):** `Next.js Agent Rules`, `JustSchedule Project README`, `Vercel Deployment Platform`, `Schedule Constants Module`, `Booking Type` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 5`** (4 nodes): `badge.tsx`, `cn()`, `utils.ts`, `Badge()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `Vercel Logo SVG`, `Vercel Deployment Platform`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `JustSchedule Project README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Exam Scheduler Implementation Plan` connect `Community 0` to `Community 6`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `Schedule Types Module` connect `Community 6` to `Community 0`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `Next.js Agent Rules`, `JustSchedule Project README`, `Vercel Deployment Platform` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._