'use client'

import type { Reservation, SlotDef } from './types'
import SlotCard from './SlotCard'

interface SlotCardListProps {
  date: string
  reservations: Reservation[]
  slots: SlotDef[]
  onSelectSlot: (slotId: string) => void
}

export default function SlotCardList({ date, reservations, slots, onSelectSlot }: SlotCardListProps) {
  return (
    <div className="flex flex-col gap-3" role="list" aria-label="Available time slots">
      {slots.map((slot) => {
        const bookedCount = reservations.filter(
          (reservation) =>
            reservation.reservationDate === date &&
            reservation.slotId === slot.id &&
            reservation.status === 'confirmed',
        ).length
        return (
          <div key={slot.id} role="listitem">
            <SlotCard
              label={slot.label}
              bookedCount={bookedCount}
              capacity={slot.capacity}
              onClick={() => onSelectSlot(slot.id)}
            />
          </div>
        )
      })}
    </div>
  )
}
