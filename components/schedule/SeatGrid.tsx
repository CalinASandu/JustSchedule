'use client'

import SeatIcon from './SeatIcon'
import { SEATS_PER_SLOT } from './constants'

interface SeatGridProps {
  bookedSeats: number[]
  selectedSeat: number | null
  onSelectSeat: (seat: number) => void
}

export default function SeatGrid({ bookedSeats, selectedSeat, onSelectSeat }: SeatGridProps) {
  return (
    <div className="grid grid-cols-4 gap-3 p-4" role="group" aria-label="Seat selection grid">
      {Array.from({ length: SEATS_PER_SLOT }, (_, i) => i + 1).map((seat) => (
        <SeatIcon
          key={seat}
          seatNumber={seat}
          isBooked={bookedSeats.includes(seat)}
          isSelected={selectedSeat === seat}
          onClick={() => !bookedSeats.includes(seat) && onSelectSeat(seat)}
        />
      ))}
    </div>
  )
}
