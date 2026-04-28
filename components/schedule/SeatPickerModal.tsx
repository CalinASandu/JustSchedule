'use client'

import { useState, useEffect } from 'react'
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

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const slotLabel = SLOTS.find((s) => s.id === slotId)?.label ?? slotId
  const bookedSeats = bookings
    .filter((b) => b.date === date && b.slot === slotId)
    .map((b) => b.seat)

  const availableCount = 8 - bookedSeats.length

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Select seat for ${slotLabel} on ${formattedDate}`}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm mx-4 overflow-hidden border border-[#E2E8F0]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0]">
          <p className="text-xs font-medium text-[#64748B] uppercase tracking-wider mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {formattedDate}
          </p>
          <h2 className="text-xl font-semibold text-[#1E293B]" style={{ fontFamily: "'EB Garamond', serif" }}>
            {slotLabel}
          </h2>
        </div>

        {/* Availability status */}
        <div className="px-5 pt-4">
          <p className="text-sm text-[#64748B]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <span className="font-semibold text-[#1E293B]">{availableCount}</span> of 8 seats available — pick one
          </p>
        </div>

        {/* Seat grid */}
        <SeatGrid
          bookedSeats={bookedSeats}
          selectedSeat={selectedSeat}
          onSelectSeat={setSelectedSeat}
        />

        {/* Day bookings summary */}
        <DayBookingSummary date={date} bookings={bookings} />

        {/* Actions */}
        <div className="flex gap-2 px-4 py-4 border-t border-[#E2E8F0]">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#CBD5E1] text-[#475569] text-sm font-medium hover:bg-[#F8FAFC] transition-colors duration-150 cursor-pointer"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Cancel
          </button>
          <button
            onClick={() => selectedSeat !== null && onConfirm(selectedSeat)}
            disabled={selectedSeat === null}
            className="flex-1 py-2.5 rounded-xl bg-[#F97316] text-white text-sm font-semibold hover:bg-[#EA6C0A] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
            aria-disabled={selectedSeat === null}
          >
            Confirm Seat {selectedSeat ?? '—'}
          </button>
        </div>
      </div>
    </div>
  )
}
