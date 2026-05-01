import Link from "next/link";
import { Bell, CalendarDays, ChevronRight, GraduationCap, Plus, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import DashboardSignOutButton from "@/components/dashboard/DashboardSignOutButton";
import RegisterSchoolForm from "@/components/dashboard/RegisterSchoolForm";
import { createClient } from "@/lib/supabase/server";

type SchoolRole = "admin" | "student";

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

function normalizeRole(role: string | null): SchoolRole {
  return role === "admin" ? "admin" : "student";
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

  const [{ data: profile }, membershipResult, createdSchoolsResult] = await Promise.all([
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
      .order("created_at", { ascending: true }),
  ]);

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
      : { data: [] };

  const displayName =
    profile?.name ||
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : user.email?.split("@")[0]) ||
    "Student";
  const initials = getInitials(displayName);
  const memberships = mergeCreatedSchools(
    normalizeMemberships(membershipRows, schools as SchoolRow[] | null),
    createdSchoolsResult.data as SchoolRow[] | null,
  );

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
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-150 hover:bg-slate-100"
            aria-label="Notifications"
          >
            <Bell size={17} color="#6B7280" strokeWidth={1.8} />
          </button>
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

      <main className="mx-auto w-full max-w-[1180px] px-6 py-8">
        <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="anim-slide-up">
            <h1
              className="text-[1.35rem] font-bold"
              style={{
                color: "#111827",
                letterSpacing: "-0.025em",
                lineHeight: 1.25,
              }}
            >
              Your schools
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: "#6B7280" }}>
              Choose a school to continue.
            </p>
          </div>

          <div className="panel anim-slide-up anim-d1 p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                style={{ background: "#2563EB" }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" style={{ color: "#111827" }}>
                  {displayName}
                </p>
                <p className="truncate text-xs" style={{ color: "#9CA3AF" }}>
                  {user.email ?? "Signed in with Google"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {memberships.length === 0 ? (
          <section className="panel anim-slide-up anim-d2 p-6">
            <div className="mb-5 flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "#EFF6FF" }}
              >
                <GraduationCap size={19} color="#2563EB" strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: "#111827" }}>
                  No schools yet
                </h2>
                <p className="mt-1 max-w-xl text-sm" style={{ color: "#6B7280", lineHeight: 1.5 }}>
                  Register your first school. You will become its admin automatically.
                </p>
              </div>
            </div>
            <RegisterSchoolForm />
          </section>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {memberships.map((membership, index) => {
              const isAdmin = membership.role === "admin";
              const href = isAdmin
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
                    className="group block rounded-[10px] transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{ background: "#EFF6FF" }}
                      >
                        <GraduationCap size={19} color="#2563EB" strokeWidth={1.8} />
                      </div>
                      <ChevronRight
                        size={17}
                        color="#9CA3AF"
                        strokeWidth={1.8}
                        className="transition-transform duration-150 group-hover:translate-x-0.5"
                      />
                    </div>

                    <h2 className="text-[0.9375rem] font-semibold" style={{ color: "#111827" }}>
                      {membership.school.name}
                    </h2>
                    <p className="mt-1 text-xs" style={{ color: "#9CA3AF" }}>
                      Joined {formatDate(membership.joined_at)}
                    </p>
                  </Link>

                  <div className="mt-6">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize"
                        style={
                          isAdmin
                            ? { background: "#DBEAFE", color: "#1D4ED8" }
                            : { background: "#E2E8F0", color: "#64748B" }
                        }
                      >
                        {isAdmin && <ShieldCheck size={13} strokeWidth={1.8} />}
                        {membership.role}
                      </span>
                      <span className="text-xs font-medium" style={{ color: "#6B7280" }}>
                        {isAdmin ? "Manage school" : "Schedule exam"}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
            <div className="anim-slide-up anim-d3 min-h-[178px] rounded-[8px] border border-dashed border-[#C7D2FE] bg-white/60 p-5 transition-colors duration-150 hover:bg-white">
              <div className="mb-5 flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "#EFF6FF" }}
                >
                  <Plus size={19} color="#2563EB" strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[0.9375rem] font-semibold" style={{ color: "#111827" }}>
                    Create another school
                  </h2>
                  <p className="mt-1 text-sm" style={{ color: "#6B7280", lineHeight: 1.45 }}>
                    Register a new school and add it to this dashboard.
                  </p>
                </div>
              </div>
              <RegisterSchoolForm />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
