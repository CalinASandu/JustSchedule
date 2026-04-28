'use client'

import type { SlotId } from './types'
import { SEATS_PER_SLOT } from './constants'

interface SlotCardProps {
  slotId: SlotId
  label: string
  bookedCount: number
  onClick: () => void
}

export default function SlotCard({ slotId, label, bookedCount, onClick }: SlotCardProps) {
  const available = SEATS_PER_SLOT - bookedCount
  const isFull = available === 0
  const isLow = !isFull && available <= 2

  return (
    <button
      onClick={onClick}
      disabled={isFull}
      aria-label={`${label} (${slotId}) — ${isFull ? 'fully booked' : `${available} seats available`}`}
      className={[
        'w-full text-left rounded-xl border-2 px-4 py-3.5 transition-all duration-150',
        isFull
          ? 'border-[#E2E8F0] bg-[#F8FAFC] opacity-50 cursor-not-allowed'
          : 'border-[#E2E8F0] bg-white hover:border-[#2563EB] hover:shadow-sm cursor-pointer active:scale-[0.99]',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium text-[#94A3B8] uppercase tracking-wider mb-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Time Slot
          </p>
          <p className="text-base font-semibold text-[#1E293B]" style={{ fontFamily: "'EB Garamond', serif" }}>
            {label}
          </p>
        </div>
        <span
          className={[
            'shrink-0 rounded-full px-3 py-1 text-sm font-semibold',
            isFull
              ? 'bg-[#E2E8F0] text-[#94A3B8]'
              : isLow
              ? 'bg-[#FEF3C7] text-[#B45309]'
              : 'bg-[#DBEAFE] text-[#1D4ED8]',
          ].join(' ')}
          aria-hidden="true"
        >
          {isFull ? 'Full' : `${available} / ${SEATS_PER_SLOT}`}
        </span>
      </div>
    </button>
  )
}
