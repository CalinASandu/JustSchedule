'use client'

import { useState } from 'react'
import type { Booking, SlotId, ExamType } from '@/components/schedule/types'
import { SLOTS } from '@/components/schedule/constants'
import Navbar from '@/components/schedule/Navbar'
import CalendarPanel from '@/components/schedule/CalendarPanel'
import SlotPicker from '@/components/schedule/SlotPicker'
import BookingSummaryCard from '@/components/schedule/BookingSummaryCard'
import SeatAvailabilityOverview from '@/components/schedule/SeatAvailabilityOverview'
import BookingsPanel from '@/components/schedule/BookingsPanel'
import DebugPanel from '@/components/schedule/DebugPanel'

export default function SchedulePage() {
  const [studentName, setStudentName]       = useState('Calin Sandu')
  const [selectedExam, setSelectedExam]     = useState('')
  const [examType, setExamType]             = useState<ExamType>('midterm')
  const [selectedDate, setSelectedDate]     = useState<string | null>(null)
  const [selectedSlotId, setSelectedSlotId] = useState<SlotId | null>(null)
  const [bookings, setBookings]             = useState<Booking[]>([])
  const [showConfirmation, setShowConfirmation] = useState(false)

  function handleDateSelect(date: string) {
    setSelectedDate(date)
    setSelectedSlotId(null)
    setShowConfirmation(false)
  }

  function handleSlotSelect(slotId: SlotId) {
    setSelectedSlotId(slotId)
    setShowConfirmation(false)
  }

  function handleReserve() {
    if (!selectedDate || !selectedSlotId) return
    setBookings(prev => {
      const already = prev.some(
        b => b.date === selectedDate && b.slot === selectedSlotId && b.studentName === studentName
      )
      if (already) return prev
      return [...prev, {
        date: selectedDate,
        slot: selectedSlotId,
        examName: selectedExam,
        studentName,
      }]
    })
    setShowConfirmation(true)
  }

  function handleReset() {
    setSelectedDate(null)
    setSelectedSlotId(null)
    setShowConfirmation(false)
  }

  const selectedSlotDef = selectedSlotId ? SLOTS.find(s => s.id === selectedSlotId) : null

  const formattedDate = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      })
    : null

  const canReserve =
    !!studentName.trim() &&
    !!selectedExam.trim() &&
    !!selectedDate &&
    !!selectedSlotId &&
    !showConfirmation

  return (
    <div className="min-h-dvh" style={{ background: '#F7F8FA' }}>
      <Navbar />

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px 64px' }}>
        {/* ── Page header ─────────────────────────────── */}
        <div className="flex items-end justify-between py-8">
          <div className="anim-slide-up">
            <h1
              className="text-4xl font-bold tracking-tight"
              style={{ color: '#111827', fontFamily: 'var(--font-serif)', lineHeight: 1.15 }}
            >
              Schedule your exam
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: '#9CA3AF' }}>
              Choose a date and time that works best for you.
            </p>
          </div>
          <button
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-colors duration-150 anim-slide-up focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            style={{ color: '#6B7280', border: '1px solid #E4E8EF', background: 'white' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'white' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M7 6v4M7 4.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Need help?
          </button>
        </div>

        {/* ── Main 3-column grid ───────────────────────── */}
        <div className="schedule-main-grid">
          <div className="anim-slide-up anim-d1">
            <CalendarPanel
              studentName={studentName}
              onStudentNameChange={setStudentName}
              selectedExam={selectedExam}
              onExamChange={setSelectedExam}
              examType={examType}
              onExamTypeChange={setExamType}
              selectedDate={selectedDate}
              onSelectDate={handleDateSelect}
            />
          </div>

          <div className="anim-slide-up anim-d2">
            <SlotPicker
              selectedDate={selectedDate}
              selectedSlotId={selectedSlotId}
              onSelectSlot={handleSlotSelect}
              bookings={bookings}
            />
          </div>

          <div className="anim-slide-up anim-d3">
            <BookingSummaryCard
              studentName={studentName}
              exam={selectedExam}
              examType={examType}
              date={formattedDate}
              time={selectedSlotDef?.label ?? null}
              duration={selectedSlotDef?.duration ?? null}
              canReserve={canReserve}
              isConfirmed={showConfirmation}
              onReserve={handleReserve}
              onReset={handleReset}
            />
          </div>
        </div>

        {/* ── Bottom 2-column grid ─────────────────────── */}
        <div className="schedule-bottom-grid mt-6">
          <div className="anim-slide-up anim-d2">
            <SeatAvailabilityOverview
              selectedDate={selectedDate}
              bookings={bookings}
            />
          </div>

          <div className="anim-slide-up anim-d3">
            <BookingsPanel />
          </div>
        </div>

        {/* Debug — dev only */}
        <div className="mt-8">
          <DebugPanel bookings={bookings} />
        </div>
      </main>
    </div>
  )
}
