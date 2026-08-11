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
  reserveDisabledMessage?: string | null
  actionLabel?: string
  submittingLabel?: string
  confirmedTitle?: string
  confirmedDescription?: string
  resetLabel?: string
  securityText?: string
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
      className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      style={{ borderBottom: last ? 'none' : '1px solid var(--border-subtle)' }}
    >
      <span className="text-sm sm:flex-shrink-0" style={{ color: 'var(--text-muted)', minWidth: 80 }}>{label}</span>
      <span className="break-words text-sm font-medium sm:text-right" style={{ color: 'var(--text-primary)' }}>{value}</span>
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
  reserveDisabledMessage,
  actionLabel = 'Reserve seat',
  submittingLabel = 'Reserving...',
  confirmedTitle = 'Booking confirmed!',
  confirmedDescription,
  resetLabel = 'Schedule another exam',
  securityText = 'Your booking is secure and confidential.',
  onReserve,
  onReset,
}: BookingSummaryCardProps) {
  return (
    <div className="panel flex flex-col p-4 sm:p-5">
      {/* Header */}
        <div className="mb-4 flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent-subtle)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="var(--accent-color)" strokeWidth="1.3" />
            <path d="M4.5 7h5M4.5 4.5h3M4.5 9.5h4" stroke="var(--accent-color)" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Booking summary</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Review your selection</p>
        </div>
      </div>

      {/* ── Confirmed state ───────────────────────────── */}
      {isConfirmed ? (
        <div className="flex-1 flex flex-col anim-scale-in">
          {/* Success banner */}
          <div
            className="rounded-2xl p-4 mb-4 flex items-center gap-3 anim-success"
            style={{ background: 'var(--success-subtle)', border: '1px solid var(--success-border)' }}
          >
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
              style={{ background: 'var(--success)' }}
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
              <p className="text-sm font-semibold" style={{ color: 'var(--success-strong)' }}>{confirmedTitle}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--success-strong)' }}>
                {confirmedDescription ?? `${time} · ${date}`}
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
                  style={{ background: 'var(--accent-subtle)', color: 'var(--accent-color)', border: '1px solid var(--accent-border)' }}
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
            className="mt-5 min-h-11 w-full cursor-pointer rounded-2xl py-3 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
            style={{ background: 'var(--border-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--border-subtle)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--border-subtle)' }}
          >
            {resetLabel}
          </button>
        </div>
      ) : (
        /* ── Pending / empty state ───────────────────── */
        <>
          <div className="flex-1">
            <SummaryRow
              label="Student"
              value={<span style={{ color: studentName ? 'var(--text-primary)' : 'var(--text-muted)' }}>{studentName || 'Not entered'}</span>}
            />
            <SummaryRow
              label="Exam"
              value={<span style={{ color: exam ? 'var(--text-primary)' : 'var(--text-muted)' }}>{exam || 'Not entered'}</span>}
            />
            <SummaryRow
              label="Exam type"
              value={
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--accent-subtle)', color: 'var(--accent-color)', border: '1px solid var(--accent-border)' }}
                >
                  {examType.charAt(0).toUpperCase() + examType.slice(1)}
                </span>
              }
            />
            <SummaryRow
              label="Date"
              value={<span style={{ color: date ? 'var(--text-primary)' : 'var(--text-muted)' }}>{date || 'Not selected'}</span>}
            />
            <SummaryRow
              label="Time"
              value={
                <span style={{ color: time ? 'var(--text-primary)' : 'var(--text-muted)' }}>
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
                  color: 'var(--danger)',
                  background: 'var(--danger-subtle)',
                  border: '1px solid var(--danger-border)',
                  borderRadius: 8,
                  padding: '0.5rem 0.75rem',
                }}
              >
                {error}
              </p>
            )}

            {reserveDisabledMessage && !error && (
              <p
                className="anim-fade-in text-[0.8125rem]"
                style={{
                  color: 'var(--text-body)',
                  background: 'var(--surface-alt)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 8,
                  padding: '0.5rem 0.75rem',
                }}
              >
                {reserveDisabledMessage}
              </p>
            )}

            <button
              onClick={onReserve}
              disabled={!canReserve}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] focus-visible:ring-offset-2"
              style={
                canReserve
                  ? { background: 'var(--accent-color)', color: 'var(--text-on-accent)', cursor: 'pointer' }
                  : { background: 'var(--surface-subtle)', color: 'var(--text-muted)', cursor: 'not-allowed' }
              }
              onMouseEnter={e => { if (canReserve) e.currentTarget.style.background = 'var(--accent-strong)' }}
              onMouseLeave={e => { if (canReserve) e.currentTarget.style.background = 'var(--accent-color)' }}
              onMouseDown={e => { if (canReserve) e.currentTarget.style.transform = 'scale(0.98)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              {isSubmitting ? submittingLabel : actionLabel}
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
                  stroke="var(--text-muted)"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {securityText}
              </span>
            </div>
          </div>

          {/* Inline hint for missing fields */}
          {!canReserve && (studentName || exam || date || time) && (
            <p className="text-[11px] text-center mt-2" style={{ color: 'var(--text-muted)' }}>
              {!studentName.trim()
                ? 'Enter your name to continue'
                : !exam.trim()
                ? 'Enter your exam name to continue'
                : !date
                ? 'Select a date to continue'
                : !time
                ? 'Select a time slot to continue'
                : reserveDisabledMessage
                ? reserveDisabledMessage
                : ''}
            </p>
          )}
        </>
      )}
    </div>
  )
}
