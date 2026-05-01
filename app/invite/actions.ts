"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type JoinSchoolState = {
  error: string | null;
  success: boolean;
};

export async function requestSchoolJoin(
  _state: JoinSchoolState,
  formData: FormData,
): Promise<JoinSchoolState> {
  const token = String(formData.get("inviteToken") ?? "").trim();

  if (!token) {
    return { error: "Missing invite token.", success: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in before requesting access.", success: false };
  }

  const { data: invite, error: inviteError } = await supabase
    .from("SchoolInvites")
    .select("id, school_id, is_active, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteError || !invite) {
    return { error: "This invite link is not available.", success: false };
  }

  if (!invite.is_active || new Date(invite.expires_at).getTime() < Date.now()) {
    return { error: "This invite link has expired.", success: false };
  }

  const { error } = await supabase.from("JoinRequests").insert({
    school_id: invite.school_id,
    invite_id: invite.id,
    user_id: user.id,
  });

  if (error) {
    console.error("Join request failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return {
      error:
        error.code === "23505"
          ? "You already requested access to this school."
          : error.message
            ? `Could not request access: ${error.message}`
            : "Could not request access.",
      success: false,
    };
  }

  revalidatePath(`/invite/${token}`);

  return { error: null, success: true };
}
