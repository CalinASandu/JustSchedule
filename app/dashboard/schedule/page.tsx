import ScheduleClient from "./ScheduleClient";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type SchoolMemberRow = {
  id: string;
  role: string | null;
  school_id: string;
};

type SchoolRow = {
  id: string;
  name: string;
  created_by: string | null;
};

function getSchoolId(value: string | string[] | undefined) {
  const schoolId = Array.isArray(value) ? value[0] : value;
  return schoolId?.trim() || null;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string | string[]; panel?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  const schoolId = getSchoolId(resolvedSearchParams.schoolId);

  if (!schoolId) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [{ data: profile }, { data: membership }, { data: school }] = await Promise.all([
    supabase.from("Profiles").select("name").eq("id", user.id).maybeSingle(),
    supabase
      .from("SchoolMembers")
      .select("id, role, school_id")
      .eq("user_id", user.id)
      .eq("school_id", schoolId)
      .maybeSingle(),
    supabase.from("Schools").select("id, name, created_by").eq("id", schoolId).maybeSingle(),
  ]);

  const membershipRow = membership as SchoolMemberRow | null;
  const schoolRow = school as SchoolRow | null;

  if (!schoolRow) {
    redirect("/dashboard");
  }

  if (!membershipRow) {
    if (schoolRow.created_by === user.id) {
      redirect(`/dashboard/schools/${schoolId}`);
    }

    redirect("/dashboard");
  }

  if (membershipRow.role === "admin" || membershipRow.role === "professor") {
    redirect(`/dashboard/schools/${schoolId}`);
  }

  const displayName =
    profile?.name ||
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : user.email?.split("@")[0]) ||
    "Student";

  return (
    <ScheduleClient
      schoolId={schoolRow.id}
      schoolName={schoolRow.name}
      membershipId={membershipRow.id}
      studentName={displayName}
      userEmail={user.email ?? "Signed in with Google"}
    />
  );
}
