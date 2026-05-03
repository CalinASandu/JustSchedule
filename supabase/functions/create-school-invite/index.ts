import { createClient } from "npm:@supabase/supabase-js@2.105.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type InviteRequest = {
  schoolId?: unknown;
  expiresAt?: unknown;
  siteUrl?: unknown;
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

function createInviteToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function publicInviteError(error: { code?: string; message?: string }) {
  const message = (error.message ?? "").toLowerCase();

  if (error.code === "42501" || message.includes("row-level security")) {
    return {
      code: "admin_required",
      error: "Only school admins can create invite links.",
    };
  }

  if (error.code === "23503" || message.includes("foreign key")) {
    return {
      code: "school_not_found",
      error: "This school could not be found. Refresh the page and try again.",
    };
  }

  return {
    code: "invite_create_failed",
    error: "Could not create an invite link. Try again in a moment.",
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

  let body: InviteRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const schoolId = typeof body.schoolId === "string" ? body.schoolId.trim() : "";
  const expiresAtInput = typeof body.expiresAt === "string" ? body.expiresAt : "";
  const siteUrlInput = typeof body.siteUrl === "string" ? body.siteUrl : "";
  const expiresAt = new Date(expiresAtInput);

  if (!schoolId) {
    return jsonResponse({ error: "Missing schoolId." }, 400);
  }

  if (!expiresAtInput || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    return jsonResponse({ error: "expiresAt must be a valid future timestamp." }, 400);
  }

  let siteUrl: URL;
  try {
    siteUrl = new URL(siteUrlInput);
  } catch {
    return jsonResponse({ error: "siteUrl must be a valid URL." }, 400);
  }

  if (!["http:", "https:"].includes(siteUrl.protocol)) {
    return jsonResponse({ error: "siteUrl must use http or https." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey =
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";

  if (!supabaseUrl || !supabaseKey) {
    return jsonResponse({ error: "Supabase environment is not configured." }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
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

  const token = createInviteToken();
  const { error } = await supabase.from("SchoolInvites").insert({
    school_id: schoolId,
    token,
    created_by: user.id,
    expires_at: expiresAt.toISOString(),
    is_active: true,
  });

  if (error) {
    console.error("School invite insert failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return jsonResponse(publicInviteError(error), error.code === "42501" ? 403 : 400);
  }

  return jsonResponse({ inviteLink: `${siteUrl.origin}/invite/${token}` });
});
