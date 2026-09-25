'use client'

import type { Reservation, SlotDef } from './types'

interface SlotPickerProps {
  selectedDate: string | null
  selectedSlotId: string | null
  onSelectSlot: (slotId: string) => void
  onViewOtherDates?: () => void
  slots: SlotDef[]
  reservations: Reservation[]
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

export default function SlotPicker({
  selectedDate,
  selectedSlotId,
  onSelectSlot,
  onViewOtherDates,
  slots,
  reservations,
}: SlotPickerProps) {
  return (
    <div className="panel flex flex-col p-4 sm:p-5">
      {/* Panel header */}
      <div className="flex items-center gap-2.5 mb-1">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent-subtle)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect x="1.5" y="3" width="11" height="9.5" rx="1.5" stroke="var(--accent-color)" strokeWidth="1.3" />
            <path d="M4 1.5v2M10 1.5v2" stroke="var(--accent-color)" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M1.5 6.5h11" stroke="var(--accent-color)" strokeWidth="1.3" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Available slots</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {selectedDate ? formatDate(selectedDate) : 'Select a date first'}
          </p>
        </div>
      </div>

      {selectedDate ? (
        <div className="flex flex-col gap-2 mt-4 anim-slide-up" key={selectedDate}>
          {slots.map((slot, i) => {
            const bookedCount = reservations.filter(
              reservation =>
                reservation.reservationDate === selectedDate &&
                reservation.slotId === slot.id &&
                reservation.status === 'confirmed'
            ).length
            const remaining = Math.max(slot.capacity - bookedCount, 0)
            const isFull = remaining === 0
            const isLimited = !isFull && remaining <= 2
            const isSelected = selectedSlotId === slot.id

            const delayClass = ['', 'anim-d1', 'anim-d2', 'anim-d3'][i] ?? ''

            return (
              <button
                key={slot.id}
                onClick={() => !isFull && onSelectSlot(slot.id)}
                disabled={isFull}
                aria-label={`${slot.label} — ${isFull ? 'fully booked' : `${remaining} seats available`}`}
                aria-pressed={isSelected}
                className={`w-full min-h-[4.5rem] rounded-2xl px-4 py-3.5 text-left transition-[border-color,background,box-shadow,transform] duration-200 anim-slide-up ${delayClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]`}
                style={{
                  border: isSelected
                    ? '1.5px solid var(--accent-color)'
                    : '1.5px solid var(--border-default)',
                  background: isSelected ? 'var(--accent-subtle)' : isFull ? 'var(--surface-inset)' : 'var(--surface-inset)',
                  cursor: isFull ? 'not-allowed' : 'pointer',
                  opacity: isFull ? 0.5 : 1,
                }}
                onMouseEnter={e => {
                  if (!isFull && !isSelected) {
                    e.currentTarget.style.borderColor = 'var(--accent-border-strong)'
                    e.currentTarget.style.background = 'var(--accent-subtle)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.06)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isFull && !isSelected) {
                    e.currentTarget.style.borderColor = 'var(--border-default)'
                    e.currentTarget.style.background = 'var(--surface-inset)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold" style={{ color: isSelected ? 'var(--accent-strong)' : 'var(--text-primary)' }}>
                      {slot.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{slot.duration}</p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
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
                    {isSelected && (
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--accent-color)' }}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                          <path d="M2 5l2.5 2.5L8 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ strokeDasharray: 24, strokeDashoffset: 0 }}
                          />
                        </svg>
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}

          {slots.length === 0 && (
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-inset)] px-4 py-6 text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No active slots</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                Ask a school admin to create exam slots before booking.
              </p>
            </div>
          )}

          {/* Helper link */}
          <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--surface-subtle)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Can&apos;t find a suitable time?{' '}
              <button
                type="button"
                onClick={onViewOtherDates}
                className="font-medium transition-colors duration-150 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
                style={{ color: 'var(--accent-color)' }}
              >
                View other dates
              </button>
            </p>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center py-12 anim-fade-in">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'var(--surface-subtle)' }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <rect x="2.5" y="4" width="17" height="15" rx="2" stroke="var(--text-muted)" strokeWidth="1.5" />
              <path d="M7 2v3M15 2v3" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M2.5 8.5h17" stroke="var(--text-muted)" strokeWidth="1.5" />
              <path d="M7 12.5h8M7 15.5h5" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Select a date to continue</p>
          <p className="text-xs mt-1 text-center" style={{ color: 'var(--text-muted)' }}>
            Available time slots will appear here
          </p>
        </div>
      )}
    </div>
  )
}
