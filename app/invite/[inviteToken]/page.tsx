import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Clock, GraduationCap } from "lucide-react";
import JoinRequestForm from "@/components/dashboard/JoinRequestForm";
import { getCompletedProfileName, getProfileNameSetupPath } from "@/lib/profile-name";
import { createClient } from "@/lib/supabase/server";

type InviteRow = {
  id: string;
  school_id: string;
  expires_at: string;
  is_active: boolean;
};

type SchoolRow = {
  id: string;
  name: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ inviteToken: string }>;
}) {
  const { inviteToken } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/?next=${encodeURIComponent(`/invite/${inviteToken}`)}`);
  }

  const { data: profile } = await supabase
    .from("Profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  if (!getCompletedProfileName(profile)) {
    redirect(getProfileNameSetupPath(`/invite/${inviteToken}`));
  }

  const { data: invite } = await supabase
    .from("SchoolInvites")
    .select("id, school_id, expires_at, is_active")
    .eq("token", inviteToken)
    .eq("is_active", true)
    .filter("expires_at", "gte", "now()")
    .maybeSingle();
  const inviteRow = invite as InviteRow | null;
  const { data: school } = inviteRow
    ? await supabase
        .from("Schools")
        .select("id, name")
        .eq("id", inviteRow.school_id)
        .is("deleted_at", null)
        .maybeSingle()
    : { data: null };
  const schoolRow = school as SchoolRow | null;
  const isAvailable = Boolean(inviteRow?.is_active && schoolRow);

  return (
    <div
      className="min-h-dvh"
      style={{
        background: "#F7F8FA",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "linear-gradient(#e4e8ef 1px, transparent 1px), linear-gradient(90deg, #e4e8ef 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: 0.35,
          pointerEvents: "none",
        }}
      />

      <main className="relative w-full max-w-[440px] anim-slide-up">
        <Link
          href="/dashboard"
          className="mb-6 flex items-center justify-center gap-2"
          style={{ color: "#111827" }}
        >
          <div
            className="flex h-[30px] w-[30px] items-center justify-center rounded-lg"
            style={{ background: "#2563EB" }}
          >
            <CalendarDays size={16} color="white" strokeWidth={2} />
          </div>
          <span className="text-[0.95rem] font-semibold">JustSchedule</span>
        </Link>

        <section className="panel anim-slide-up anim-d1 p-8">
          <div className="mb-7">
            <div
              className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: "#EFF6FF" }}
            >
              <GraduationCap size={21} color="#2563EB" strokeWidth={1.8} />
            </div>
            <h1
              className="text-[1.35rem] font-bold"
              style={{ color: "#111827", letterSpacing: "-0.025em", lineHeight: 1.25 }}
            >
              {schoolRow ? `Join ${schoolRow.name}` : "Join school"}
            </h1>
            <p className="mt-2 text-sm" style={{ color: "#6B7280", lineHeight: 1.5 }}>
              {isAvailable
                ? "Request access with this invite link. An admin can approve you from the school management panel."
                : "This invite link is unavailable or has expired."}
            </p>
          </div>

          {inviteRow && (
            <div
              className="mb-5 flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm"
              style={{ background: "#F8FAFC", border: "1px solid #E4E8EF", color: "#6B7280" }}
            >
              <Clock size={15} strokeWidth={1.8} />
              Expires {formatDate(inviteRow.expires_at)}
            </div>
          )}

          {isAvailable ? (
            <JoinRequestForm inviteToken={inviteToken} />
          ) : (
            <Link
              href="/dashboard"
              className="inline-flex h-[2.625rem] w-full items-center justify-center rounded-[10px] text-[0.9375rem] font-semibold text-white"
              style={{
                background: "#2563EB",
                boxShadow: "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
              }}
            >
              Back to dashboard
            </Link>
          )}
        </section>
      </main>
    </div>
  );
}
