# JustSchedule — System Design

## Overview

JustSchedule is an exam scheduling web app where students enter their name, choose an exam, choose an exam type, select a date, pick a time slot, and reserve a seat. Students can also view other students' bookings and request a time swap.

The frontend is a Next.js 16 App Router application with Tailwind CSS 4. Persistent storage will be Supabase (PostgreSQL + Row Level Security).

---

## Data Model

### Core booking record

A booking captures everything needed to register a student for an exam session:

| Field          | Type      | Description                                      |
|----------------|-----------|--------------------------------------------------|
| `id`           | `uuid`    | Primary key, auto-generated                      |
| `student_name` | `text`    | Student's full name (entered by the student)     |
| `exam_name`    | `text`    | Exam name as typed by the student                |
| `exam_type`    | `text`    | `'midterm'` or `'final'`                         |
| `slot`         | `text`    | Time slot ID: `'9-11'`, `'11-1'`, or `'2-4:30'` |
| `date`         | `date`    | ISO date of the exam, e.g. `2026-05-05`          |
| `created_at`   | `timestamptz` | Timestamp of when the booking was created    |

### Slot reference (static, no table needed)

| Slot ID   | Display label         | Duration  |
|-----------|-----------------------|-----------|
| `9-11`    | 9:00 – 11:00 AM       | 2h        |
| `11-1`    | 11:00 AM – 1:00 PM    | 2h        |
| `2-4:30`  | 2:00 – 4:30 PM        | 2h 30m    |

These are defined as constants in the frontend (`components/schedule/constants.ts`) and do not require a database table. If slots need to be admin-configurable in the future, they should be extracted to a `slots` table.

---

## Supabase Schema

```sql
-- Bookings table
create table bookings (
  id           uuid        default gen_random_uuid() primary key,
  student_name text        not null,
  exam_name    text        not null,
  exam_type    text        not null check (exam_type in ('midterm', 'final')),
  slot         text        not null check (slot in ('9-11', '11-1', '2-4:30')),
  date         date        not null,
  created_at   timestamptz default now()
);

-- Prevent a student from double-booking the same slot on the same day
create unique index bookings_student_date_slot_key
  on bookings (student_name, date, slot);

-- Index for the most common query: all bookings for a given date
create index bookings_date_idx on bookings (date);
```

### Row Level Security

For the initial version, all users can read all bookings (needed for the swap panel) and insert their own:

```sql
alter table bookings enable row level security;

-- Anyone can read bookings (needed to show other students' slots)
create policy "read all bookings"
  on bookings for select
  using (true);

-- Anyone can insert a booking
create policy "insert own booking"
  on bookings for insert
  with check (true);
```

> When authentication is added (Supabase Auth), tighten the insert policy to `with check (auth.uid() is not null)` and add a `user_id` column to bookings.

---

## Frontend State → Supabase Mapping

### On "Reserve seat"

When the user confirms a booking, the frontend sends an `insert` to the `bookings` table:

```ts
const { error } = await supabase.from('bookings').insert({
  student_name: studentName,
  exam_name:    selectedExam,
  exam_type:    examType,       // 'midterm' | 'final'
  slot:         selectedSlotId, // '9-11' | '11-1' | '2-4:30'
  date:         selectedDate,   // 'YYYY-MM-DD'
})
```

### Reading bookings for a date (SlotPicker seat counts, SeatAvailabilityOverview)

```ts
const { data } = await supabase
  .from('bookings')
  .select('slot')
  .eq('date', selectedDate)
```

Count per slot to calculate remaining seats:
```ts
const bookedPerSlot = data.reduce((acc, b) => {
  acc[b.slot] = (acc[b.slot] ?? 0) + 1
  return acc
}, {} as Record<SlotId, number>)
```

### Reading all bookings for the swap panel (BookingsPanel)

```ts
const { data } = await supabase
  .from('bookings')
  .select('id, student_name, exam_name, exam_type, slot, date')
  .order('created_at', { ascending: false })
  .limit(50)
```

---

## UI Component Structure

```
app/
  schedule/
    page.tsx              ← orchestrator: all state lives here

components/schedule/
  Navbar.tsx              ← top bar, brand + university selector + avatar
  CalendarPanel.tsx       ← student name input, exam text input, exam type toggle, calendar
  SlotPicker.tsx          ← time slot cards for the selected date
  BookingSummaryCard.tsx  ← live summary + Reserve seat CTA + confirmed state
  SeatAvailabilityOverview.tsx ← available / occupied / total counts + per-slot bar
  BookingsPanel.tsx       ← other students' bookings table + swap requests
  DebugPanel.tsx          ← dev-only JSON dump of bookings state
  types.ts                ← shared TypeScript types
  constants.ts            ← SLOTS, OTHER_BOOKINGS (mock)
```

### State tree (`page.tsx`)

| State variable    | Type              | Purpose                                      |
|-------------------|-------------------|----------------------------------------------|
| `studentName`     | `string`          | Bound to the name input in CalendarPanel     |
| `selectedExam`    | `string`          | Bound to the exam text input                 |
| `examType`        | `'midterm'\|'final'` | Bound to the segmented toggle             |
| `selectedDate`    | `string \| null`  | ISO date from CalendarPanel                  |
| `selectedSlotId`  | `SlotId \| null`  | Slot selected in SlotPicker                  |
| `bookings`        | `Booking[]`       | Confirmed bookings (will become Supabase)    |
| `showConfirmation`| `boolean`         | Triggers confirmed state in BookingSummaryCard |

---

## Booking Flow

```
Student fills form (name + exam + type)
        ↓
Selects a date on the calendar
        ↓
Selects an available time slot
        ↓  canReserve = true
Clicks "Reserve seat"
        ↓
handleReserve() → appends Booking to local state (→ future: Supabase insert)
        ↓
BookingSummaryCard shows confirmation state
        ↓
"Schedule another exam" resets date, slot, and confirmation flag
```

---

## Swap Request Flow (UI only, not yet persisted)

1. Student sees another student's booking in BookingsPanel.
2. Clicks "Request swap" — row transitions to "Pending" state (tracked in local `swapStatus` map).
3. **Future:** insert a row into a `swap_requests` table referencing both bookings. Notify the other student or an admin.

### Proposed `swap_requests` schema

```sql
create table swap_requests (
  id              uuid default gen_random_uuid() primary key,
  requester_id    uuid references bookings(id),
  target_id       uuid references bookings(id),
  status          text default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at      timestamptz default now()
);
```

---

## Design System

All design tokens live in `app/globals.css` as CSS custom properties and Tailwind 4 `@theme` values.

| Token group   | Where defined                          |
|---------------|----------------------------------------|
| Colors        | Hardcoded Tailwind palette + inline `style` props |
| Typography    | `@theme` in globals.css (DM Sans + EB Garamond) |
| Spacing       | Tailwind scale (4/8/12/16/24/32/48 px) |
| Border radius | `panel` CSS class (18px), inputs/pills 10–12px |
| Shadows       | Inline `boxShadow` on interactive states |
| Animations    | `@keyframes` in globals.css + `.anim-*` utility classes |
| Grid layout   | `.schedule-main-grid` / `.schedule-bottom-grid` (responsive via media query) |

---

## Next Steps

1. **Supabase integration** — replace local `bookings` state with real-time Supabase queries.
2. **Auth** — add Supabase Auth so a student's bookings are tied to their account.
3. **Seat capacity enforcement** — add a `max_seats_per_slot` config and enforce on insert via a Supabase function or check constraint.
4. **Swap request flow** — implement the `swap_requests` table and notification system.
5. **Admin panel** — route for admins to view all bookings, manage slots, and approve swaps.
6. **Email confirmation** — send a confirmation email on booking via Supabase Edge Functions + Resend.
