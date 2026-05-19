'use client'

import { useState } from 'react'
import type { ExamType } from './types'
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

function getDayStatus(y: number, m: number, d: number): DayStatus {
  if (isWeekend(y, m, d) || isPast(y, m, d) || isOutsideBookingWindow(y, m, d)) return 'unavailable'
  const hash = (d * 13 + m * 7 + y) % 5
  if (hash === 0 || hash === 4) return 'limited'
  return 'available'
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
    available: '#16A34A',
    limited: '#D97706',
    unavailable: 'transparent',
  }

  return (
    <div className="panel p-5 flex flex-col gap-5">
      {/* ── Form inputs ────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {/* Student name */}
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
            Student name
          </label>
          <div
            className="relative w-full rounded-xl py-2.5 pl-8 pr-3 text-sm"
            style={{
              border: '1px solid #E4E8EF',
              color: '#111827',
              background: '#F8FAFC',
            }}
          >
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <circle cx="7" cy="5" r="2.5" stroke="#9CA3AF" strokeWidth="1.3" />
                <path d="M1.5 12.5c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5" stroke="#9CA3AF" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </span>
            <span className="block truncate font-medium">{studentName}</span>
          </div>
        </div>

        {/* Exam name */}
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
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
          <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
            Exam type
          </label>
          <div
            className="flex rounded-xl p-0.5 gap-0.5"
            style={{ border: '1px solid #E4E8EF', background: '#F7F8FA' }}
            role="group"
            aria-label="Exam type"
          >
            {(['midterm', 'final'] as ExamType[]).map(t => (
              <button
                key={t}
                onClick={() => onExamTypeChange(t)}
                aria-pressed={examType === t}
                className="px-4 py-2 text-sm font-medium rounded-[10px] transition-all duration-150 cursor-pointer capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                style={
                  examType === t
                    ? { background: '#ffffff', color: '#1D4ED8', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #BFDBFE' }
                    : { background: 'transparent', color: '#6B7280', border: '1px solid transparent' }
                }
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Calendar ────────────────────────────────── */}
      <div className="select-none" role="group" aria-label="Date picker">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            disabled={isCurrentMonth}
            aria-label="Previous month"
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            style={
              isCurrentMonth
                ? { color: '#D1D5DB', cursor: 'not-allowed' }
                : { color: '#6B7280', cursor: 'pointer' }
            }
            onMouseEnter={e => { if (!isCurrentMonth) e.currentTarget.style.background = '#F3F4F6' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h3
            className="text-[15px] font-semibold"
            style={{ color: '#111827', fontFamily: 'var(--font-sans)' }}
            aria-live="polite"
          >
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h3>
          <button
            onClick={nextMonth}
            aria-label="Next month"
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            style={{ color: '#6B7280' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6' }}
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
              style={{ color: i === 0 || i === 6 ? '#D1D5DB' : '#9CA3AF' }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Date grid */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`e-${i}`} />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const iso = toISO(viewYear, viewMonth, day)
            const status = getDayStatus(viewYear, viewMonth, day)
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
                className="flex flex-col items-center gap-0.5 py-0.5 transition-all duration-150 rounded-xl group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
              >
                <span
                  className="w-8 h-8 flex items-center justify-center rounded-full text-sm transition-all duration-150"
                  style={
                    isSelected
                      ? { background: '#2563EB', color: '#ffffff', fontWeight: 600 }
                      : isToday
                      ? { border: '2px solid #2563EB', color: '#2563EB', fontWeight: 600 }
                      : isDisabled
                      ? { color: '#D1D5DB' }
                      : { color: '#111827', fontWeight: 400 }
                  }
                  onMouseEnter={e => {
                    if (!isDisabled && !isSelected) {
                      e.currentTarget.style.background = '#EFF6FF'
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
                  style={{ background: isSelected ? '#2563EB' : dotColor[status] }}
                  aria-hidden="true"
                />
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────── */}
      <div className="flex items-center justify-center gap-5 pt-1">
        {[
          { label: 'Available', color: '#16A34A', filled: true },
          { label: 'Limited', color: '#D97706', filled: true },
          { label: 'Unavailable', color: '#D1D5DB', filled: true },
          { label: 'Selected', color: '#2563EB', filled: false },
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
            <span className="text-[11px]" style={{ color: '#9CA3AF' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
