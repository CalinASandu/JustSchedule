import type { Booking } from './types'
import { SLOTS } from './constants'

interface DayBookingSummaryProps {
  date: string
  bookings: Booking[]
}

export default function DayBookingSummary({ date, bookings }: DayBookingSummaryProps) {
  const dayBookings = bookings.filter(b => b.date === date)
  if (dayBookings.length === 0) return null

  return (
    <div className="mt-3 px-4 pb-2" aria-label="Your bookings for today">
      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
        Your bookings today
      </p>
      <ul className="flex flex-wrap gap-2" role="list">
        {dayBookings.map(b => {
          const slotLabel = SLOTS.find(s => s.id === b.slot)?.label ?? b.slot
          return (
            <li
              key={`${b.date}-${b.slot}-${b.studentName}`}
              className="text-xs bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE] rounded-full px-3 py-0.5 font-medium"
            >
              {slotLabel} · {b.examName}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
