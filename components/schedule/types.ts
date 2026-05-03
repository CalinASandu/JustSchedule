export interface SlotDef {
  id: string
  label: string
  duration: string
  startsAt: string
  endsAt: string
  capacity: number
}

export interface Reservation {
  id: string
  userId: string
  studentName: string
  slotId: string
  slotName: string
  startsAt: string
  endsAt: string
  capacity: number
  reservationDate: string
  examName: string
  examType: ExamType
  status: string
  createdAt: string
}

export type AvailabilityStatus = 'available' | 'limited' | 'unavailable' | 'selected'
export type ExamType = 'midterm' | 'final'
export type SwapStatus = 'idle' | 'pending'
