import { jsonResponse, readString, servePost } from "../_shared/http.ts";
import {
  authenticate,
  createAdminClient,
  type DatabaseError,
  logDatabaseError,
} from "../_shared/supabase.ts";

type Decision = "approved" | "rejected";

type ParsedDecision = {
  requestId: string;
  decision: Decision;
};

type JoinRequestRow = {
  id: string;
  user_id: string;
};

function reviewFailed(label: string, error: DatabaseError, message: string) {
  logDatabaseError(label, error);
  return jsonResponse({ code: "review_failed", error: message }, 400);
}

function parseDecision(item: unknown): ParsedDecision | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const requestId = readString(item as Record<string, unknown>, "requestId");
  const decision = (item as Record<string, unknown>).decision;

  if (!requestId || (decision !== "approved" && decision !== "rejected")) {
    return null;
  }

  return { requestId, decision };
}

/** Returns one decision per request id (the last one wins), or null if any entry is invalid. */
function parseDecisions(value: unknown): ParsedDecision[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const unique = new Map<string, ParsedDecision>();
  for (const item of value) {
    const parsed = parseDecision(item);
    if (!parsed) return null;
    unique.set(parsed.requestId, parsed);
  }

  return Array.from(unique.values());
}

servePost(async (body, authorization) => {
  const schoolId = readString(body, "schoolId");
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

  const auth = await authenticate(authorization);
  if (auth instanceof Response) return auth;
  const { supabase, user } = auth;

  const [{ data: membership }, { data: school }] = await Promise.all([
    supabase
      .from("SchoolMembers")
      .select("role")
      .eq("school_id", schoolId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("Schools")
      .select("created_by")
      .eq("id", schoolId)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  const canReview = Boolean(school) &&
    (membership?.role === "admin" ||
      membership?.role === "professor" ||
      school?.created_by === user.id);
  if (!canReview) {
    return jsonResponse(
      { error: "Only school admins and professors can review join requests." },
      403,
    );
  }

  // The caller is a verified admin or professor from here on, so privileged writes are allowed.
  const adminClient = createAdminClient();
  if (adminClient instanceof Response) return adminClient;

  const requestIds = decisions.map((decision) => decision.requestId);
  const { data: requestRows, error: requestError } = await adminClient
    .from("JoinRequests")
    .select("id, user_id")
    .eq("school_id", schoolId)
    .eq("status", "pending")
    .in("id", requestIds);

  if (requestError) {
    return reviewFailed(
      "Join request load failed",
      requestError,
      "Could not load join requests. Refresh the page and try again.",
    );
  }

  const rows = (requestRows ?? []) as JoinRequestRow[];
  if (rows.length !== requestIds.length) {
    return jsonResponse(
      { error: "One or more join requests are no longer pending." },
      409,
    );
  }

  const userIdByRequestId = new Map(rows.map((row) => [row.id, row.user_id]));
  const approvedUserIds = decisions
    .filter((decision) => decision.decision === "approved")
    .map((decision) => userIdByRequestId.get(decision.requestId)!);

  if (approvedUserIds.length > 0) {
    // Users who are already members are skipped via the (user_id, school_id) unique constraint.
    const { error: memberError } = await adminClient
      .from("SchoolMembers")
      .upsert(
        approvedUserIds.map((userId) => ({
          school_id: schoolId,
          user_id: userId,
          role: "student",
        })),
        { onConflict: "user_id,school_id", ignoreDuplicates: true },
      );

    if (memberError) {
      return reviewFailed(
        "School member insert failed",
        memberError,
        "Could not add approved members. Try again in a moment.",
      );
    }
  }

  const { error: deleteError } = await adminClient
    .from("JoinRequests")
    .delete()
    .in("id", requestIds);

  if (deleteError) {
    return reviewFailed(
      "Join request delete failed",
      deleteError,
      "Could not clear reviewed requests. Try again in a moment.",
    );
  }

  return jsonResponse({
    approved: approvedUserIds.length,
    rejected: decisions.length - approvedUserIds.length,
  });
});
