'use client'

import type { Reservation } from './types'

interface DebugPanelProps {
  reservations: Reservation[]
}

export default function DebugPanel({ reservations }: DebugPanelProps) {
  if (process.env.NODE_ENV !== 'development') return null

  return (
    <div className="mt-8 rounded-xl border-2 border-dashed border-[#FCD34D] bg-[#FFFBEB] p-4" role="region" aria-label="Debug panel">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold text-[#B45309] uppercase tracking-widest">
          Debug - Reservations State ({reservations.length})
        </span>
        <button
          onClick={() => console.log(JSON.stringify(reservations, null, 2))}
          className="text-xs bg-[#FDE68A] hover:bg-[#FCD34D] text-[#92400E] font-semibold px-3 py-1 rounded-lg transition-colors duration-150 cursor-pointer"
        >
          Log to console
        </button>
      </div>
      <pre className="text-[11px] text-[#78350F] overflow-x-auto whitespace-pre-wrap break-all font-mono leading-relaxed">
        {JSON.stringify(reservations, null, 2)}
      </pre>
    </div>
  )
}
