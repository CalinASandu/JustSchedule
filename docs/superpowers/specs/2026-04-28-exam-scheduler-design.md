# Exam Scheduler — Schedule Page Design

**Date:** 2026-04-28  
**Status:** Approved  
**Stack:** Next.js (latest), Supabase (future), TypeScript, Tailwind CSS

---

## Overview

A focused scheduling page (`/schedule`) that lets users pick a date, view available time slots, and book one of 8 seats per slot. This page is a content area — it inherits its navbar and layout shell from the broader app. No auth, no role logic, no booking limits in this phase.

---

## Data Model

All state is local (in-memory) for this phase. Supabase integration is a future step.

```ts
type SlotId = '9-11' | '11-1' | '2-4:30'

interface Booking {
  date: string   // ISO date string: "2026-05-05"
  slot: SlotId
  seat: number   // 1–8
}

// Component state
const [bookings, setBookings] = useState<Booking[]>([])
```

**Slot definitions (static config):**

```ts
const SLOTS = [
  { id: '9-11',    label: '9:00 – 11:00 AM' },
  { id: '11-1',    label: '11:00 AM – 1:00 PM' },
  { id: '2-4:30',  label: '2:00 – 4:30 PM' },
]

const SEATS_PER_SLOT = 8
```

---

## Page Layout (`/schedule`)

Three vertical sections, no outer nav/sidebar — those come from the app shell.

### 1. Date Picker

- Inline monthly calendar (no modal/dropdown)
- Only weekdays are selectable; weekends are visually disabled
- Past dates are disabled
- Selected date is highlighted
- Navigable month-by-month (prev/next arrows)
- No holiday logic in this phase

### 2. Slot Cards

Rendered below the calendar once a date is selected. Three cards, one per slot:

- Slot label (e.g., "9:00 – 11:00 AM")
- Available seats badge: `X / 8 seats available`
- If 0 seats remain: card is dimmed, cursor not-allowed, unclickable
- Clicking an available card opens the Seat Picker Modal for that slot

### 3. Seat Picker Modal

Opens when a slot card is clicked.

- Header: slot label + selected date
- 8 seat icons in a **4×2 grid** (4 columns, 2 rows)
- Each seat icon has 3 states:
  - **Available:** green outline, clickable, highlights on hover
  - **Booked by someone else:** gray, strikethrough label or X overlay, not clickable
  - **Selected (current user's pending pick):** filled highlight
- "Confirm" button: disabled until a seat is selected; on click adds `{ date, slot, seat }` to the `bookings` array and closes the modal
- "Cancel" button: closes without booking
- Shows a small summary at the bottom: "Your bookings today: Slot 9–11 Seat 3" (derived from current state)

---

## Booked Seats Logic

```ts
// Get booked seat numbers for a specific date + slot
function getBookedSeats(bookings: Booking[], date: string, slot: SlotId): number[] {
  return bookings
    .filter(b => b.date === date && b.slot === slot)
    .map(b => b.seat)
}

// Check if a specific seat is booked
function isSeatBooked(bookings: Booking[], date: string, slot: SlotId, seat: number): boolean {
  return getBookedSeats(bookings, date, slot).includes(seat)
}
```

---

## Debug Button

A dev-only button (can be hidden behind `process.env.NODE_ENV === 'development'`) that calls `console.log(JSON.stringify(bookings, null, 2))` and also renders the array as formatted JSON in a `<pre>` block on the page.

---

## Component Tree

```
SchedulePage
├── CalendarPicker         (date selection, weekday-only)
├── SlotCardList           (renders 3 SlotCards)
│   └── SlotCard           (per slot: label, seat count badge, click handler)
├── SeatPickerModal        (modal overlay)
│   ├── SeatGrid           (4×2 grid of SeatIcon)
│   │   └── SeatIcon       (available / booked / selected state)
│   ├── DayBookingSummary  (user's bookings for selected date)
│   └── ConfirmButton
└── DebugPanel             (dev only: log + pre display)
```

---

## Out of Scope (This Phase)

- Authentication / user identity
- Booking limits per student
- Holiday exclusions
- Supabase persistence
- Admin view / seat management
- Cancellation / rebooking
