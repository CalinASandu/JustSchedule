# Graph Report - JustSchedule  (2026-08-11)

## Corpus Check
- 105 files · ~113,175 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 355 nodes · 392 edges · 30 communities detected
- Extraction: 72% EXTRACTED · 28% INFERRED · 0% AMBIGUOUS · INFERRED: 108 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 31 edges
2. `getUserFacingErrorMessage()` - 25 edges
3. `GET()` - 13 edges
4. `select()` - 9 edges
5. `getUserFacingFunctionErrorMessage()` - 9 edges
6. `SchedulePage()` - 7 edges
7. `getAccessToken()` - 7 edges
8. `getCompletedProfileName()` - 7 edges
9. `Home()` - 6 edges
10. `registerSchool()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `handleCancelRequest()` --calls--> `getUserFacingErrorMessage()`  [INFERRED]
  app\dashboard\schedule\ScheduleClient.tsx → lib\user-facing-errors.ts
- `handleMarkRequestSeen()` --calls--> `getUserFacingErrorMessage()`  [INFERRED]
  app\dashboard\schedule\ScheduleClient.tsx → lib\user-facing-errors.ts
- `membersError()` --calls--> `getUserFacingErrorMessage()`  [INFERRED]
  app\dashboard\schools\[schoolId]\page.tsx → lib\user-facing-errors.ts
- `joinRequestsError()` --calls--> `getUserFacingErrorMessage()`  [INFERRED]
  app\dashboard\schools\[schoolId]\page.tsx → lib\user-facing-errors.ts
- `markRead()` --calls--> `createClient()`  [INFERRED]
  components\dashboard\NotificationBell.tsx → lib\supabase\server.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.1
Nodes (37): leaveSchool(), getUserFacingErrorMessage(), getUserFacingFunctionErrorMessage(), isResponseLike(), messageIncludes(), normalizeMessage(), readFunctionErrorBody(), handleSignOut() (+29 more)

### Community 1 - "Community 1"
Cohesion: 0.1
Nodes (20): Home(), decodeCookieValue(), GET(), registerSchool(), requestDirectJoin(), requestSchoolJoin(), getCompletedProfileName(), getProfileNameSetupPath() (+12 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (6): getTodayKey(), confirmRoleChanges(), kickMember(), openScheduleDialog(), scheduleForStudent(), toggleSelfBooking()

### Community 3 - "Community 3"
Cohesion: 0.2
Nodes (7): isTheme(), parseTheme(), emit(), getStoredTheme(), prefersDark(), setStoredTheme(), syncDocument()

### Community 4 - "Community 4"
Cohesion: 0.22
Nodes (6): handleCancelRequest(), handleCancelReservation(), handleCreateRequest(), handleMarkRequestSeen(), handleReserve(), isMissingRefreshTokenError()

### Community 5 - "Community 5"
Cohesion: 0.29
Nodes (6): addDays(), dateInputToEndOfDay(), getDefaultExpiryDate(), getMaxBookingDate(), getTodayKey(), createInvite()

### Community 6 - "Community 6"
Cohesion: 0.24
Nodes (5): clearSupabaseAuthCookies(), isMissingRefreshTokenError(), proxy(), createClient(), getSupabaseEnv()

### Community 7 - "Community 7"
Cohesion: 0.25
Nodes (3): getLatestVersion(), emit(), markLatestReleaseSeen()

### Community 8 - "Community 8"
Cohesion: 0.29
Nodes (3): getStatusLabel(), reviewRequest(), selectRequest()

### Community 9 - "Community 9"
Cohesion: 0.39
Nodes (5): getDayStatus(), isOutsideBookingWindow(), isPast(), isWeekend(), toISO()

### Community 11 - "Community 11"
Cohesion: 0.33
Nodes (2): joinRequestsError(), membersError()

### Community 13 - "Community 13"
Cohesion: 0.4
Nodes (2): formatDate(), formatTime()

### Community 17 - "Community 17"
Cohesion: 0.5
Nodes (2): handleKeyDown(), selectSubject()

### Community 18 - "Community 18"
Cohesion: 0.83
Nodes (3): getAttendanceWindowLabel(), getSlotDateTime(), isAttendanceMarkingOpen()

### Community 19 - "Community 19"
Cohesion: 0.5
Nodes (2): cancelReservation(), updateReservation()

### Community 20 - "Community 20"
Cohesion: 0.67
Nodes (2): formatDate(), formatTime()

### Community 21 - "Community 21"
Cohesion: 0.5
Nodes (2): cn(), Badge()

### Community 25 - "Community 25"
Cohesion: 0.5
Nodes (4): Google Auth Provider, JustSchedule Project, Next.js Framework, Supabase Integration

### Community 26 - "Community 26"
Cohesion: 0.5
Nodes (4): Spec: Booking Data Model, Booking Record Data Model, Row Level Security Policy, Supabase Bookings Schema

### Community 28 - "Community 28"
Cohesion: 0.67
Nodes (1): markRead()

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (2): JustSchedule UI Mockup (Full Dashboard), JustSchedule System Overview

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (2): Exam Scheduler Implementation Plan, Exam Scheduler Design Spec

### Community 86 - "Community 86"
Cohesion: 1.0
Nodes (1): Next.js Agent Rules

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (1): Slot Reference (Static Config)

### Community 88 - "Community 88"
Cohesion: 1.0
Nodes (1): Swap Requests Schema (Proposed)

### Community 89 - "Community 89"
Cohesion: 1.0
Nodes (1): UI Component Structure

### Community 90 - "Community 90"
Cohesion: 1.0
Nodes (1): Schedule Page Orchestrator

### Community 91 - "Community 91"
Cohesion: 1.0
Nodes (1): Booking Flow

### Community 92 - "Community 92"
Cohesion: 1.0
Nodes (1): Design System (CSS Custom Properties)

### Community 93 - "Community 93"
Cohesion: 1.0
Nodes (1): Weekly Schedule Grid (Dark Theme Concept)

## Knowledge Gaps
- **16 isolated node(s):** `Next.js Agent Rules`, `Next.js Framework`, `Google Auth Provider`, `JustSchedule System Overview`, `Slot Reference (Static Config)` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 11`** (6 nodes): `page.tsx`, `formatMemberName()`, `getInitials()`, `joinRequestsError()`, `membersError()`, `normalizeRole()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (6 nodes): `BookingsPanel.tsx`, `formatDate()`, `formatExamType()`, `formatTime()`, `getInitials()`, `getReservationActionState()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (5 nodes): `SubjectCombobox.tsx`, `handleInputChange()`, `handleKeyDown()`, `handlePointerDown()`, `selectSubject()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (4 nodes): `ReservationsTab.tsx`, `cancelReservation()`, `formatSlotTime()`, `updateReservation()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (4 nodes): `ScheduleRequestsPanel.tsx`, `formatDate()`, `formatTime()`, `getStatusCopy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (4 nodes): `badge.tsx`, `utils.ts`, `cn()`, `Badge()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (3 nodes): `NotificationBell.tsx`, `formatNoticeTime()`, `markRead()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (2 nodes): `JustSchedule UI Mockup (Full Dashboard)`, `JustSchedule System Overview`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (2 nodes): `Exam Scheduler Implementation Plan`, `Exam Scheduler Design Spec`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 86`** (1 nodes): `Next.js Agent Rules`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (1 nodes): `Slot Reference (Static Config)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (1 nodes): `Swap Requests Schema (Proposed)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (1 nodes): `UI Component Structure`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (1 nodes): `Schedule Page Orchestrator`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 91`** (1 nodes): `Booking Flow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 92`** (1 nodes): `Design System (CSS Custom Properties)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 93`** (1 nodes): `Weekly Schedule Grid (Dark Theme Concept)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `Community 0` to `Community 1`, `Community 28`, `Community 6`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `getUserFacingErrorMessage()` connect `Community 0` to `Community 1`, `Community 11`, `Community 4`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `openScheduleDialog()` connect `Community 2` to `Community 5`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Are the 30 inferred relationships involving `createClient()` (e.g. with `Home()` and `GET()`) actually correct?**
  _`createClient()` has 30 INFERRED edges - model-reasoned connections that need verification._
- **Are the 21 inferred relationships involving `getUserFacingErrorMessage()` (e.g. with `registerSchool()` and `requestDirectJoin()`) actually correct?**
  _`getUserFacingErrorMessage()` has 21 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `GET()` (e.g. with `sanitizeRelativePath()` and `createClient()`) actually correct?**
  _`GET()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `select()` (e.g. with `Home()` and `GET()`) actually correct?**
  _`select()` has 6 INFERRED edges - model-reasoned connections that need verification._