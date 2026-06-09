import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

function isMissingRefreshTokenError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const authError = error as { code?: unknown; message?: unknown; status?: unknown };
  const message = typeof authError.message === "string" ? authError.message : "";

  return (
    authError.code === "refresh_token_not_found" ||
    message.includes("Invalid Refresh Token") ||
    message.includes("Refresh Token Not Found")
  );
}

function isSupabaseAuthCookie(name: string) {
  return (
    name.startsWith("sb-") &&
    (name.includes("-auth-token") || name.includes("-code-verifier"))
  );
}

function clearSupabaseAuthCookies(request: NextRequest) {
  const authCookies = request.cookies
    .getAll()
    .filter((cookie) => isSupabaseAuthCookie(cookie.name));

  authCookies.forEach((cookie) => {
    request.cookies.delete(cookie.name);
  });

  const response = NextResponse.next({ request });

  authCookies.forEach((cookie) => {
    response.cookies.delete(cookie.name);
  });

  return response;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { supabaseUrl, supabaseKey } = getSupabaseEnv();

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  try {
    await supabase.auth.getClaims();
  } catch (error) {
    if (isMissingRefreshTokenError(error)) {
      return clearSupabaseAuthCookies(request);
    }

    throw error;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
