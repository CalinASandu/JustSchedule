import { isIsoDate, type JsonBody, readString } from "./http.ts";
import type { ErrorRule } from "./errors.ts";

export type ExamType = "midterm" | "final";

export type ReservationRpcResult = {
  reservation_id: string;
  remaining: number;
};

export type ReservationInput = {
  schoolId: string;
  slotId: string;
  reservationDate: string;
  examName: string;
  examType: ExamType;
};

/**
 * Validates the reservation fields shared by the booking endpoints.
 * Returns the parsed input, or the error message to send back with a 400.
 * Subject, date-window, and capacity checks stay in the RPCs, which are authoritative.
 */
export function parseReservationInput(body: JsonBody): ReservationInput | string {
  const schoolId = readString(body, "schoolId");
  const slotId = readString(body, "slotId");
  const reservationDate = readString(body, "reservationDate");
  const examName = readString(body, "examName");
  const examType = body.examType;

  if (!schoolId) return "Missing schoolId.";
  if (!slotId) return "Missing slotId.";
  if (!isIsoDate(reservationDate)) return "reservationDate must use YYYY-MM-DD.";
  if (!examName) return "examName is required.";
  if (examType !== "midterm" && examType !== "final") {
    return "examType must be midterm or final.";
  }

  return { schoolId, slotId, reservationDate, examName, examType };
}

/** Error rules every reservation RPC shares, regardless of who is booking. */
const commonReservationRules: ErrorRule[] = [
  {
    messages: ["full"],
    status: 409,
    code: "slot_full",
    error: "This time slot is full. Choose another time.",
  },
  {
    messages: ["invalid session"],
    status: 403,
    code: "invalid_session",
    error: "Your session expired. Sign in again to schedule this exam.",
  },
  {
    // Must come before the generic "exam name" rule below.
    messages: ["active school subject"],
    status: 400,
    code: "invalid_subject",
    error: "Select a valid subject from the list.",
  },
  {
    messages: ["weekend"],
    status: 400,
    code: "weekend_unavailable",
    error: "Exams cannot be scheduled on weekends.",
  },
  {
    messages: ["next 14 days", "reservation date"],
    status: 400,
    code: "date_outside_window",
    error: "Choose a date within the next 14 days.",
  },
  {
    messages: ["slot is unavailable"],
    status: 400,
    code: "slot_unavailable",
    error: "This time slot is no longer available. Choose another time.",
  },
  {
    messages: ["exam name"],
    status: 400,
    code: "exam_name_required",
    error: "Enter the exam name before scheduling.",
  },
  {
    messages: ["exam type"],
    status: 400,
    code: "invalid_exam_type",
    error: "Choose a valid exam type.",
  },
];

/** `reserve_exam_slot`: a student booking for themselves. */
export const selfReservationRules: ErrorRule[] = [
  {
    messages: ["future reservation for this exam and type"],
    status: 409,
    code: "duplicate_exam",
    error: "You already have a future reservation for this exam and type.",
  },
  {
    codes: ["23505"],
    messages: ["already reserved"],
    status: 409,
    code: "duplicate_reservation",
    error: "You already scheduled an exam in this time slot for that date.",
  },
  {
    messages: ["only student members"],
    status: 403,
    code: "student_membership_required",
    error: "Only student members can schedule exams.",
  },
  {
    messages: ["self booking is disabled"],
    status: 403,
    code: "self_booking_disabled",
    error: "A professor must schedule this exam for you.",
  },
  ...commonReservationRules,
];

/** `schedule_exam_for_student`: an admin or professor booking for a student. */
export const staffReservationRules: ErrorRule[] = [
  {
    messages: ["future reservation for this exam and type"],
    status: 409,
    code: "duplicate_exam",
    error: "This student already has a future reservation for this exam and type.",
  },
  {
    codes: ["23505"],
    messages: ["already"],
    status: 409,
    code: "duplicate_reservation",
    error: "This student already has an exam in that time slot for that date.",
  },
  {
    messages: ["only admins and professors"],
    status: 403,
    code: "teacher_permission_required",
    error: "Only admins and professors can schedule exams for students.",
  },
  {
    messages: ["target user must be a student"],
    status: 403,
    code: "student_membership_required",
    error: "Choose a student member from this school.",
  },
  ...commonReservationRules,
];
