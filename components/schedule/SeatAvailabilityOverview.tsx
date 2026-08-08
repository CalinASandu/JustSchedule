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
    <div className="panel flex flex-col gap-4 p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--success-subtle)' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M3 12.5C3 9.5 5.5 7 8.5 7h1C12.5 7 15 9.5 15 12.5"
              stroke="var(--success)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="9" cy="4.5" r="2" stroke="var(--success)" strokeWidth="1.5" />
            <circle cx="4" cy="9.5" r="1.5" stroke="var(--success)" strokeWidth="1.3" />
            <circle cx="14" cy="9.5" r="1.5" stroke="var(--success)" strokeWidth="1.3" />
          </svg>
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Seat availability</h2>
          <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
            {selectedDate ? formatDate(selectedDate) : 'No date selected'}
          </p>
        </div>
      </div>

      {/* Segmented bar */}
      <div
        className="h-2.5 rounded-full overflow-hidden flex"
        style={{ background: 'var(--surface-subtle)' }}
        role="img"
        aria-label={`${availableSeats} seats available, ${occupiedSeats} occupied out of ${totalSeats} total`}
      >
        {occupiedPct > 0 && (
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${occupiedPct}%`,
              background: 'var(--warning-accent)',
              borderRadius: occupiedPct === 100 ? '9999px' : '9999px 0 0 9999px',
            }}
          />
        )}
        {availablePct > 0 && (
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${availablePct}%`,
              background: 'var(--success)',
              borderRadius: occupiedPct === 0 ? '9999px' : '0 9999px 9999px 0',
            }}
          />
        )}
      </div>

      {/* 3 stat boxes */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { count: availableSeats, label: 'Available', color: 'var(--success-strong)', bg: 'var(--success-subtle)' },
          { count: occupiedSeats,  label: 'Occupied',  color: 'var(--warning)', bg: 'var(--warning-surface)' },
          { count: totalSeats,     label: 'Total',     color: 'var(--text-primary)', bg: 'var(--surface-subtle)' },
        ].map(({ count, label, color, bg }) => (
          <div
            key={label}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-3 sm:py-4"
            style={{ background: bg }}
          >
            <span className="text-xl font-bold leading-none sm:text-2xl" style={{ color }}>{count}</span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
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
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2"
              style={{ background: 'var(--surface-inset)' }}
              role="listitem"
            >
              <span className="min-w-0 truncate text-xs font-medium" style={{ color: 'var(--text-body)' }}>{slot.label}</span>
              <span
                className="flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                style={
                  isFull
                    ? { background: 'var(--surface-subtle)', color: 'var(--text-muted)' }
                    : isLimited
                    ? { background: 'var(--warning-surface)', color: 'var(--warning)' }
                    : { background: 'var(--success-subtle)', color: 'var(--success-strong)' }
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
            style={{ color: 'var(--text-muted)' }}
            role="listitem"
          >
            No active slots are configured.
          </div>
        )}
      </div>
    </div>
  )
}
