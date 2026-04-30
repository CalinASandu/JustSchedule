import ScheduleClient from "./ScheduleClient";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const displayName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : user.email?.split("@")[0] ?? "Student";

  return (
    <ScheduleClient
      studentName={displayName}
      userEmail={user.email ?? "Signed in with Google"}
    />
  );
}
