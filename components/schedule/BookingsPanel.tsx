'use client'

import { useMemo, useState } from 'react'
import type { Reservation, SwapStatus } from './types'

interface BookingsPanelProps {
  reservations: Reservation[]
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

export default function BookingsPanel({ reservations }: BookingsPanelProps) {
  const [swapStatus, setSwapStatus] = useState<Record<string, SwapStatus>>({})
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

  function handleSwap(id: string) {
    if (swapStatus[id] === 'pending') return
    setSwapStatus(prev => ({ ...prev, [id]: 'pending' }))
  }

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
            <h2 className="text-sm font-semibold" style={{ color: '#111827' }}>Bookings</h2>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              Confirmed reservations for this school.
            </p>
          </div>
        </div>
        <button
          className="text-xs font-medium flex-shrink-0 transition-colors duration-150 hover:underline"
          style={{ color: '#2563EB' }}
        >
          How swapping works
        </button>
      </div>

      {sortedReservations.length > 0 ? (
        <div className="overflow-x-auto -mx-1 px-1">
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
                const status = swapStatus[booking.id] ?? 'idle'
                const isPending = status === 'pending'
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
                      <button
                        onClick={() => handleSwap(booking.id)}
                        disabled={isPending}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all duration-200 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        style={
                          isPending
                            ? { background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', cursor: 'default' }
                            : { background: 'transparent', color: '#2563EB', border: '1px solid #BFDBFE', cursor: 'pointer' }
                        }
                        onMouseEnter={e => {
                          if (!isPending) {
                            e.currentTarget.style.background = '#EFF6FF'
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isPending) {
                            e.currentTarget.style.background = 'transparent'
                          }
                        }}
                        aria-label={
                          isPending
                            ? `Swap request pending with ${booking.studentName}`
                            : `Request swap with ${booking.studentName}`
                        }
                      >
                        {isPending ? (
                          <span className="flex items-center gap-1.5">
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 10 10"
                              fill="none"
                              aria-hidden="true"
                              style={{ animation: 'swapSpin 1.4s linear infinite' }}
                            >
                              <path d="M5 1.5A3.5 3.5 0 0 1 8.5 5" stroke="#B45309" strokeWidth="1.3" strokeLinecap="round" />
                            </svg>
                            Pending
                          </span>
                        ) : (
                          'Request swap'
                        )}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-[#E4E8EF] bg-[#F9FAFB] px-4 py-8 text-center">
          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>No confirmed bookings</p>
          <p className="mt-1 text-xs" style={{ color: '#9CA3AF' }}>
            Reservations will appear here after students book exam slots.
          </p>
        </div>
      )}

      <div className="mt-4 pt-4 flex items-center justify-center gap-1" style={{ borderTop: '1px solid #F3F4F6' }}>
        <span className="text-xs" style={{ color: '#9CA3AF' }}>
          Swap requests are not enabled yet.
        </span>
      </div>
    </div>
  )
}
