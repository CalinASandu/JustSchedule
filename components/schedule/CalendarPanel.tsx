'use client'

import { useState } from 'react'
import type { ExamType, Reservation, SlotDef } from './types'
import SubjectCommandPalette from './SubjectCommandPalette'

interface Subject {
  id: string
  name: string
}

interface CalendarPanelProps {
  studentName: string
  selectedExam: string
  onExamChange: (v: string) => void
  examType: ExamType
  onExamTypeChange: (v: ExamType) => void
  selectedDate: string | null
  onSelectDate: (date: string) => void
  subjects: Subject[]
  calendarOnly?: boolean
  slots?: SlotDef[]
  reservations?: Reservation[]
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function isWeekend(y: number, m: number, d: number) {
  const day = new Date(y, m, d).getDay()
  return day === 0 || day === 6
}

function isPast(y: number, m: number, d: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(y, m, d) < today
}

function isOutsideBookingWindow(y: number, m: number, d: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const latest = new Date(today)
  latest.setDate(latest.getDate() + 14)
  return new Date(y, m, d) > latest
}

type DayStatus = 'unavailable' | 'limited' | 'available'

function getDayStatus(
  y: number,
  m: number,
  d: number,
  slots: SlotDef[],
  reservations: Reservation[],
): DayStatus {
  if (isWeekend(y, m, d) || isPast(y, m, d) || isOutsideBookingWindow(y, m, d)) return 'unavailable'
  if (slots.length === 0) return 'unavailable'

  const dateISO = toISO(y, m, d)
  let totalCapacity = 0
  let totalFree = 0

  for (const slot of slots) {
    const booked = reservations.filter(
      r => r.reservationDate === dateISO && r.slotId === slot.id && r.status === 'confirmed'
    ).length
    totalCapacity += slot.capacity
    totalFree += Math.max(slot.capacity - booked, 0)
  }

  if (totalFree === 0) return 'unavailable'
  if (totalFree / totalCapacity > 0.7) return 'available'
  return 'limited'
}

export default function CalendarPanel({
  studentName,
  selectedExam,
  onExamChange,
  examType,
  onExamTypeChange,
  selectedDate,
  onSelectDate,
  subjects,
  calendarOnly = false,
  slots = [],
  reservations = [],
}: CalendarPanelProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate())
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth()

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  function prevMonth() {
    if (isCurrentMonth) return
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const dotColor: Record<DayStatus, string> = {
    available: 'var(--success)',
    limited: 'var(--warning)',
    unavailable: 'transparent',
  }

  return (
    <div className="panel flex flex-col gap-5 p-4 sm:p-5">
      {/* ── Form inputs ────────────────────────────── */}
      {!calendarOnly && (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {/* Student name */}
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Student name
            </label>
            <div
              className="relative w-full rounded-xl py-2.5 pl-8 pr-3 text-sm"
              style={{
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                background: 'var(--surface-alt)',
              }}
            >
              <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <circle cx="7" cy="5" r="2.5" stroke="var(--text-muted)" strokeWidth="1.3" />
                  <path d="M1.5 12.5c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </span>
              <span className="block truncate font-medium">{studentName}</span>
            </div>
          </div>

          {/* Exam name */}
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Exam
            </label>
            <SubjectCommandPalette
              subjects={subjects}
              value={selectedExam}
              onChange={onExamChange}
              placeholder="Search subject…"
            />
          </div>

          {/* Exam type toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Exam type
            </label>
            <div
              className="flex rounded-xl p-0.5 gap-0.5"
              style={{ border: '1px solid var(--border-default)', background: 'var(--surface-page)' }}
              role="group"
              aria-label="Exam type"
            >
              {(['midterm', 'final'] as ExamType[]).map(t => (
                <button
                  key={t}
                  onClick={() => onExamTypeChange(t)}
                  aria-pressed={examType === t}
                  className="px-4 py-2 text-sm font-medium rounded-[10px] transition-all duration-150 cursor-pointer capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
                  style={
                    examType === t
                      ? { background: 'var(--surface-panel)', color: 'var(--accent-strong)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid var(--accent-border)' }
                      : { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid transparent' }
                  }
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Calendar ────────────────────────────────── */}
      <div className="select-none" role="group" aria-label="Date picker">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            disabled={isCurrentMonth}
            aria-label="Previous month"
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
            style={
              isCurrentMonth
                ? { color: 'var(--text-muted)', cursor: 'not-allowed' }
                : { color: 'var(--text-secondary)', cursor: 'pointer' }
            }
            onMouseEnter={e => { if (!isCurrentMonth) e.currentTarget.style.background = 'var(--surface-subtle)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h3
            className="text-[15px] font-semibold"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}
            aria-live="polite"
          >
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h3>
          <button
            onClick={nextMonth}
            aria-label="Next month"
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-subtle)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((label, i) => (
            <div
              key={label}
              className="text-center text-[11px] font-semibold py-1.5 uppercase tracking-wide"
              style={{ color: i === 0 || i === 6 ? 'var(--text-muted)' : 'var(--text-muted)' }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Date grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`e-${i}`} />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const iso = toISO(viewYear, viewMonth, day)
            const status = getDayStatus(viewYear, viewMonth, day, slots, reservations)
            const isDisabled = status === 'unavailable'
            const isSelected = selectedDate === iso
            const isToday = iso === todayISO

            return (
              <button
                key={day}
                onClick={() => !isDisabled && onSelectDate(iso)}
                disabled={isDisabled}
                aria-label={`${MONTH_NAMES[viewMonth]} ${day}, ${viewYear}${isDisabled ? ', unavailable' : ''}`}
                aria-pressed={isSelected}
                className="group flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
                style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors duration-150"
                  style={
                    isSelected
                      ? { background: 'var(--accent-color)', color: 'var(--text-on-accent)', fontWeight: 600 }
                      : isToday
                      ? { border: '2px solid var(--accent-color)', color: 'var(--accent-color)', fontWeight: 600 }
                      : isDisabled
                      ? { color: 'var(--text-muted)' }
                      : { color: 'var(--text-primary)', fontWeight: 400 }
                  }
                  onMouseEnter={e => {
                    if (!isDisabled && !isSelected) {
                      e.currentTarget.style.background = 'var(--accent-subtle)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isDisabled && !isSelected) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  {day}
                </span>
                {/* Availability dot */}
                <span
                  className="w-1 h-1 rounded-full transition-colors duration-150"
                  style={{ background: isSelected ? 'var(--accent-color)' : dotColor[status] }}
                  aria-hidden="true"
                />
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-1">
        {[
          { label: 'Available', color: 'var(--success)', filled: true },
          { label: 'Limited', color: 'var(--warning)', filled: true },
          { label: 'Unavailable', color: 'var(--text-muted)', filled: true },
          { label: 'Selected', color: 'var(--accent-color)', filled: false },
        ].map(({ label, color, filled }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={
                filled
                  ? { background: color }
                  : { border: `2px solid ${color}`, background: 'transparent' }
              }
              aria-hidden="true"
            />
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
