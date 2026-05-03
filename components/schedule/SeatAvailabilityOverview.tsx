'use client'

import type { Reservation, SlotDef } from './types'

interface SeatAvailabilityOverviewProps {
  selectedDate: string | null
  slots: SlotDef[]
  reservations: Reservation[]
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

export default function SeatAvailabilityOverview({
  selectedDate,
  slots,
  reservations,
}: SeatAvailabilityOverviewProps) {
  const totalSeats = slots.reduce((total, slot) => total + slot.capacity, 0)

  const occupiedSeats = selectedDate
    ? reservations.filter(
        reservation =>
          reservation.reservationDate === selectedDate &&
          reservation.status === 'confirmed'
      ).length
    : 0

  const availableSeats = Math.max(totalSeats - occupiedSeats, 0)

  const availablePct = totalSeats > 0 ? (availableSeats / totalSeats) * 100 : 0
  const occupiedPct  = totalSeats > 0 ? (occupiedSeats  / totalSeats) * 100 : 0

  return (
    <div className="panel p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#F0FDF4' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M3 12.5C3 9.5 5.5 7 8.5 7h1C12.5 7 15 9.5 15 12.5"
              stroke="#16A34A"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="9" cy="4.5" r="2" stroke="#16A34A" strokeWidth="1.5" />
            <circle cx="4" cy="9.5" r="1.5" stroke="#16A34A" strokeWidth="1.3" />
            <circle cx="14" cy="9.5" r="1.5" stroke="#16A34A" strokeWidth="1.3" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#111827' }}>Seat availability</h2>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            {selectedDate ? formatDate(selectedDate) : 'No date selected'}
          </p>
        </div>
      </div>

      {/* Segmented bar */}
      <div
        className="h-2.5 rounded-full overflow-hidden flex"
        style={{ background: '#F3F4F6' }}
        role="img"
        aria-label={`${availableSeats} seats available, ${occupiedSeats} occupied out of ${totalSeats} total`}
      >
        {occupiedPct > 0 && (
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${occupiedPct}%`,
              background: '#F59E0B',
              borderRadius: occupiedPct === 100 ? '9999px' : '9999px 0 0 9999px',
            }}
          />
        )}
        {availablePct > 0 && (
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${availablePct}%`,
              background: '#22C55E',
              borderRadius: occupiedPct === 0 ? '9999px' : '0 9999px 9999px 0',
            }}
          />
        )}
      </div>

      {/* 3 stat boxes */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { count: availableSeats, label: 'Available', color: '#15803D', bg: '#F0FDF4' },
          { count: occupiedSeats,  label: 'Occupied',  color: '#B45309', bg: '#FFFBEB' },
          { count: totalSeats,     label: 'Total',     color: '#111827', bg: '#F3F4F6' },
        ].map(({ count, label, color, bg }) => (
          <div
            key={label}
            className="flex flex-col items-center justify-center py-4 rounded-2xl gap-1"
            style={{ background: bg }}
          >
            <span className="text-2xl font-bold leading-none" style={{ color }}>{count}</span>
            <span className="text-[11px]" style={{ color: '#9CA3AF' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Per-slot breakdown */}
      <div className="flex flex-col gap-1.5" role="list" aria-label="Slot breakdown">
        {slots.map(slot => {
          const booked = reservations.filter(
            reservation =>
              reservation.reservationDate === selectedDate &&
              reservation.slotId === slot.id &&
              reservation.status === 'confirmed'
          ).length
          const remaining = Math.max(slot.capacity - booked, 0)
          const isFull    = remaining === 0
          const isLimited = !isFull && remaining <= 2

          return (
            <div
              key={slot.id}
              className="flex items-center justify-between py-2 px-3 rounded-xl"
              style={{ background: '#F9FAFB' }}
              role="listitem"
            >
              <span className="text-xs font-medium" style={{ color: '#374151' }}>{slot.label}</span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={
                  isFull
                    ? { background: '#F3F4F6', color: '#9CA3AF' }
                    : isLimited
                    ? { background: '#FFFBEB', color: '#B45309' }
                    : { background: '#F0FDF4', color: '#15803D' }
                }
              >
                {isFull ? 'Full' : `${remaining} left`}
              </span>
            </div>
          )
        })}
        {slots.length === 0 && (
          <div
            className="py-4 text-center text-xs"
            style={{ color: '#9CA3AF' }}
            role="listitem"
          >
            No active slots are configured.
          </div>
        )}
      </div>
    </div>
  )
}
