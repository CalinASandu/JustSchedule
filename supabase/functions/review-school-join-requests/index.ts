import { createClient } from "npm:@supabase/supabase-js@2.105.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Decision = "approved" | "rejected";

type ReviewRequest = {
  schoolId?: unknown;
  decisions?: unknown;
};

type ParsedDecision = {
  requestId: string;
  decision: Decision;
};

type JoinRequestRow = {
  id: string;
  school_id: string;
  user_id: string;
  status: string;
};

type SchoolMemberRow = {
  user_id: string;
};

function publicDatabaseError(fallback: string) {
  return {
    code: "review_failed",
    error: fallback,
  };
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function parseDecisions(value: unknown): ParsedDecision[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const parsed = value.map((item) => {
    if (!item || typeof item !== "object") {
      return null;
    }

    const requestId =
      "requestId" in item && typeof item.requestId === "string"
        ? item.requestId.trim()
        : "";
    const decision = "decision" in item ? item.decision : "";

    if (!requestId || (decision !== "approved" && decision !== "rejected")) {
      return null;
    }

    return { requestId, decision };
  });

  if (parsed.some((item) => item === null)) {
    return null;
  }

  const unique = new Map<string, ParsedDecision>();
  for (const item of parsed as ParsedDecision[]) {
    unique.set(item.requestId, item);
  }

  return Array.from(unique.values());
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

  let body: ReviewRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const schoolId =
    typeof body.schoolId === "string" ? body.schoolId.trim() : "";
  const decisions = parseDecisions(body.decisions);

  if (!schoolId) {
    return jsonResponse({ error: "Missing schoolId." }, 400);
  }

  if (!decisions) {
    return jsonResponse(
      { error: "Provide at least one valid join request decision." },
      400,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKey =
    Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return jsonResponse(
      { error: "Supabase environment is not configured." },
      500,
    );
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
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
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: "Invalid session." }, 401);
  }

  const [{ data: membership }, { data: school }] = await Promise.all([
    userClient
      .from("SchoolMembers")
      .select("role")
      .eq("school_id", schoolId)
      .eq("user_id", user.id)
      .maybeSingle(),
    userClient
      .from("Schools")
      .select("created_by")
      .eq("id", schoolId)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  const isAdmin =
    membership?.role === "admin" || school?.created_by === user.id;

  if (!isAdmin) {
    return jsonResponse(
      { error: "Only school admins can review join requests." },
      403,
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const requestIds = decisions.map((decision) => decision.requestId);
  const { data: requestRows, error: requestError } = await adminClient
    .from("JoinRequests")
    .select("id, school_id, user_id, status")
    .eq("school_id", schoolId)
    .eq("status", "pending")
    .in("id", requestIds);

  if (requestError) {
    console.error("Join request load failed", {
      code: requestError.code,
      message: requestError.message,
      details: requestError.details,
      hint: requestError.hint,
    });

    return jsonResponse(
      publicDatabaseError("Could not load join requests. Refresh the page and try again."),
      400,
    );
  }

  const rows = (requestRows ?? []) as JoinRequestRow[];
  if (rows.length !== requestIds.length) {
    return jsonResponse(
      { error: "One or more join requests are no longer pending." },
      409,
    );
  }

  const rowById = new Map(rows.map((row) => [row.id, row]));
  const approvedRows = decisions
    .filter((decision) => decision.decision === "approved")
    .map((decision) => rowById.get(decision.requestId))
    .filter((row): row is JoinRequestRow => Boolean(row));

  if (approvedRows.length > 0) {
    const approvedUserIds = approvedRows.map((row) => row.user_id);
    const { data: existingMembers, error: existingError } = await adminClient
      .from("SchoolMembers")
      .select("user_id")
      .eq("school_id", schoolId)
      .in("user_id", approvedUserIds);

    if (existingError) {
      console.error("Existing member lookup failed", {
        code: existingError.code,
        message: existingError.message,
        details: existingError.details,
        hint: existingError.hint,
      });

      return jsonResponse(
        publicDatabaseError("Could not check existing members. Try again in a moment."),
        400,
      );
    }

    const existingUserIds = new Set(
      ((existingMembers ?? []) as SchoolMemberRow[]).map(
        (member) => member.user_id,
      ),
    );
    const memberRows = approvedRows
      .filter((row) => !existingUserIds.has(row.user_id))
      .map((row) => ({
        school_id: schoolId,
        user_id: row.user_id,
        role: "student",
      }));

    if (memberRows.length > 0) {
      const { error: memberError } = await adminClient
        .from("SchoolMembers")
        .insert(memberRows);

      if (memberError) {
        console.error("School member insert failed", {
          code: memberError.code,
          message: memberError.message,
          details: memberError.details,
          hint: memberError.hint,
        });

        return jsonResponse(
          publicDatabaseError("Could not add approved members. Try again in a moment."),
          400,
        );
      }
    }
  }

  const { error: deleteError } = await adminClient
    .from("JoinRequests")
    .delete()
    .in("id", requestIds);

  if (deleteError) {
    console.error("Join request delete failed", {
      code: deleteError.code,
      message: deleteError.message,
      details: deleteError.details,
      hint: deleteError.hint,
    });

    return jsonResponse(
      publicDatabaseError("Could not clear reviewed requests. Try again in a moment."),
      400,
    );
  }

  return jsonResponse({
    approved: approvedRows.length,
    rejected: decisions.filter((decision) => decision.decision === "rejected")
      .length,
  });
});
