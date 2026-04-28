'use client'

import type { Booking, SlotId } from './types'
import { SLOTS } from './constants'
import SlotCard from './SlotCard'

interface SlotCardListProps {
  date: string
  bookings: Booking[]
  onSelectSlot: (slotId: SlotId) => void
}

export default function SlotCardList({ date, bookings, onSelectSlot }: SlotCardListProps) {
  return (
    <div className="flex flex-col gap-3" role="list" aria-label="Available time slots">
      {SLOTS.map((slot) => {
        const bookedCount = bookings.filter(
          (b) => b.date === date && b.slot === slot.id
        ).length
        return (
          <div key={slot.id} role="listitem">
            <SlotCard
              slotId={slot.id}
              label={slot.label}
              bookedCount={bookedCount}
              onClick={() => onSelectSlot(slot.id)}
            />
          </div>
        )
      })}
    </div>
  )
}
