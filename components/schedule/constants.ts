import type { SlotDef } from './types'

export const SEATS_PER_SLOT = 8

export const SLOTS: SlotDef[] = [
  { id: '9-11',   label: '9:00 – 11:00 AM',  duration: '2h' },
  { id: '11-1',   label: '11:00 AM – 1:00 PM', duration: '2h' },
  { id: '2-4:30', label: '2:00 – 4:30 PM',   duration: '2h 30m' },
]

export const OTHER_BOOKINGS = [
  {
    id: 'ob1',
    initials: 'AM',
    name: 'Alex Morgan',
    exam: 'Data Structures & Algorithms',
    type: 'Midterm' as const,
    date: 'Thu, Apr 30, 2026',
    time: '11:00 – 12:30',
  },
  {
    id: 'ob2',
    initials: 'JB',
    name: 'Jordan Brooks',
    exam: 'Data Structures & Algorithms',
    type: 'Midterm' as const,
    date: 'Tue, Apr 28, 2026',
    time: '09:00 – 10:30',
  },
  {
    id: 'ob3',
    initials: 'SM',
    name: 'Sophie Mitchell',
    exam: 'Data Structures & Algorithms',
    type: 'Midterm' as const,
    date: 'Fri, May 1, 2026',
    time: '14:00 – 15:30',
  },
  {
    id: 'ob4',
    initials: 'DL',
    name: 'Daniel Lee',
    exam: 'Data Structures & Algorithms',
    type: 'Midterm' as const,
    date: 'Mon, Apr 27, 2026',
    time: '16:00 – 17:30',
  },
]
