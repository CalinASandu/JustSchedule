export interface SlotDef {
  id: string
  label: string
  duration: string
  startsAt: string
  endsAt: string
  capacity: number
  slotKind?: 'primary' | 'overflow'
  primarySlotId?: string | null
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
  createdBy: string
  createdByRole: SchoolRole
  attendanceStatus?: AttendanceStatus
  attendanceMarkedBy?: string | null
  attendanceMarkedAt?: string | null
}

export type AvailabilityStatus = 'available' | 'limited' | 'unavailable' | 'selected'
export type AttendanceStatus = 'present' | 'absent'
export type ExamType = 'midterm' | 'final'
export type SchoolRole = 'admin' | 'professor' | 'exam_supervisor' | 'student'
export type SwapStatus = 'idle' | 'pending'

export type ScheduleRequestStatus =
  | 'pending'
  | 'approved'
  | 'declined'
  | 'expired'
  | 'failed_capacity'
  | 'failed_conflict'
  | 'cancelled'

export interface ScheduleRequest {
  id: string
  schoolId: string
  studentUserId: string
  teacherUserId: string
  teacherName: string
  slotId: string
  slotGroupId: string
  slotName: string
  startsAt: string
  endsAt: string
  capacity: number
  overflowSlotId: string | null
  overflowCapacity: number | null
  reservationDate: string
  examName: string
  examType: ExamType
  status: ScheduleRequestStatus
  reviewerMessage: string | null
  reviewedAt: string | null
  reservationId: string | null
  expiresAt: string
  createdAt: string
  studentSeenAt: string | null
}

export interface TeacherOption {
  userId: string
  name: string
}

export interface UserNotification {
  id: string
  schoolId: string | null
  scheduleRequestId: string | null
  reservationId: string | null
  type: string
  title: string
  body: string
  href: string | null
  readAt: string | null
  createdAt: string
}
