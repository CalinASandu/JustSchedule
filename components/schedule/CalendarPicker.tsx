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

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function CalendarPicker({ selectedDate, onSelectDate }: CalendarPickerProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate())

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 select-none" role="group" aria-label="Date picker">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          aria-label="Previous month"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] transition-colors duration-150 cursor-pointer text-lg leading-none"
        >
          ‹
        </button>
        <h3
          className="text-base font-semibold text-[#1E293B]"
          style={{ fontFamily: "'EB Garamond', serif" }}
          aria-live="polite"
        >
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h3>
        <button
          onClick={nextMonth}
          aria-label="Next month"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] transition-colors duration-150 cursor-pointer text-lg leading-none"
        >
          ›
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={[
              'text-center text-[11px] font-semibold py-1 uppercase tracking-wide',
              i === 0 || i === 6 ? 'text-[#CBD5E1]' : 'text-[#94A3B8]',
            ].join(' ')}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {/* Empty offset cells */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const iso = toISO(viewYear, viewMonth, day)
          const disabled = isWeekend(viewYear, viewMonth, day) || isPast(viewYear, viewMonth, day)
          const isSelected = selectedDate === iso
          const isToday = iso === todayISO

          return (
            <button
              key={day}
              onClick={() => !disabled && onSelectDate(iso)}
              disabled={disabled}
              aria-label={`${MONTH_NAMES[viewMonth]} ${day}, ${viewYear}${disabled ? ', unavailable' : ''}`}
              aria-pressed={isSelected}
              className={[
                'mx-auto flex items-center justify-center w-8 h-8 rounded-full text-sm transition-colors duration-150',
                disabled
                  ? 'text-[#CBD5E1] cursor-not-allowed'
                  : isSelected
                  ? 'bg-[#2563EB] text-white font-semibold cursor-pointer'
                  : isToday
                  ? 'border-2 border-[#2563EB] text-[#2563EB] font-semibold hover:bg-[#EFF6FF] cursor-pointer'
                  : 'text-[#1E293B] hover:bg-[#EFF6FF] cursor-pointer',
              ].join(' ')}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
