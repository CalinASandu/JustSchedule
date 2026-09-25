import { databaseErrorResponse } from "../_shared/errors.ts";
import { jsonResponse, readString, servePost } from "../_shared/http.ts";
import {
  parseReservationInput,
  type ReservationRpcResult,
  staffReservationRules,
} from "../_shared/reservations.ts";
import { authenticate } from "../_shared/supabase.ts";

servePost(async (body, authorization) => {
  const studentUserId = readString(body, "studentUserId");
  const input = parseReservationInput(body);

  if (typeof input === "string") {
    return jsonResponse({ error: input }, 400);
  }

  if (!studentUserId) {
    return jsonResponse({ error: "Missing studentUserId." }, 400);
  }

  const auth = await authenticate(authorization);
  if (auth instanceof Response) return auth;

  // The RPC validates the caller's role, the student's membership, subject, date window, and capacity.
  const { data, error } = await auth.supabase.rpc("schedule_exam_for_student", {
    target_school_id: input.schoolId,
    target_student_user_id: studentUserId,
    target_slot_id: input.slotId,
    target_reservation_date: input.reservationDate,
    target_exam_name: input.examName,
    target_exam_type: input.examType,
  });

  if (error) {
    return databaseErrorResponse(
      "schedule_exam_for_student RPC failed",
      error,
      staffReservationRules,
      {
        code: "schedule_for_student_failed",
        error: "Could not schedule this exam. Try again in a moment.",
      },
    );
  }

  const [reservation] = (data ?? []) as ReservationRpcResult[];
  if (!reservation) {
    return jsonResponse({ error: "Could not schedule this exam." }, 400);
  }

  return jsonResponse({
    reservationId: reservation.reservation_id,
    remaining: reservation.remaining,
  });
});
