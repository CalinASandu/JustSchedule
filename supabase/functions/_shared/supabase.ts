import {
  createClient,
  type SupabaseClient,
  type User,
} from "npm:@supabase/supabase-js@2.105.1";
import { jsonResponse } from "./http.ts";

const clientAuthOptions = {
  persistSession: false,
  autoRefreshToken: false,
};

const missingEnvResponse = () =>
  jsonResponse({ error: "Supabase environment is not configured." }, 500);

export type DatabaseError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export type AuthenticatedContext = {
  supabase: SupabaseClient;
  user: User;
};

/**
 * Builds a Supabase client that acts as the caller (RLS applies) and verifies
 * their session. Returns a ready-to-send error Response on failure, so callers
 * can do: `if (auth instanceof Response) return auth;`
 */
export async function authenticate(
  authorization: string,
): Promise<AuthenticatedContext | Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKey =
    Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    "";

  if (!supabaseUrl || !publishableKey) {
    return missingEnvResponse();
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: clientAuthOptions,
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return jsonResponse({ error: "Invalid session." }, 401);
  }

  return { supabase, user };
}

/**
 * Service-role client that bypasses RLS. Only use it after the caller has been
 * authorized through `authenticate` and an explicit role check.
 */
export function createAdminClient(): SupabaseClient | Response {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return missingEnvResponse();
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: clientAuthOptions });
}

export function logDatabaseError(label: string, error: DatabaseError) {
  console.error(label, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}
