import type { SlotDef } from './types'

export const SEATS_PER_SLOT = 8

export const SLOTS: SlotDef[] = [
  {
    id: '9-11',
    label: '9:00 - 11:00 AM',
    duration: '2h',
    startsAt: '09:00:00',
    endsAt: '11:00:00',
    capacity: SEATS_PER_SLOT,
  },
  {
    id: '11-1',
    label: '11:00 AM - 1:00 PM',
    duration: '2h',
    startsAt: '11:00:00',
    endsAt: '13:00:00',
    capacity: SEATS_PER_SLOT,
  },
  {
    id: '2-4:30',
    label: '2:00 - 4:30 PM',
    duration: '2h 30m',
    startsAt: '14:00:00',
    endsAt: '16:30:00',
    capacity: SEATS_PER_SLOT,
  },
]
