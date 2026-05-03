"use server";

import { revalidatePath } from "next/cache";
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
