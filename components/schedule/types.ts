export type SlotId = '9-11' | '11-1' | '2-4:30'

export interface SlotDef {
  id: SlotId
  label: string
  duration: string
}

export interface Booking {
  date: string         // ISO: "2026-05-05"
  slot: SlotId         // '9-11' | '11-1' | '2-4:30'
  examName: string     // student-entered exam name
  studentName: string  // student's full name
}

export type AvailabilityStatus = 'available' | 'limited' | 'unavailable' | 'selected'
export type ExamType = 'midterm' | 'final'
export type SwapStatus = 'idle' | 'pending'
