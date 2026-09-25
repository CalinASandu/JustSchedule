import { databaseErrorResponse } from "../_shared/errors.ts";
import { jsonResponse, servePost } from "../_shared/http.ts";
import {
  parseReservationInput,
  type ReservationRpcResult,
  selfReservationRules,
} from "../_shared/reservations.ts";
import { authenticate } from "../_shared/supabase.ts";

/** The RPC reports which room the booking landed in when the primary slot routes to overflow. */
type ReserveResult = ReservationRpcResult & {
  booked_slot_id: string;
  booked_slot_kind: string;
  routed_to_overflow: boolean;
  slot_name: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
};

servePost(async (body, authorization) => {
  const input = parseReservationInput(body);
  if (typeof input === "string") {
    return jsonResponse({ error: input }, 400);
  }

  const auth = await authenticate(authorization);
  if (auth instanceof Response) return auth;

  // The RPC validates membership, self-booking permission, subject, date window, and capacity.
  const { data, error } = await auth.supabase.rpc("reserve_exam_slot", {
    target_school_id: input.schoolId,
    target_slot_id: input.slotId,
    target_reservation_date: input.reservationDate,
    target_exam_name: input.examName,
    target_exam_type: input.examType,
  });

  if (error) {
    return databaseErrorResponse(
      "reserve_exam_slot RPC failed",
      error,
      selfReservationRules,
      {
        code: "reservation_failed",
        error: "Could not schedule this exam. Try again in a moment.",
      },
    );
  }

  const [reservation] = (data ?? []) as ReserveResult[];
  if (!reservation) {
    return jsonResponse({ error: "Could not reserve exam slot." }, 400);
  }

  return jsonResponse({
    reservationId: reservation.reservation_id,
    remaining: reservation.remaining,
    bookedSlotId: reservation.booked_slot_id,
    bookedSlotKind: reservation.booked_slot_kind,
    routedToOverflow: reservation.routed_to_overflow,
    slotName: reservation.slot_name,
    startsAt: reservation.starts_at,
    endsAt: reservation.ends_at,
    capacity: reservation.capacity,
  });
});
