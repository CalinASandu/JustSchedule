import { getCompletedProfileName, getProfileNameSetupPath } from "@/lib/profile-name";
import { createClient } from "@/lib/supabase/server";
import { sanitizeRelativePath } from "@/lib/urls";
import { NextResponse, type NextRequest } from "next/server";

function decodeCookieValue(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const code = requestUrl.searchParams.get("code");
  const cookieNext = decodeCookieValue(request.cookies.get("oauth_next")?.value);
  const rawNext = requestUrl.searchParams.get("next") ?? cookieNext ?? "/dashboard";
  const next = sanitizeRelativePath(rawNext);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("Profiles")
          .select("name")
          .eq("id", user.id)
          .single();

        if (!getCompletedProfileName(profile)) {
          const response = NextResponse.redirect(
            new URL(getProfileNameSetupPath(next), requestUrl.origin),
          );
          response.cookies.delete("oauth_next");
          return response;
        }
      }

      const response = NextResponse.redirect(new URL(next, requestUrl.origin));
      response.cookies.delete("oauth_next");
      return response;
    }
  }

  const response = NextResponse.redirect(new URL("/?auth_error=oauth", requestUrl.origin));
  response.cookies.delete("oauth_next");
  return response;
}
