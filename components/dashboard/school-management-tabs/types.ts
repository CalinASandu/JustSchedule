export type SchoolRole = "admin" | "professor" | "exam_supervisor" | "student";
export type ExamType = "midterm" | "final";
export type AttendanceStatus = "present" | "absent";
export type Decision = "approved" | "rejected";
export type ReservationViewMode = "day" | "week";
export type SchoolDashboardTab =
  | "members"
  | "reservations"
  | "attendance"
  | "requests"
  | "invites"
  | "settings";

export type SchoolMember = {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  role: SchoolRole;
  joinedAt: string;
  canSelfBook: boolean;
  selfBookingDisabledAt: string | null;
  selfBookingDisabledBy: string | null;
  isCurrentUser: boolean;
};

export type SchoolInvite = {
  id: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  url: string;
};

export type JoinRequest = {
  id: string;
  userId: string;
  schoolId: string;
  name: string;
  email: string | null;
  requestedAt: string;
};

export type ExamSlot = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  isActive: boolean;
  slotKind: "primary" | "overflow";
  primarySlotId: string | null;
};

export type Reservation = {
  id: string;
  userId: string;
  slotId: string;
  reservationDate: string;
  examName: string;
  examType: "midterm" | "final";
  status: string;
  createdAt: string;
  createdBy: string;
  createdByRole: SchoolRole;
  attendanceStatus: AttendanceStatus;
  attendanceMarkedBy: string | null;
  attendanceMarkedAt: string | null;
};

export type ReservationUpdateResult = {
  reservationId: string;
  bookedSlotId: string;
  bookedSlotKind: "primary" | "overflow";
  routedToOverflow: boolean;
  slotName: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  remaining: number;
};

export type AttendanceSession = {
  id: string;
  schoolId: string;
  slotId: string;
  reservationDate: string;
  startedBy: string;
  startedAt: string;
  expiresAt: string;
};

export type SchoolSubject = {
  id: string;
  name: string;
};

export type StatusState = {
  error: string | null;
  success: string | null;
};
