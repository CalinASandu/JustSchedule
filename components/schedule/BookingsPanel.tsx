'use client'

import { useMemo } from 'react'
import { Ban, Loader2 } from 'lucide-react'
import type { Reservation } from './types'

interface BookingsPanelProps {
  reservations: Reservation[]
  currentUserId: string
  cancelingReservationId: string | null
  cancelError: string | null
  title?: string
  description?: string
  emptyTitle?: string
  emptyDescription?: string
  onCancelReservation: (reservation: Reservation) => void
}

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'JS'
  )
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(value: string) {
  const [hour = '0', minute = '0'] = value.split(':')
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, Number(hour), Number(minute)))
}

function formatExamType(value: Reservation['examType']) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function getReservationActionState(booking: Reservation, currentUserId: string) {
  const isOwner = booking.userId === currentUserId
  const examStart = new Date(`${booking.reservationDate}T${booking.startsAt}`)
  const withinCutoff = isOwner && (examStart.getTime() - Date.now() < 2 * 60 * 60 * 1000)

  return {
    isOwner,
    withinCutoff,
    canCancel: isOwner && !withinCutoff,
  }
}

function ReservationAction({
  booking,
  currentUserId,
  cancelingReservationId,
  onCancelReservation,
  fullWidth = false,
}: {
  booking: Reservation
  currentUserId: string
  cancelingReservationId: string | null
  onCancelReservation: (reservation: Reservation) => void
  fullWidth?: boolean
}) {
  const { withinCutoff, canCancel } = getReservationActionState(booking, currentUserId)
  const isPending = cancelingReservationId === booking.id

  if (canCancel) {
    return (
      <button
        type="button"
        onClick={() => onCancelReservation(booking)}
        disabled={!!cancelingReservationId}
        className={`${fullWidth ? 'w-full justify-center' : ''} inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed`}
        style={{ background: 'transparent', color: '#DC2626', border: '1px solid #FECACA' }}
        onMouseEnter={e => {
          if (!cancelingReservationId) {
            e.currentTarget.style.background = '#FEF2F2'
          }
        }}
        onMouseLeave={e => {
          if (!cancelingReservationId) {
            e.currentTarget.style.background = 'transparent'
          }
        }}
        aria-label={`Cancel ${booking.examName} for ${booking.studentName}`}
      >
        {isPending ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Ban size={13} />
        )}
        Cancel
      </button>
    )
  }

  if (withinCutoff) {
    return (
      <span
        className="text-xs"
        style={{ color: '#9CA3AF' }}
        title="Cancellation is closed within 2 hours of the exam"
      >
        Cutoff reached
      </span>
    )
  }

  return (
    <span className="text-xs" style={{ color: '#CBD5E1' }}>
      Not yours
    </span>
  )
}

export default function BookingsPanel({
  reservations,
  currentUserId,
  cancelingReservationId,
  cancelError,
  title = 'Bookings',
  description = 'Confirmed reservations for this school.',
  emptyTitle = 'No confirmed bookings',
  emptyDescription = 'Reservations will appear here after students book exam slots.',
  onCancelReservation,
}: BookingsPanelProps) {
  const sortedReservations = useMemo(
    () =>
      [...reservations].sort((first, second) => {
        const dateCompare = first.reservationDate.localeCompare(second.reservationDate)
        if (dateCompare !== 0) return dateCompare

        const timeCompare = first.startsAt.localeCompare(second.startsAt)
        if (timeCompare !== 0) return timeCompare

        return first.createdAt.localeCompare(second.createdAt)
      }),
    [reservations],
  )

  return (
    <div className="panel p-5 flex flex-col">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: '#EFF6FF' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="4" cy="4.5" r="2" stroke="#2563EB" strokeWidth="1.3" />
              <circle cx="10" cy="4.5" r="2" stroke="#2563EB" strokeWidth="1.3" />
              <path d="M1 11c0-1.657 1.343-3 3-3h2M7 12l2-2 2 2M9 10v4" stroke="#2563EB" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: '#111827' }}>{title}</h2>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              {description}
            </p>
          </div>
        </div>
      </div>

      {cancelError && (
        <p
          className="anim-fade-in mb-4 text-[0.8125rem]"
          style={{
            color: '#DC2626',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            padding: '0.5rem 0.75rem',
          }}
        >
          {cancelError}
        </p>
      )}

      {sortedReservations.length > 0 ? (
        <>
        <div className="grid gap-3 md:hidden">
          {sortedReservations.map((booking, i) => {
            const delayClass = ['anim-slide-up', 'anim-slide-up anim-d1', 'anim-slide-up anim-d2', 'anim-slide-up anim-d3'][i] ?? 'anim-slide-up'

            return (
              <article
                key={booking.id}
                className={`rounded-xl border border-[#E4E8EF] bg-[#F9FAFB] p-4 ${delayClass}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                    style={{ background: '#EFF6FF', color: '#2563EB' }}
                    aria-hidden="true"
                  >
                    {getInitials(booking.studentName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words text-sm font-semibold" style={{ color: '#111827' }}>
                        {booking.examName}
                      </h3>
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}
                      >
                        {formatExamType(booking.examType)}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-sm" style={{ color: '#374151' }}>
                      {booking.studentName}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: '#6B7280' }}>
                      {formatDate(booking.reservationDate)} at {formatTime(booking.startsAt)} - {formatTime(booking.endsAt)}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <ReservationAction
                    booking={booking}
                    currentUserId={currentUserId}
                    cancelingReservationId={cancelingReservationId}
                    onCancelReservation={onCancelReservation}
                    fullWidth
                  />
                </div>
              </article>
            )
          })}
        </div>

        <div className="hidden overflow-x-auto px-1 md:block">
          <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                {['Student', 'Exam', 'Exam type', 'Date & time', 'Action'].map(col => (
                  <th
                    key={col}
                    className="text-left text-[11px] font-semibold uppercase tracking-wider pb-3 pr-4"
                    style={{ color: '#9CA3AF', whiteSpace: 'nowrap' }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedReservations.map((booking, i) => {
                const delayClass = ['anim-slide-up', 'anim-slide-up anim-d1', 'anim-slide-up anim-d2', 'anim-slide-up anim-d3'][i] ?? 'anim-slide-up'

                return (
                  <tr key={booking.id} className={`group transition-colors duration-150 ${delayClass}`}>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
                          style={{ background: '#EFF6FF', color: '#2563EB' }}
                          aria-hidden="true"
                        >
                          {getInitials(booking.studentName)}
                        </div>
                        <span className="font-medium whitespace-nowrap" style={{ color: '#111827' }}>
                          {booking.studentName}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 pr-4">
                      <span style={{ color: '#374151' }}>{booking.examName}</span>
                    </td>

                    <td className="py-3 pr-4">
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}
                      >
                        {formatExamType(booking.examType)}
                      </span>
                    </td>

                    <td className="py-3 pr-4">
                      <span className="whitespace-nowrap" style={{ color: '#374151' }}>
                        {formatDate(booking.reservationDate)}
                      </span>
                      <span className="ml-2 text-xs whitespace-nowrap" style={{ color: '#9CA3AF' }}>
                        {formatTime(booking.startsAt)} - {formatTime(booking.endsAt)}
                      </span>
                    </td>

                    <td className="py-3">
                      <ReservationAction
                        booking={booking}
                        currentUserId={currentUserId}
                        cancelingReservationId={cancelingReservationId}
                        onCancelReservation={onCancelReservation}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </>
      ) : (
        <div className="rounded-xl border border-[#E4E8EF] bg-[#F9FAFB] px-4 py-8 text-center">
          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>{emptyTitle}</p>
          <p className="mt-1 text-xs" style={{ color: '#9CA3AF' }}>
            {emptyDescription}
          </p>
        </div>
      )}

      <div className="mt-4 pt-4 flex items-center justify-center gap-1" style={{ borderTop: '1px solid #F3F4F6' }}>
        <span className="text-xs" style={{ color: '#9CA3AF' }}>
          You can cancel reservations assigned to you.
        </span>
      </div>
    </div>
  )
}
