'use client'

import { useState } from 'react'
import type { Booking, SlotId } from '@/components/schedule/types'
import CalendarPicker from '@/components/schedule/CalendarPicker'
import SlotCardList from '@/components/schedule/SlotCardList'
import SeatPickerModal from '@/components/schedule/SeatPickerModal'
import DebugPanel from '@/components/schedule/DebugPanel'

export default function SchedulePage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [activeSlot, setActiveSlot] = useState<SlotId | null>(null)

  function handleConfirm(seat: number) {
    if (!selectedDate || !activeSlot) return
    setBookings((prev) => {
      const alreadyBooked = prev.some(
        (b) => b.date === selectedDate && b.slot === activeSlot && b.seat === seat
      )
      if (alreadyBooked) return prev
      return [...prev, { date: selectedDate, slot: activeSlot, seat }]
    })
    setActiveSlot(null)
  }

  function handleDateSelect(date: string) {
    setSelectedDate(date)
    setActiveSlot(null)
  }

  const formattedSelectedDate = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <main className="min-h-dvh bg-[#F8FAFC]">
      <div className="max-w-md mx-auto px-4 py-8">

        {/* Page header */}
        <div className="mb-7">
          <h1
            className="text-3xl font-bold text-[#1E293B] mb-1"
            style={{ fontFamily: "'EB Garamond', serif" }}
          >
            Schedule Exam
          </h1>
          <p
            className="text-sm text-[#64748B]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Select a date and reserve your seat
          </p>
        </div>

        {/* Calendar */}
        <CalendarPicker
          selectedDate={selectedDate}
          onSelectDate={handleDateSelect}
        />

        {/* Slot cards */}
        {selectedDate && (
          <div className="mt-6">
            <p
              className="text-sm font-medium text-[#64748B] mb-3"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Slots for <span className="text-[#1E293B] font-semibold">{formattedSelectedDate}</span>
            </p>
            <SlotCardList
              date={selectedDate}
              bookings={bookings}
              onSelectSlot={setActiveSlot}
            />
          </div>
        )}

        {/* Empty state */}
        {!selectedDate && (
          <p
            className="mt-6 text-center text-[#94A3B8] text-sm"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Select a weekday above to see available slots
          </p>
        )}

        {/* Debug panel */}
        <DebugPanel bookings={bookings} />
      </div>

      {/* Modal */}
      {activeSlot && selectedDate && (
        <SeatPickerModal
          date={selectedDate}
          slotId={activeSlot}
          bookings={bookings}
          onConfirm={handleConfirm}
          onClose={() => setActiveSlot(null)}
        />
      )}
    </main>
  )
}
