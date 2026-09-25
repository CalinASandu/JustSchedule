import { databaseErrorResponse, type ErrorRule } from "../_shared/errors.ts";
import { jsonResponse, readString, servePost } from "../_shared/http.ts";
import { authenticate } from "../_shared/supabase.ts";

const inviteErrorRules: ErrorRule[] = [
  {
    codes: ["42501"],
    messages: ["row-level security"],
    status: 403,
    code: "admin_required",
    error: "Only school admins can create invite links.",
  },
  {
    codes: ["23503"],
    messages: ["foreign key"],
    status: 400,
    code: "school_not_found",
    error: "This school could not be found. Refresh the page and try again.",
  },
];

function createInviteToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function parseSiteUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

servePost(async (body, authorization) => {
  const schoolId = readString(body, "schoolId");
  const expiresAt = new Date(readString(body, "expiresAt"));
  const siteUrl = parseSiteUrl(readString(body, "siteUrl"));

  if (!schoolId) {
    return jsonResponse({ error: "Missing schoolId." }, 400);
  }

  // An empty or malformed string yields an invalid Date, whose time is NaN.
  if (!(expiresAt.getTime() > Date.now())) {
    return jsonResponse({ error: "expiresAt must be a valid future timestamp." }, 400);
  }

  if (!siteUrl) {
    return jsonResponse({ error: "siteUrl must be a valid http or https URL." }, 400);
  }

  const auth = await authenticate(authorization);
  if (auth instanceof Response) return auth;

  // RLS on SchoolInvites only lets school admins insert.
  const token = createInviteToken();
  const { error } = await auth.supabase.from("SchoolInvites").insert({
    school_id: schoolId,
    token,
    created_by: auth.user.id,
    expires_at: expiresAt.toISOString(),
    is_active: true,
  });

  if (error) {
    return databaseErrorResponse("School invite insert failed", error, inviteErrorRules, {
      code: "invite_create_failed",
      error: "Could not create an invite link. Try again in a moment.",
    });
  }

  return jsonResponse({ inviteLink: `${siteUrl.origin}/invite/${token}` });
});
