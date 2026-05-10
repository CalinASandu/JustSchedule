import { createClient } from "npm:@supabase/supabase-js@2.105.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CancelRequest = {
  reservationId?: unknown;
};

type CancelResult = {
  reservation_id: string;
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

function statusForDatabaseError(error: { code?: string; message?: string }) {
  const message = (error.message ?? "").toLowerCase();

  if (
    error.code === "42501" ||
    message.includes("only the student") ||
    message.includes("only students")
  ) {
    return 403;
  }

  if (error.code === "28000" || message.includes("invalid session")) {
    return 401;
  }

  if (error.code === "P0002" || message.includes("already cancelled")) {
    return 409;
  }

  return 400;
}

function publicCancelError(error: { code?: string; message?: string }) {
  const message = (error.message ?? "").toLowerCase();

  if (
    error.code === "42501" ||
    message.includes("only the student") ||
    message.includes("only students")
  ) {
    return {
      code: "cancel_not_allowed",
      error: "Only students, admins, and professors can cancel reservations.",
    };
  }

  if (error.code === "28000" || message.includes("invalid session")) {
    return {
      code: "invalid_session",
      error: "Your session expired. Sign in again to cancel this reservation.",
    };
  }

  if (error.code === "P0002" || message.includes("already cancelled")) {
    return {
      code: "reservation_unavailable",
      error: "This reservation is no longer available to cancel.",
    };
  }

  return {
    code: "cancel_reservation_failed",
    error: "Could not cancel this reservation. Try again in a moment.",
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

  let body: CancelRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const reservationId =
    typeof body.reservationId === "string" ? body.reservationId.trim() : "";

  if (!reservationId) {
    return jsonResponse({ error: "Missing reservationId." }, 400);
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

  const { data, error } = await supabase.rpc("cancel_reservation", {
    target_reservation_id: reservationId,
  });

  if (error) {
    console.error("cancel_reservation RPC failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return jsonResponse(publicCancelError(error), statusForDatabaseError(error));
  }

  const [reservation] = (data ?? []) as CancelResult[];
  if (!reservation) {
    return jsonResponse({ error: "Could not cancel this reservation." }, 400);
  }

  return jsonResponse({
    reservationId: reservation.reservation_id,
  });
});
