import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, CalendarDays, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import DashboardSignOutButton from "@/components/dashboard/DashboardSignOutButton";
import SchoolManagementTabs from "@/components/dashboard/SchoolManagementTabs";
import { createClient } from "@/lib/supabase/server";

type SchoolMemberRow = {
  id: string;
  user_id: string;
  role: string | null;
  joined_at: string;
  profile_name: string | null;
  email: string | null;
};

type ProfileRow = {
  id: string;
  name: string | null;
};

type InviteRow = {
  id: string;
  token: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
};

type JoinRequestRow = {
  id: string;
  user_id: string;
  school_id: string;
  requested_at: string;
  profile_name: string | null;
  email: string | null;
};

type SchoolRole = "admin" | "professor" | "student";

type SchoolMember = {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  role: SchoolRole;
  joinedAt: string;
  isCurrentUser: boolean;
};

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "JS"
  );
}

function formatMemberName(member: SchoolMemberRow, currentUserId: string) {
  if (member.profile_name) {
    return member.profile_name;
  }

  return member.user_id === currentUserId ? "You" : "Unnamed member";
}

function normalizeRole(role: string | null): SchoolRole {
  if (role === "admin" || role === "professor") {
    return role;
  }

  return "student";
}

export default async function SchoolDashboardPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [{ data: membership }, { data: school }, { data: currentProfile }] = await Promise.all([
    supabase
      .from("SchoolMembers")
      .select("role")
      .eq("user_id", user.id)
      .eq("school_id", schoolId)
      .maybeSingle(),
    supabase.from("Schools").select("id, name, created_at, created_by").eq("id", schoolId).maybeSingle(),
    supabase.from("Profiles").select("id, name").eq("id", user.id).maybeSingle(),
  ]);

  if (!school) {
    redirect("/dashboard");
  }

  const isAdmin = membership?.role === "admin" || school.created_by === user.id;
  const isProfessor = membership?.role === "professor";

  if (!isAdmin && !isProfessor) {
    redirect(`/dashboard/schedule?schoolId=${schoolId}`);
  }

  const [
    { data: memberRows, error: membersError },
    { data: inviteRows, error: invitesError },
    { data: joinRequestRows, error: joinRequestsError },
  ] =
    await Promise.all([
      supabase
        .rpc("get_school_members_with_profiles", { target_school_id: schoolId }),
      supabase
        .from("SchoolInvites")
        .select("id, token, created_at, expires_at, is_active")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false }),
      supabase.rpc("get_school_join_requests_with_profiles", { target_school_id: schoolId }),
    ]);

  const rows = (memberRows ?? []) as SchoolMemberRow[];
  const currentProfileRow = currentProfile as ProfileRow | null;
  const hasCurrentUserRow = rows.some((member) => member.user_id === user.id);
  const displayName =
    currentProfileRow?.name ||
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : user.email?.split("@")[0]) ||
    "Admin";
  const initials = getInitials(displayName);
  const rowMembers: SchoolMember[] = rows.map((member) => ({
    id: member.id,
    userId: member.user_id,
    name: formatMemberName(member, user.id),
    email: member.email,
    role: normalizeRole(member.role),
    joinedAt: member.joined_at,
    isCurrentUser: member.user_id === user.id,
  }));
  const members: SchoolMember[] = [
    ...rowMembers,
    ...(hasCurrentUserRow
      ? []
      : [
          {
            id: `created-${school.id}`,
            userId: user.id,
            name: displayName,
            email: user.email ?? null,
            role: "admin" as const,
            joinedAt: school.created_at,
            isCurrentUser: true,
          },
        ]),
  ];
  const headerStore = await headers();
  const origin =
    headerStore.get("x-forwarded-host") || headerStore.get("host")
      ? `${headerStore.get("x-forwarded-proto") ?? "http"}://${
          headerStore.get("x-forwarded-host") ?? headerStore.get("host")
        }`
      : "http://localhost:3000";
  const invites = ((inviteRows ?? []) as InviteRow[]).map((invite) => ({
    id: invite.id,
    token: invite.token,
    createdAt: invite.created_at,
    expiresAt: invite.expires_at,
    isActive: invite.is_active,
    url: `${origin}/invite/${invite.token}`,
  }));
  const joinRequests = ((joinRequestRows ?? []) as JoinRequestRow[]).map((request) => ({
    id: request.id,
    userId: request.user_id,
    schoolId: request.school_id,
    name: request.profile_name || "Unnamed user",
    email: request.email,
    requestedAt: request.requested_at,
  }));

  return (
    <div className="min-h-dvh" style={{ background: "#F7F8FA" }}>
      <header
        className="h-14 bg-white flex items-center px-6 sticky top-0 z-30"
        style={{ borderBottom: "1px solid #E4E8EF" }}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#2563EB" }}
          >
            <CalendarDays size={17} color="white" strokeWidth={2} />
          </div>
          <span className="text-[15px] font-semibold" style={{ color: "#111827" }}>
            JustSchedule
          </span>
        </Link>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <DashboardSignOutButton />
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-semibold select-none"
            style={{ background: "#2563EB" }}
            title={user.email ?? "Signed in with Google"}
          >
            {initials}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] px-6 py-8">
        <Link
          href="/dashboard"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium"
          style={{ color: "#6B7280" }}
        >
          <ArrowLeft size={15} strokeWidth={1.8} />
          Schools
        </Link>

        <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="anim-slide-up">
            <h1
              className="text-[1.35rem] font-bold"
              style={{ color: "#111827", letterSpacing: "-0.025em", lineHeight: 1.25 }}
            >
              {school.name}
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: "#6B7280" }}>
              Manage members and invite links for this school.
            </p>
          </div>

          <div className="panel anim-slide-up anim-d1 p-4">
            <div className="flex items-center gap-3">
              <ShieldCheck size={17} color="#2563EB" strokeWidth={1.9} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "#111827" }}>
                  {isAdmin ? "Admin access" : "Professor access"}
                </p>
                <p className="text-xs" style={{ color: "#9CA3AF" }}>
                  Signed in as {displayName}
                </p>
              </div>
            </div>
          </div>
        </div>

        <SchoolManagementTabs
          schoolId={schoolId}
          schoolName={school.name}
          members={members}
          invites={invites}
          joinRequests={joinRequests}
          canManageMembers={isAdmin}
          memberError={
            membersError
              ? `Could not load all member rows: ${membersError.message}`
              : null
          }
          inviteError={
            invitesError
              ? `Could not load invite rows: ${invitesError.message}`
              : null
          }
          joinRequestError={
            joinRequestsError
              ? `Could not load join requests: ${joinRequestsError.message}`
              : null
          }
        />
      </main>
    </div>
  );
}
