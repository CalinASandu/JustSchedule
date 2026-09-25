export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export type JsonBody = Record<string, unknown>;

export function jsonResponse(body: JsonBody, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

/** Reads `body[key]` as a trimmed string, or "" when it is missing or not a string. */
export function readString(body: JsonBody, key: string) {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

export function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

type PostHandler = (body: JsonBody, authorization: string) => Promise<Response>;

/**
 * Serves a JSON POST endpoint: answers CORS preflight, rejects other methods,
 * requires an Authorization header, and parses the body before calling
 * `handler`. Unexpected throws become a CORS-safe 500 instead of a bare crash.
 */
export function servePost(handler: PostHandler) {
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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body." }, 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse({ error: "Invalid JSON body." }, 400);
    }

    try {
      return await handler(body as JsonBody, authorization);
    } catch (error) {
      console.error("Unhandled edge function error", error);
      return jsonResponse({ error: "Something went wrong. Try again in a moment." }, 500);
    }
  });
}
