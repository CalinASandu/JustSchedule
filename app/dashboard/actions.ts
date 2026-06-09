"use server";

import { revalidatePath } from "next/cache";
import { getCompletedProfileName } from "@/lib/profile-name";
import { createClient } from "@/lib/supabase/server";
import { getUserFacingErrorMessage } from "@/lib/user-facing-errors";

export type RegisterSchoolState = {
  error: string | null;
  success: boolean;
};

export async function registerSchool(
  _state: RegisterSchoolState,
  formData: FormData,
): Promise<RegisterSchoolState> {
  const name = String(formData.get("schoolName") ?? "").trim();

  if (name.length < 2) {
    return { error: "Enter a school name.", success: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to sign in again.", success: false };
  }

  const { data: profile } = await supabase
    .from("Profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  if (!getCompletedProfileName(profile)) {
    return { error: "Add your name before creating a school.", success: false };
  }

  const { error: schoolError } = await supabase
    .from("Schools")
    .insert({ name: name, created_by: user.id });

  if (schoolError) {
    console.error("School registration failed", {
      code: schoolError?.code,
      message: schoolError?.message,
      details: schoolError?.details,
      hint: schoolError?.hint,
    });

    return {
      error: getUserFacingErrorMessage("registerSchool", schoolError),
      success: false,
    };
  }

  revalidatePath("/dashboard");

  return { error: null, success: true };
}

export type DirectJoinState = {
  error: string | null;
  success: boolean;
};

export async function requestDirectJoin(
  _state: DirectJoinState,
  formData: FormData,
): Promise<DirectJoinState> {
  const schoolId = String(formData.get("schoolId") ?? "").trim();

  if (!schoolId) {
    return { error: "Invalid school.", success: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to sign in again.", success: false };
  }

  const { data: profile } = await supabase
    .from("Profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  if (!getCompletedProfileName(profile)) {
    return { error: "Add your name before requesting to join.", success: false };
  }

  const { error } = await supabase.from("JoinRequests").insert({
    school_id: schoolId,
    user_id: user.id,
    status: "pending",
    invite_id: null,
  });

  if (error) {
    console.error("Direct join request failed", {
      code: error?.code,
      message: error?.message,
    });
    if (error.code === "23505") {
      return { error: "You already have a pending request for this school.", success: false };
    }
    return {
      error: getUserFacingErrorMessage("requestDirectJoin", error),
      success: false,
    };
  }

  revalidatePath("/dashboard");
  return { error: null, success: true };
}
