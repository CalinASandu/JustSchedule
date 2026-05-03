'use client'

import type { ReactNode } from 'react'
import type { ExamType } from './types'

interface BookingSummaryCardProps {
  studentName: string
  exam: string
  examType: ExamType
  date: string | null
  time: string | null
  duration: string | null
  canReserve: boolean
  isSubmitting: boolean
  isConfirmed: boolean
  error: string | null
  onReserve: () => void
  onReset: () => void
}

interface SummaryRowProps {
  label: string
  value: ReactNode
  last?: boolean
}

function SummaryRow({ label, value, last = false }: SummaryRowProps) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-3"
      style={{ borderBottom: last ? 'none' : '1px solid #F3F4F6' }}
    >
      <span className="text-sm flex-shrink-0" style={{ color: '#9CA3AF', minWidth: 80 }}>{label}</span>
      <span className="text-sm font-medium text-right" style={{ color: '#111827' }}>{value}</span>
    </div>
  )
}

export default function BookingSummaryCard({
  studentName,
  exam,
  examType,
  date,
  time,
  duration,
  canReserve,
  isSubmitting,
  isConfirmed,
  error,
  onReserve,
  onReset,
}: BookingSummaryCardProps) {
  return (
    <div className="panel p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: '#EFF6FF' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="#2563EB" strokeWidth="1.3" />
            <path d="M4.5 7h5M4.5 4.5h3M4.5 9.5h4" stroke="#2563EB" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#111827' }}>Booking summary</h2>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>Review your selection</p>
        </div>
      </div>

      {/* ── Confirmed state ───────────────────────────── */}
      {isConfirmed ? (
        <div className="flex-1 flex flex-col anim-scale-in">
          {/* Success banner */}
          <div
            className="rounded-2xl p-4 mb-4 flex items-center gap-3 anim-success"
            style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: '#16A34A' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M3 8l3.5 3.5L13 4.5"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#15803D' }}>Booking confirmed!</p>
              <p className="text-xs mt-0.5" style={{ color: '#4ADE80' }}>
                {time} · {date}
              </p>
            </div>
          </div>

          {/* Confirmed details */}
          <div className="flex-1">
            <SummaryRow label="Student" value={studentName || '—'} />
            <SummaryRow label="Exam" value={exam || '—'} />
            <SummaryRow
              label="Exam type"
              value={
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}
                >
                  {examType.charAt(0).toUpperCase() + examType.slice(1)}
                </span>
              }
            />
            <SummaryRow label="Date" value={date ?? '—'} />
            <SummaryRow
              label="Time"
              value={time ? `${time}${duration ? ` (${duration})` : ''}` : '—'}
              last
            />
          </div>

          <button
            onClick={onReset}
            className="mt-5 w-full py-3 rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            style={{ background: '#F3F4F6', color: '#6B7280', border: '1px solid #E4E8EF' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#E9EAEB' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F3F4F6' }}
          >
            Schedule another exam
          </button>
        </div>
      ) : (
        /* ── Pending / empty state ───────────────────── */
        <>
          <div className="flex-1">
            <SummaryRow
              label="Student"
              value={<span style={{ color: studentName ? '#111827' : '#D1D5DB' }}>{studentName || 'Not entered'}</span>}
            />
            <SummaryRow
              label="Exam"
              value={<span style={{ color: exam ? '#111827' : '#D1D5DB' }}>{exam || 'Not entered'}</span>}
            />
            <SummaryRow
              label="Exam type"
              value={
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}
                >
                  {examType.charAt(0).toUpperCase() + examType.slice(1)}
                </span>
              }
            />
            <SummaryRow
              label="Date"
              value={<span style={{ color: date ? '#111827' : '#D1D5DB' }}>{date || 'Not selected'}</span>}
            />
            <SummaryRow
              label="Time"
              value={
                <span style={{ color: time ? '#111827' : '#D1D5DB' }}>
                  {time ? `${time}${duration ? ` (${duration})` : ''}` : 'Not selected'}
                </span>
              }
              last
            />
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {error && (
              <p
                className="anim-fade-in text-[0.8125rem]"
                style={{
                  color: '#dc2626',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  padding: '0.5rem 0.75rem',
                }}
              >
                {error}
              </p>
            )}

            <button
              onClick={onReserve}
              disabled={!canReserve}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              style={
                canReserve
                  ? { background: '#2563EB', color: '#ffffff', cursor: 'pointer' }
                  : { background: '#E5E7EB', color: '#9CA3AF', cursor: 'not-allowed' }
              }
              onMouseEnter={e => { if (canReserve) e.currentTarget.style.background = '#1D4ED8' }}
              onMouseLeave={e => { if (canReserve) e.currentTarget.style.background = '#2563EB' }}
              onMouseDown={e => { if (canReserve) e.currentTarget.style.transform = 'scale(0.98)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              {isSubmitting ? 'Reserving...' : 'Reserve seat'}
              {canReserve && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M3 7h8M8 4l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                <path
                  d="M5.5 1L1.5 2.5v3c0 2.485 1.7 4.5 4 5 2.3-.5 4-2.515 4-5v-3L5.5 1z"
                  stroke="#9CA3AF"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-[11px]" style={{ color: '#9CA3AF' }}>
                Your booking is secure and confidential.
              </span>
            </div>
          </div>

          {/* Inline hint for missing fields */}
          {!canReserve && (studentName || exam || date || time) && (
            <p className="text-[11px] text-center mt-2" style={{ color: '#D1D5DB' }}>
              {!studentName.trim()
                ? 'Enter your name to continue'
                : !exam.trim()
                ? 'Enter your exam name to continue'
                : !date
                ? 'Select a date to continue'
                : !time
                ? 'Select a time slot to continue'
                : ''}
            </p>
          )}
        </>
      )}
    </div>
  )
}
