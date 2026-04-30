import Link from "next/link";
import { Building2, CalendarDays, ShieldCheck, UsersRound } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SchoolMemberRow = {
  role: string | null;
};

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

  const [{ data: membership }, { data: school }] = await Promise.all([
    supabase
      .from("SchoolMembers")
      .select("role")
      .eq("user_id", user.id)
      .eq("school_id", schoolId)
      .single(),
    supabase.from("Schools").select("id, name, created_at").eq("id", schoolId).single(),
  ]);

  const row = membership as SchoolMemberRow | null;

  if (!school || !row) {
    redirect("/dashboard");
  }

  if (row?.role !== "admin") {
    redirect(`/dashboard/schedule?schoolId=${schoolId}`);
  }

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
      </header>

      <main className="mx-auto w-full max-w-[1120px] px-6 py-8">
        <div className="mb-6">
          <div className="anim-slide-up">
            <h1
              className="text-[1.35rem] font-bold"
              style={{ color: "#111827", letterSpacing: "-0.025em", lineHeight: 1.25 }}
            >
              {school.name}
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: "#6B7280" }}>
              School dashboard for scheduling and member administration.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="panel anim-slide-up anim-d1 p-6 lg:col-span-2">
            <div className="mb-5 flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: "#EFF6FF" }}
              >
                <Building2 size={16} color="#2563EB" strokeWidth={1.9} />
              </div>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: "#111827" }}>
                  School overview
                </h2>
                <p className="text-xs" style={{ color: "#9CA3AF" }}>
                  This is the admin destination for school cards.
                </p>
              </div>
            </div>
            <p className="max-w-2xl text-sm" style={{ color: "#6B7280", lineHeight: 1.6 }}>
              Member management and approvals will be added in a later step. For now, this page
              confirms admin-only routing and keeps the school dashboard ready for the next phase.
            </p>
          </section>

          <aside className="space-y-6">
            <div className="panel anim-slide-up anim-d2 p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <ShieldCheck size={16} color="#2563EB" strokeWidth={1.9} />
                <h2 className="text-sm font-semibold" style={{ color: "#111827" }}>
                  Your role
                </h2>
              </div>
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold capitalize"
                style={{ background: "#DBEAFE", color: "#1D4ED8" }}
              >
                {row.role}
              </span>
            </div>

            <div className="panel anim-slide-up anim-d3 p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <UsersRound size={16} color="#2563EB" strokeWidth={1.9} />
                <h2 className="text-sm font-semibold" style={{ color: "#111827" }}>
                  Members
                </h2>
              </div>
              <p className="text-sm" style={{ color: "#6B7280", lineHeight: 1.5 }}>
                Member tools are intentionally not implemented yet.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
