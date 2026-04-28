# Exam Scheduler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/schedule` page in Next.js 15 with a date picker, 3 time-slot cards per day, and a seat-picker modal — all backed by local state for now.

**Architecture:** Single Next.js 15 App Router page (`app/schedule/page.tsx`) composed of focused client components. All booking state lives in the top-level `SchedulePage` client component and is passed down as props. A `DebugPanel` exposes the raw bookings array during development.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, React 19

---

## Design System

Generated via ui-ux-pro-max for "school exam scheduling tool academic students":

| Token | Value |
|-------|-------|
| Style | Flat Design — 2D, minimalist, bold colors, clean lines, no shadows |
| Primary | `#2563EB` (academic blue) |
| Secondary | `#3B82F6` |
| CTA / Confirm | `#F97316` (orange) |
| Background | `#F8FAFC` |
| Text | `#1E293B` |
| Heading font | EB Garamond (Google Fonts) |
| UI/body font | DM Sans (Google Fonts) — pairs with serif for readability |
| Transitions | 150–200ms ease |
| Border radius | `rounded-xl` cards, `rounded-full` badges/pills |
| Seat available | `#2563EB` border + white fill, hover `#EFF6FF` fill |
| Seat booked | `#E2E8F0` fill, `#94A3B8` text, ✕ overlay |
| Seat selected | `#2563EB` fill, white icon |
| Slot badge (available) | `#DBEAFE` bg, `#1D4ED8` text |
| Slot badge (low ≤2) | `#FEF3C7` bg, `#B45309` text |
| Slot badge (full) | `#E2E8F0` bg, `#94A3B8` text |
| Debug panel | Amber dashed border, amber-50 bg |

Anti-patterns to avoid: gradients, heavy drop shadows, 3D effects, emoji as icons.

---

## File Map

| File | Responsibility |
|------|---------------|
| `app/schedule/page.tsx` | Page entry point, owns `bookings` state |
| `components/schedule/types.ts` | Shared types: `SlotId`, `Booking`, `SlotDef` |
| `components/schedule/constants.ts` | `SLOTS` array, `SEATS_PER_SLOT` |
| `components/schedule/CalendarPicker.tsx` | Monthly calendar, weekday-only selection |
| `components/schedule/SlotCardList.tsx` | Renders 3 `SlotCard`s for selected date |
| `components/schedule/SlotCard.tsx` | Single slot card with seat count badge |
| `components/schedule/SeatPickerModal.tsx` | Modal shell + confirm/cancel logic |
| `components/schedule/SeatGrid.tsx` | 4×2 grid of seat icons |
| `components/schedule/SeatIcon.tsx` | Single seat: available / booked / selected |
| `components/schedule/DayBookingSummary.tsx` | Lists user's bookings for the selected day |
| `components/schedule/DebugPanel.tsx` | Dev-only: logs + renders bookings JSON |

---

## Task 1: Bootstrap Next.js 15 project

**Files:**
- Create: project root (via `create-next-app`)

- [ ] **Step 1: Scaffold the project**

```bash
cd D:/Programming/JustPay
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

When prompted, accept all defaults.

- [ ] **Step 2: Verify dev server starts**

```bash
npm run dev
```

Expected: server running at `http://localhost:3000` with no errors.

- [ ] **Step 3: Remove boilerplate**

Delete the contents of `app/page.tsx` and replace with:

```tsx
export default function Home() {
  return <div />;
}
```

Delete `app/globals.css` content except the Tailwind directives:

```css
@import "tailwindcss";
```

- [ ] **Step 4: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js 15 project"
```

---

## Task 2: Shared types and constants

**Files:**
- Create: `components/schedule/types.ts`
- Create: `components/schedule/constants.ts`

- [ ] **Step 1: Create types**

```bash
mkdir -p components/schedule
```

`components/schedule/types.ts`:

```ts
export type SlotId = '9-11' | '11-1' | '2-4:30'

export interface SlotDef {
  id: SlotId
  label: string
}

export interface Booking {
  date: string   // ISO: "2026-05-05"
  slot: SlotId
  seat: number   // 1–8
}
```

- [ ] **Step 2: Create constants**

`components/schedule/constants.ts`:

```ts
import type { SlotDef } from './types'

export const SEATS_PER_SLOT = 8

export const SLOTS: SlotDef[] = [
  { id: '9-11',   label: '9:00 – 11:00 AM' },
  { id: '11-1',   label: '11:00 AM – 1:00 PM' },
  { id: '2-4:30', label: '2:00 – 4:30 PM' },
]
```

- [ ] **Step 3: Commit**

```bash
git add components/schedule/types.ts components/schedule/constants.ts
git commit -m "feat: add schedule types and constants"
```

---

## Task 3: SeatIcon component

**Files:**
- Create: `components/schedule/SeatIcon.tsx`

- [ ] **Step 1: Create the component**

`components/schedule/SeatIcon.tsx`:

```tsx
'use client'

interface SeatIconProps {
  seatNumber: number
  isBooked: boolean
  isSelected: boolean
  onClick: () => void
}

export default function SeatIcon({ seatNumber, isBooked, isSelected, onClick }: SeatIconProps) {
  if (isBooked) {
    return (
      <div
        className="flex flex-col items-center gap-1 cursor-not-allowed select-none"
        title={`Seat ${seatNumber} — booked`}
      >
        <div className="w-10 h-10 rounded-t-lg rounded-b-sm bg-gray-200 border-2 border-gray-300 flex items-center justify-center relative">
          <span className="text-gray-400 font-bold text-lg leading-none">✕</span>
        </div>
        <span className="text-xs text-gray-400">{seatNumber}</span>
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      title={`Seat ${seatNumber}`}
      className={[
        'flex flex-col items-center gap-1 transition-transform hover:scale-105 active:scale-95',
        isSelected ? 'scale-105' : '',
      ].join(' ')}
    >
      <div
        className={[
          'w-10 h-10 rounded-t-lg rounded-b-sm border-2 flex items-center justify-center transition-colors',
          isSelected
            ? 'bg-emerald-500 border-emerald-600'
            : 'bg-white border-emerald-400 hover:bg-emerald-50',
        ].join(' ')}
      >
        <svg
          viewBox="0 0 24 24"
          className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-emerald-500'}`}
          fill="currentColor"
        >
          <path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm0 2h16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2z" />
        </svg>
      </div>
      <span className={`text-xs font-medium ${isSelected ? 'text-emerald-600' : 'text-gray-500'}`}>
        {seatNumber}
      </span>
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/schedule/SeatIcon.tsx
git commit -m "feat: add SeatIcon component"
```

---

## Task 4: SeatGrid component

**Files:**
- Create: `components/schedule/SeatGrid.tsx`

- [ ] **Step 1: Create the component**

`components/schedule/SeatGrid.tsx`:

```tsx
'use client'

import SeatIcon from './SeatIcon'
import { SEATS_PER_SLOT } from './constants'

interface SeatGridProps {
  bookedSeats: number[]
  selectedSeat: number | null
  onSelectSeat: (seat: number) => void
}

export default function SeatGrid({ bookedSeats, selectedSeat, onSelectSeat }: SeatGridProps) {
  return (
    <div className="grid grid-cols-4 gap-4 p-4">
      {Array.from({ length: SEATS_PER_SLOT }, (_, i) => i + 1).map((seat) => (
        <SeatIcon
          key={seat}
          seatNumber={seat}
          isBooked={bookedSeats.includes(seat)}
          isSelected={selectedSeat === seat}
          onClick={() => !bookedSeats.includes(seat) && onSelectSeat(seat)}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/schedule/SeatGrid.tsx
git commit -m "feat: add SeatGrid component"
```

---

## Task 5: DayBookingSummary component

**Files:**
- Create: `components/schedule/DayBookingSummary.tsx`

- [ ] **Step 1: Create the component**

`components/schedule/DayBookingSummary.tsx`:

```tsx
import type { Booking, SlotId } from './types'
import { SLOTS } from './constants'

interface DayBookingSummaryProps {
  date: string
  bookings: Booking[]
}

export default function DayBookingSummary({ date, bookings }: DayBookingSummaryProps) {
  const dayBookings = bookings.filter((b) => b.date === date)

  if (dayBookings.length === 0) return null

  return (
    <div className="mt-3 px-4 pb-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Your bookings today
      </p>
      <ul className="flex flex-wrap gap-2">
        {dayBookings.map((b) => {
          const slotLabel = SLOTS.find((s) => s.id === b.slot)?.label ?? b.slot
          return (
            <li
              key={`${b.slot}-${b.seat}`}
              className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-2 py-0.5"
            >
              {slotLabel} · Seat {b.seat}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/schedule/DayBookingSummary.tsx
git commit -m "feat: add DayBookingSummary component"
```

---

## Task 6: SeatPickerModal component

**Files:**
- Create: `components/schedule/SeatPickerModal.tsx`

- [ ] **Step 1: Create the component**

`components/schedule/SeatPickerModal.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Booking, SlotId } from './types'
import { SLOTS } from './constants'
import SeatGrid from './SeatGrid'
import DayBookingSummary from './DayBookingSummary'

interface SeatPickerModalProps {
  date: string
  slotId: SlotId
  bookings: Booking[]
  onConfirm: (seat: number) => void
  onClose: () => void
}

export default function SeatPickerModal({
  date,
  slotId,
  bookings,
  onConfirm,
  onClose,
}: SeatPickerModalProps) {
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)

  const slotLabel = SLOTS.find((s) => s.id === slotId)?.label ?? slotId
  const bookedSeats = bookings
    .filter((b) => b.date === date && b.slot === slotId)
    .map((b) => b.seat)

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4">
          <p className="text-emerald-100 text-sm">{formattedDate}</p>
          <h2 className="text-white font-bold text-lg">{slotLabel}</h2>
        </div>

        {/* Seat grid */}
        <div>
          <p className="text-sm text-gray-500 px-4 pt-4 pb-1">
            {8 - bookedSeats.length} of 8 seats available — pick one
          </p>
          <SeatGrid
            bookedSeats={bookedSeats}
            selectedSeat={selectedSeat}
            onSelectSeat={setSelectedSeat}
          />
        </div>

        {/* Day summary */}
        <DayBookingSummary date={date} bookings={bookings} />

        {/* Actions */}
        <div className="flex gap-2 px-4 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => selectedSeat !== null && onConfirm(selectedSeat)}
            disabled={selectedSeat === null}
            className="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/schedule/SeatPickerModal.tsx
git commit -m "feat: add SeatPickerModal component"
```

---

## Task 7: SlotCard and SlotCardList components

**Files:**
- Create: `components/schedule/SlotCard.tsx`
- Create: `components/schedule/SlotCardList.tsx`

- [ ] **Step 1: Create SlotCard**

`components/schedule/SlotCard.tsx`:

```tsx
'use client'

import type { SlotId } from './types'
import { SEATS_PER_SLOT } from './constants'

interface SlotCardProps {
  slotId: SlotId
  label: string
  bookedCount: number
  onClick: () => void
}

export default function SlotCard({ slotId, label, bookedCount, onClick }: SlotCardProps) {
  const available = SEATS_PER_SLOT - bookedCount
  const isFull = available === 0

  return (
    <button
      onClick={onClick}
      disabled={isFull}
      className={[
        'w-full text-left rounded-xl border-2 p-4 transition-all',
        isFull
          ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
          : 'border-emerald-200 bg-white hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-100 active:scale-[0.98]',
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">
            Time Slot
          </p>
          <p className="text-gray-800 font-semibold text-base">{label}</p>
        </div>
        <div
          className={[
            'rounded-full px-3 py-1 text-sm font-bold',
            isFull
              ? 'bg-gray-200 text-gray-400'
              : available <= 2
              ? 'bg-amber-100 text-amber-700'
              : 'bg-emerald-100 text-emerald-700',
          ].join(' ')}
        >
          {isFull ? 'Full' : `${available} / ${SEATS_PER_SLOT}`}
        </div>
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Create SlotCardList**

`components/schedule/SlotCardList.tsx`:

```tsx
'use client'

import type { Booking, SlotId } from './types'
import { SLOTS } from './constants'
import SlotCard from './SlotCard'

interface SlotCardListProps {
  date: string
  bookings: Booking[]
  onSelectSlot: (slotId: SlotId) => void
}

export default function SlotCardList({ date, bookings, onSelectSlot }: SlotCardListProps) {
  return (
    <div className="flex flex-col gap-3">
      {SLOTS.map((slot) => {
        const bookedCount = bookings.filter(
          (b) => b.date === date && b.slot === slot.id
        ).length
        return (
          <SlotCard
            key={slot.id}
            slotId={slot.id}
            label={slot.label}
            bookedCount={bookedCount}
            onClick={() => onSelectSlot(slot.id)}
          />
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/schedule/SlotCard.tsx components/schedule/SlotCardList.tsx
git commit -m "feat: add SlotCard and SlotCardList components"
```

---

## Task 8: CalendarPicker component

**Files:**
- Create: `components/schedule/CalendarPicker.tsx`

- [ ] **Step 1: Create the component**

`components/schedule/CalendarPicker.tsx`:

```tsx
'use client'

import { useState } from 'react'

interface CalendarPickerProps {
  selectedDate: string | null
  onSelectDate: (date: string) => void
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function isWeekend(year: number, month: number, day: number): boolean {
  const d = new Date(year, month, day).getDay()
  return d === 0 || d === 6
}

function isPast(year: number, month: number, day: number): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(year, month, day) < today
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export default function CalendarPicker({ selectedDate, onSelectDate }: CalendarPickerProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        >
          ‹
        </button>
        <span className="font-semibold text-gray-800">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        >
          ›
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {/* Empty cells before first day */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const iso = toISO(viewYear, viewMonth, day)
          const disabled = isWeekend(viewYear, viewMonth, day) || isPast(viewYear, viewMonth, day)
          const isSelected = selectedDate === iso
          const isToday = toISO(today.getFullYear(), today.getMonth(), today.getDate()) === iso

          return (
            <button
              key={day}
              onClick={() => !disabled && onSelectDate(iso)}
              disabled={disabled}
              className={[
                'mx-auto w-8 h-8 rounded-full text-sm font-medium transition-colors',
                disabled
                  ? 'text-gray-300 cursor-not-allowed'
                  : isSelected
                  ? 'bg-emerald-500 text-white font-bold'
                  : isToday
                  ? 'border-2 border-emerald-400 text-emerald-600 hover:bg-emerald-50'
                  : 'text-gray-700 hover:bg-emerald-50',
              ].join(' ')}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/schedule/CalendarPicker.tsx
git commit -m "feat: add CalendarPicker component"
```

---

## Task 9: DebugPanel component

**Files:**
- Create: `components/schedule/DebugPanel.tsx`

- [ ] **Step 1: Create the component**

`components/schedule/DebugPanel.tsx`:

```tsx
'use client'

import type { Booking } from './types'

interface DebugPanelProps {
  bookings: Booking[]
}

export default function DebugPanel({ bookings }: DebugPanelProps) {
  if (process.env.NODE_ENV !== 'development') return null

  return (
    <div className="mt-8 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
          Debug — Bookings State
        </span>
        <button
          onClick={() => console.log(JSON.stringify(bookings, null, 2))}
          className="text-xs bg-amber-200 hover:bg-amber-300 text-amber-800 font-medium px-2 py-0.5 rounded transition-colors"
        >
          Log to console
        </button>
      </div>
      <pre className="text-xs text-amber-900 overflow-x-auto whitespace-pre-wrap break-all">
        {JSON.stringify(bookings, null, 2)}
      </pre>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/schedule/DebugPanel.tsx
git commit -m "feat: add DebugPanel component"
```

---

## Task 10: SchedulePage — wire everything together

**Files:**
- Create: `app/schedule/page.tsx`

- [ ] **Step 1: Create the page**

`app/schedule/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Booking, SlotId } from '@/components/schedule/types'
import CalendarPicker from '@/components/schedule/CalendarPicker'
import SlotCardList from '@/components/schedule/SlotCardList'
import SeatPickerModal from '@/components/schedule/SeatPickerModal'
import DebugPanel from '@/components/schedule/DebugPanel'

export default function SchedulePage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [activeSlot, setActiveSlot] = useState<SlotId | null>(null)

  function handleConfirm(seat: number) {
    if (!selectedDate || !activeSlot) return
    setBookings((prev) => [...prev, { date: selectedDate, slot: activeSlot, seat }])
    setActiveSlot(null)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Schedule Exam</h1>
          <p className="text-gray-500 text-sm mt-1">Pick a date and reserve your seat</p>
        </div>

        <CalendarPicker
          selectedDate={selectedDate}
          onSelectDate={(date) => { setSelectedDate(date); setActiveSlot(null) }}
        />

        {selectedDate && (
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-500 mb-3">
              Available slots for{' '}
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric',
              })}
            </p>
            <SlotCardList
              date={selectedDate}
              bookings={bookings}
              onSelectSlot={setActiveSlot}
            />
          </div>
        )}

        {!selectedDate && (
          <p className="mt-6 text-center text-gray-400 text-sm">
            Select a date above to see available slots
          </p>
        )}

        <DebugPanel bookings={bookings} />
      </div>

      {activeSlot && selectedDate && (
        <SeatPickerModal
          date={selectedDate}
          slotId={activeSlot}
          bookings={bookings}
          onConfirm={handleConfirm}
          onClose={() => setActiveSlot(null)}
        />
      )}
    </main>
  )
}
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

Open `http://localhost:3000/schedule`. Verify:
- Calendar renders with disabled weekends and past dates
- Clicking a weekday shows 3 slot cards
- Each slot card shows `8 / 8` seats available
- Clicking a card opens the modal with 8 seat icons
- Clicking a seat icon highlights it
- Clicking Confirm adds a booking; slot card updates its count
- Booked seat shows as gray ✕ on re-open
- DebugPanel at the bottom shows live JSON; "Log to console" prints it

- [ ] **Step 3: Commit**

```bash
git add app/schedule/page.tsx
git commit -m "feat: wire up SchedulePage with full booking flow"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** date picker ✓, weekday-only ✓, 3 slot cards ✓, 8 seat icons ✓, booked = gray/X ✓, confirm booking ✓, debug panel + log ✓, seat count badge ✓, full slot dimmed ✓
- [x] **No placeholders:** all steps have complete code
- [x] **Type consistency:** `SlotId`, `Booking`, `SlotDef` defined in Task 2 and used consistently throughout; `bookedSeats: number[]`, `selectedSeat: number | null` consistent across SeatGrid/SeatPickerModal
