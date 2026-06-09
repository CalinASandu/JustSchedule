import { createClient } from "npm:@supabase/supabase-js@2.105.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ExamType = "midterm" | "final";

type ReserveRequest = {
  schoolId?: unknown;
  slotId?: unknown;
  reservationDate?: unknown;
  examName?: unknown;
  examType?: unknown;
};

type ReserveResult = {
  reservation_id: string;
  remaining: number;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseExamType(value: unknown): ExamType | null {
  return value === "midterm" || value === "final" ? value : null;
}

function statusForDatabaseError(error: { code?: string; message?: string }) {
  const message = (error.message ?? "").toLowerCase();

  if (error.code === "23505" || message.includes("already reserved")) {
    return 409;
  }

  if (message.includes("full")) {
    return 409;
  }

  if (message.includes("self booking is disabled")) {
    return 403;
  }

  if (
    message.includes("student members") ||
    message.includes("invalid session")
  ) {
    return 403;
  }

  if (
    error.code === "22023" ||
    message.includes("unavailable") ||
    message.includes("reservation date") ||
    message.includes("exam")
  ) {
    return 400;
  }

  return 400;
}

function publicReservationError(error: { code?: string; message?: string }) {
  const message = (error.message ?? "").toLowerCase();

  if (message.includes("future reservation for this exam and type")) {
    return {
      code: "duplicate_exam",
      error: "You already have a future reservation for this exam and type.",
    };
  }

  if (error.code === "23505" || message.includes("already reserved")) {
    return {
      code: "duplicate_reservation",
      error: "You already scheduled an exam in this time slot for that date.",
    };
  }

  if (message.includes("full")) {
    return {
      code: "slot_full",
      error: "This time slot is full. Choose another time.",
    };
  }

  if (message.includes("only student members")) {
    return {
      code: "student_membership_required",
      error: "Only student members can schedule exams.",
    };
  }

  if (message.includes("self booking is disabled")) {
    return {
      code: "self_booking_disabled",
      error: "A professor must schedule this exam for you.",
    };
  }

  if (message.includes("invalid session")) {
    return {
      code: "invalid_session",
      error: "Your session expired. Sign in again to schedule this exam.",
    };
  }

  if (message.includes("weekend")) {
    return {
      code: "weekend_unavailable",
      error: "Exams cannot be scheduled on weekends.",
    };
  }

  if (message.includes("next 14 days") || message.includes("reservation date")) {
    return {
      code: "date_outside_window",
      error: "Choose a date within the next 14 days.",
    };
  }

  if (message.includes("slot is unavailable")) {
    return {
      code: "slot_unavailable",
      error: "This time slot is no longer available. Choose another time.",
    };
  }

  if (message.includes("exam name")) {
    return {
      code: "exam_name_required",
      error: "Enter the exam name before scheduling.",
    };
  }

  if (message.includes("exam type")) {
    return {
      code: "invalid_exam_type",
      error: "Choose a valid exam type.",
    };
  }

  return {
    code: "reservation_failed",
    error: "Could not schedule this exam. Try again in a moment.",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    return jsonResponse({ error: "Missing authorization header." }, 401);
  }

  let body: ReserveRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const schoolId = typeof body.schoolId === "string" ? body.schoolId.trim() : "";
  const slotId = typeof body.slotId === "string" ? body.slotId.trim() : "";
  const reservationDate =
    typeof body.reservationDate === "string" ? body.reservationDate.trim() : "";
  const examName = typeof body.examName === "string" ? body.examName.trim() : "";
  const examType = parseExamType(body.examType);

  if (!schoolId) {
    return jsonResponse({ error: "Missing schoolId." }, 400);
  }

  if (!slotId) {
    return jsonResponse({ error: "Missing slotId." }, 400);
  }

  if (!isIsoDate(reservationDate)) {
    return jsonResponse({ error: "reservationDate must use YYYY-MM-DD." }, 400);
  }

  if (!examName) {
    return jsonResponse({ error: "examName is required." }, 400);
  }

  if (!examType) {
    return jsonResponse({ error: "examType must be midterm or final." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKey =
    Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    "";

  if (!supabaseUrl || !publishableKey) {
    return jsonResponse(
      { error: "Supabase environment is not configured." },
      500,
    );
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    global: {
      headers: { Authorization: authorization },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: "Invalid session." }, 401);
  }

  const { data: subjectData } = await supabase
    .from("SchoolSubjects")
    .select("id")
    .eq("school_id", schoolId)
    .is("deleted_at", null)
    .ilike("name", examName)
    .maybeSingle();

  if (!subjectData) {
    return jsonResponse(
      { code: "invalid_subject", error: "Select a valid subject from the list." },
      400,
    );
  }

  const { data, error } = await supabase.rpc("reserve_exam_slot", {
    target_school_id: schoolId,
    target_slot_id: slotId,
    target_reservation_date: reservationDate,
    target_exam_name: examName,
    target_exam_type: examType,
  });

  if (error) {
    console.error("reserve_exam_slot RPC failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return jsonResponse(publicReservationError(error), statusForDatabaseError(error));
  }

  const [reservation] = (data ?? []) as ReserveResult[];
  if (!reservation) {
    return jsonResponse({ error: "Could not reserve exam slot." }, 400);
  }

  return jsonResponse({
    reservationId: reservation.reservation_id,
    remaining: reservation.remaining,
  });
});
