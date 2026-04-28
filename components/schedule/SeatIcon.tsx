'use client'

interface SeatIconProps {
  seatNumber: number
  isBooked: boolean
  isSelected: boolean
  onClick: () => void
}

export default function SeatIcon({ seatNumber, isBooked, isSelected, onClick }: SeatIconProps) {
  if (isBooked) {
    return (
      <div
        className="flex flex-col items-center gap-1 cursor-not-allowed select-none"
        title={`Seat ${seatNumber} — booked`}
        aria-label={`Seat ${seatNumber}, booked`}
        aria-disabled="true"
      >
        <div className="w-11 h-11 rounded-t-lg rounded-b-sm bg-[#E2E8F0] border-2 border-[#CBD5E1] flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#94A3B8]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>
        <span className="text-xs font-medium text-[#94A3B8]">{seatNumber}</span>
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      title={`Seat ${seatNumber}`}
      aria-label={`Seat ${seatNumber}, ${isSelected ? 'selected' : 'available'}`}
      aria-pressed={isSelected}
      className={[
        'flex flex-col items-center gap-1 cursor-pointer transition-transform duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 rounded-sm',
        isSelected ? 'scale-105' : 'hover:scale-105 active:scale-95',
      ].join(' ')}
    >
      <div
        className={[
          'w-11 h-11 rounded-t-lg rounded-b-sm border-2 flex items-center justify-center transition-colors duration-150',
          isSelected
            ? 'bg-[#2563EB] border-[#1D4ED8]'
            : 'bg-white border-[#2563EB] hover:bg-[#EFF6FF]',
        ].join(' ')}
      >
        <svg viewBox="0 0 24 24" className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-[#2563EB]'}`} fill="currentColor">
          <path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm0 2h16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2z" />
        </svg>
      </div>
      <span className={`text-xs font-medium ${isSelected ? 'text-[#2563EB]' : 'text-[#64748B]'}`}>
        {seatNumber}
      </span>
    </button>
  )
}
