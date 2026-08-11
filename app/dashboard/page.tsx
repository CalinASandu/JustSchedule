import Link from "next/link";
import { CalendarDays, ChevronRight, GraduationCap, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import DashboardSignOutButton from "@/components/dashboard/DashboardSignOutButton";
import DirectJoinCard from "@/components/dashboard/DirectJoinCard";
import NotificationBell, {
  type NotificationBellItem,
} from "@/components/dashboard/NotificationBell";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { getCompletedProfileName, getProfileNameSetupPath } from "@/lib/profile-name";
import { createClient } from "@/lib/supabase/server";

type SchoolRole = "admin" | "professor" | "exam_supervisor" | "student";

type SchoolMembership = {
  id: string;
  role: SchoolRole;
  joined_at: string;
  school: {
    id: string;
    name: string;
    created_at: string;
    created_by: string | null;
  };
};

type SchoolMemberRow = {
  id: string;
  role: SchoolRole | string | null;
  joined_at: string;
  school_id: string | null;
};

type SchoolRow = SchoolMembership["school"];

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
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

function displayRole(role: SchoolRole): string {
  if (role === "exam_supervisor") return "Exam Supervisor";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function normalizeRole(role: string | null): SchoolRole {
  if (role === "admin" || role === "professor" || role === "exam_supervisor") {
    return role;
  }

  return "student";
}

function normalizeMemberships(rows: SchoolMemberRow[] | null, schools: SchoolRow[] | null): SchoolMembership[] {
  const schoolById = new Map((schools ?? []).map((school) => [school.id, school]));

  return (rows ?? []).flatMap((row) => {
    const school = row.school_id ? schoolById.get(row.school_id) : null;

    if (!school) {
      return [];
    }

    return {
      id: row.id,
      role: normalizeRole(row.role),
      joined_at: row.joined_at,
      school,
    };
  });
}

function mergeCreatedSchools(
  memberships: SchoolMembership[],
  createdSchools: SchoolRow[] | null,
): SchoolMembership[] {
  const seenSchoolIds = new Set(memberships.map((membership) => membership.school.id));
  const fallbackMemberships = (createdSchools ?? []).flatMap((school) => {
    if (seenSchoolIds.has(school.id)) {
      return [];
    }

    return {
      id: `created-${school.id}`,
      role: "admin" as const,
      joined_at: school.created_at,
      school,
    };
  });

  return [...memberships, ...fallbackMemberships];
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [
    { data: profile },
    membershipResult,
    createdSchoolsResult,
    allSchoolsResult,
    pendingRequestsResult,
    notificationResult,
  ] = await Promise.all([
    supabase.from("Profiles").select("name").eq("id", user.id).single(),
    supabase
      .from("SchoolMembers")
      .select("id, role, joined_at, school_id")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true }),
    supabase
      .from("Schools")
      .select("id, name, created_at, created_by")
      .eq("created_by", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("Schools")
      .select("id, name")
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("JoinRequests")
      .select("school_id")
      .eq("user_id", user.id)
      .eq("status", "pending"),
    supabase.rpc("get_user_notifications", {
      target_school_id: null,
    }),
  ]);

  const displayName = getCompletedProfileName(profile);

  if (!displayName) {
    redirect(getProfileNameSetupPath("/dashboard"));
  }

  const membershipRows = (membershipResult.data ?? []) as SchoolMemberRow[];
  const schoolIds = Array.from(
    new Set(membershipRows.map((membership) => membership.school_id).filter(Boolean)),
  ) as string[];
  const { data: schools } =
    schoolIds.length > 0
      ? await supabase
          .from("Schools")
          .select("id, name, created_at, created_by")
          .in("id", schoolIds)
          .is("deleted_at", null)
      : { data: [] };

  const initials = getInitials(displayName);
  const memberships = mergeCreatedSchools(
    normalizeMemberships(membershipRows, schools as SchoolRow[] | null),
    createdSchoolsResult.data as SchoolRow[] | null,
  );

  const memberSchoolIds = new Set(memberships.map((m) => m.school.id));
  const pendingSchoolIds = new Set(
    (pendingRequestsResult.data ?? []).map((r) => r.school_id as string),
  );
  const nonMemberSchools = (allSchoolsResult.data ?? []).filter(
    (s) => !memberSchoolIds.has(s.id),
  );
  const notifications: NotificationBellItem[] = (
    (notificationResult.data ?? []) as NotificationRow[]
  ).map((notification) => ({
    id: notification.id,
    title: notification.title,
    body: notification.body,
    href: notification.href,
    readAt: notification.read_at,
    createdAt: notification.created_at,
  }));

  return (
    <div className="min-h-dvh" style={{ background: "var(--surface-page)" }}>
      <header
        className="h-14 flex items-center px-6 sticky top-0 z-30"
        style={{
          background: "var(--surface-panel)",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--accent-color)" }}
          >
            <CalendarDays size={17} color="var(--text-on-accent)" strokeWidth={2} />
          </div>
          <span className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
            JustSchedule
          </span>
        </Link>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <NotificationBell notifications={notifications} />
          <ThemeToggle />
          <DashboardSignOutButton />
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-semibold select-none"
            style={{ background: "var(--accent-color)" }}
            title={user.email ?? "Signed in with Google"}
          >
            {initials}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-6 py-8">
        <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="anim-slide-up">
            <h1
              className="text-[1.35rem] font-bold"
              style={{
                color: "var(--text-primary)",
                letterSpacing: "-0.025em",
                lineHeight: 1.25,
              }}
            >
              Your schools
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              Choose a school to continue.
            </p>
          </div>

          <div className="panel anim-slide-up anim-d1 p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                style={{ background: "var(--accent-color)" }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {displayName}
                </p>
                <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
                  {user.email ?? "Signed in with Google"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {memberships.map((membership, index) => {
              const isAdmin = membership.role === "admin";
              const opensSchoolDashboard =
                isAdmin ||
                membership.role === "professor" ||
                membership.role === "exam_supervisor";
              const href = opensSchoolDashboard
                ? `/dashboard/schools/${membership.school.id}`
                : `/dashboard/schedule?schoolId=${membership.school.id}`;

              return (
                <article
                  key={membership.id}
                  className={`panel flex min-h-[178px] flex-col justify-between p-5 anim-slide-up ${
                    index === 0 ? "anim-d1" : index === 1 ? "anim-d2" : "anim-d3"
                  }`}
                >
                  <Link
                    href={href}
                    className="group block rounded-[10px] transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
                  >
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{ background: "var(--accent-subtle)" }}
                      >
                        <GraduationCap size={19} color="var(--accent-color)" strokeWidth={1.8} />
                      </div>
                      <ChevronRight
                        size={17}
                        color="var(--text-muted)"
                        strokeWidth={1.8}
                        className="transition-transform duration-150 group-hover:translate-x-0.5"
                      />
                    </div>

                    <h2 className="text-[0.9375rem] font-semibold" style={{ color: "var(--text-primary)" }}>
                      {membership.school.name}
                    </h2>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                      Joined {formatDate(membership.joined_at)}
                    </p>
                  </Link>

                  <div className="mt-6">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize"
                        style={
                          isAdmin
                            ? {
                                background: "var(--accent-muted)",
                                color: "var(--accent-strong)",
                              }
                            : {
                                background: "var(--surface-subtle)",
                                color: "var(--text-slate)",
                              }
                        }
                      >
                        {isAdmin && <ShieldCheck size={13} strokeWidth={1.8} />}
                        {displayRole(membership.role)}
                      </span>
                      <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                        {isAdmin
                          ? "Manage school"
                          : membership.role === "professor"
                            ? "View members"
                            : membership.role === "exam_supervisor"
                              ? "Track attendance"
                            : "Schedule exam"}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          {nonMemberSchools.map((school) => (
            <DirectJoinCard
              key={school.id}
              schoolId={school.id}
              schoolName={school.name}
              isPending={pendingSchoolIds.has(school.id)}
            />
          ))}
        </section>
      </main>
    </div>
  );
}
