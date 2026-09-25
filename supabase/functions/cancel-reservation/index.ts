import { databaseErrorResponse, type ErrorRule } from "../_shared/errors.ts";
import { jsonResponse, readString, servePost } from "../_shared/http.ts";
import { authenticate } from "../_shared/supabase.ts";

type CancelResult = {
  reservation_id: string;
};

const cancelErrorRules: ErrorRule[] = [
  {
    codes: ["42501"],
    messages: ["only the student", "only students"],
    status: 403,
    code: "cancel_not_allowed",
    error: "Only students, admins, and professors can cancel reservations.",
  },
  {
    codes: ["28000"],
    messages: ["invalid session"],
    status: 401,
    code: "invalid_session",
    error: "Your session expired. Sign in again to cancel this reservation.",
  },
  {
    codes: ["P0002"],
    messages: ["already cancelled"],
    status: 409,
    code: "reservation_unavailable",
    error: "This reservation is no longer available to cancel.",
  },
  {
    codes: ["P0001"],
    messages: ["within 2 hours"],
    status: 403,
    code: "cancel_too_late",
    error: "Reservations cannot be cancelled within 2 hours of the exam start time.",
  },
];

servePost(async (body, authorization) => {
  const reservationId = readString(body, "reservationId");
  if (!reservationId) {
    return jsonResponse({ error: "Missing reservationId." }, 400);
  }

  const auth = await authenticate(authorization);
  if (auth instanceof Response) return auth;

  const { data, error } = await auth.supabase.rpc("cancel_reservation", {
    target_reservation_id: reservationId,
  });

  if (error) {
    return databaseErrorResponse("cancel_reservation RPC failed", error, cancelErrorRules, {
      code: "cancel_reservation_failed",
      error: "Could not cancel this reservation. Try again in a moment.",
    });
  }

  const [reservation] = (data ?? []) as CancelResult[];
  if (!reservation) {
    return jsonResponse({ error: "Could not cancel this reservation." }, 400);
  }

  return jsonResponse({ reservationId: reservation.reservation_id });
});
