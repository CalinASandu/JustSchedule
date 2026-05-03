import type { Reservation } from './types'

interface DayBookingSummaryProps {
  date: string
  reservations: Reservation[]
}

export default function DayBookingSummary({ date, reservations }: DayBookingSummaryProps) {
  const dayReservations = reservations.filter(
    reservation => reservation.reservationDate === date && reservation.status === 'confirmed',
  )
  if (dayReservations.length === 0) return null

  return (
    <div className="mt-3 px-4 pb-2" aria-label="Your bookings for today">
      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
        Your bookings today
      </p>
      <ul className="flex flex-wrap gap-2" role="list">
        {dayReservations.map(reservation => (
          <li
            key={reservation.id}
            className="text-xs bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE] rounded-full px-3 py-0.5 font-medium"
          >
            {reservation.slotName} - {reservation.examName}
          </li>
        ))}
      </ul>
    </div>
  )
}
