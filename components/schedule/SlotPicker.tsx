'use client'

import type { Reservation, SlotDef } from './types'

interface SlotPickerProps {
  selectedDate: string | null
  selectedSlotId: string | null
  onSelectSlot: (slotId: string) => void
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
  slots,
  reservations,
}: SlotPickerProps) {
  return (
    <div className="panel flex flex-col p-4 sm:p-5">
      {/* Panel header */}
      <div className="flex items-center gap-2.5 mb-1">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: '#EFF6FF' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect x="1.5" y="3" width="11" height="9.5" rx="1.5" stroke="#2563EB" strokeWidth="1.3" />
            <path d="M4 1.5v2M10 1.5v2" stroke="#2563EB" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M1.5 6.5h11" stroke="#2563EB" strokeWidth="1.3" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#111827' }}>Available slots</h2>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
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
                className={`w-full min-h-[4.5rem] rounded-2xl px-4 py-3.5 text-left transition-[border-color,background,box-shadow,transform] duration-200 anim-slide-up ${delayClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
                style={{
                  border: isSelected
                    ? '1.5px solid #2563EB'
                    : '1.5px solid #E4E8EF',
                  background: isSelected ? '#EFF6FF' : isFull ? '#F9FAFB' : '#FAFAFA',
                  cursor: isFull ? 'not-allowed' : 'pointer',
                  opacity: isFull ? 0.5 : 1,
                }}
                onMouseEnter={e => {
                  if (!isFull && !isSelected) {
                    e.currentTarget.style.borderColor = '#93C5FD'
                    e.currentTarget.style.background = '#F5F9FF'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.06)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isFull && !isSelected) {
                    e.currentTarget.style.borderColor = '#E4E8EF'
                    e.currentTarget.style.background = '#FAFAFA'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold" style={{ color: isSelected ? '#1D4ED8' : '#111827' }}>
                      {slot.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{slot.duration}</p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
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
                    {isSelected && (
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: '#2563EB' }}
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
            <div className="rounded-xl border border-[#E4E8EF] bg-[#F9FAFB] px-4 py-6 text-center">
              <p className="text-sm font-medium" style={{ color: '#6B7280' }}>No active slots</p>
              <p className="mt-1 text-xs" style={{ color: '#9CA3AF' }}>
                Ask a school admin to create exam slots before booking.
              </p>
            </div>
          )}

          {/* Helper link */}
          <div className="mt-2 pt-2" style={{ borderTop: '1px solid #F3F4F6' }}>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              Can&apos;t find a suitable time?{' '}
              <button className="font-medium transition-colors duration-150 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" style={{ color: '#2563EB' }}>
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
            style={{ background: '#F3F4F6' }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <rect x="2.5" y="4" width="17" height="15" rx="2" stroke="#D1D5DB" strokeWidth="1.5" />
              <path d="M7 2v3M15 2v3" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M2.5 8.5h17" stroke="#D1D5DB" strokeWidth="1.5" />
              <path d="M7 12.5h8M7 15.5h5" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>Select a date to continue</p>
          <p className="text-xs mt-1 text-center" style={{ color: '#9CA3AF' }}>
            Available time slots will appear here
          </p>
        </div>
      )}
    </div>
  )
}
