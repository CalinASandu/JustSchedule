'use client'

import type { Booking } from './types'

interface DebugPanelProps {
  bookings: Booking[]
}

export default function DebugPanel({ bookings }: DebugPanelProps) {
  if (process.env.NODE_ENV !== 'development') return null

  return (
    <div className="mt-8 rounded-xl border-2 border-dashed border-[#FCD34D] bg-[#FFFBEB] p-4" role="region" aria-label="Debug panel">
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[11px] font-bold text-[#B45309] uppercase tracking-widest"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Debug — Bookings State ({bookings.length})
        </span>
        <button
          onClick={() => console.log(JSON.stringify(bookings, null, 2))}
          className="text-xs bg-[#FDE68A] hover:bg-[#FCD34D] text-[#92400E] font-semibold px-3 py-1 rounded-lg transition-colors duration-150 cursor-pointer"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Log to console
        </button>
      </div>
      <pre
        className="text-[11px] text-[#78350F] overflow-x-auto whitespace-pre-wrap break-all font-mono leading-relaxed"
        aria-label="Bookings JSON"
      >
        {JSON.stringify(bookings, null, 2)}
      </pre>
    </div>
  )
}
