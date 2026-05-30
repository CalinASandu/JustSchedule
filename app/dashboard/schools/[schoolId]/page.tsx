import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, CalendarDays, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import DashboardSignOutButton from "@/components/dashboard/DashboardSignOutButton";
import SchoolManagementTabs from "@/components/dashboard/SchoolManagementTabs";
import { createClient } from "@/lib/supabase/server";
import { getUserFacingErrorMessage } from "@/lib/user-facing-errors";
import { getRequestOrigin } from "@/lib/urls";

type SchoolMemberRow = {
  id: string;
  user_id: string;
  role: string | null;
  joined_at: string;
  profile_name: string | null;
  email: string | null;
  can_self_book: boolean | null;
  self_booking_disabled_at: string | null;
  self_booking_disabled_by: string | null;
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

type ExamSlotRow = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
};

type SchoolSubjectRow = {
  id: string;
  name: string;
};

type ReservationRow = {
  id: string;
  user_id: string;
  slot_id: string;
  reservation_date: string;
  exam_name: string;
  exam_type: "midterm" | "final";
  status: string;
  created_at: string;
  created_by: string;
  created_by_role: SchoolRole;
  attendance_status: "present" | "absent" | null;
  attendance_marked_by: string | null;
  attendance_marked_at: string | null;
};

type AttendanceSessionRow = {
  id: string;
  school_id: string;
  slot_id: string;
  reservation_date: string;
  started_by: string;
  started_at: string;
  expires_at: string;
};

type SchoolRole = "admin" | "professor" | "exam_supervisor" | "student";

type SchoolMember = {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  role: SchoolRole;
  joinedAt: string;
  canSelfBook: boolean;
  selfBookingDisabledAt: string | null;
  selfBookingDisabledBy: string | null;
  isCurrentUser: boolean;
};

type ExamSlot = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
};

type Reservation = {
  id: string;
  userId: string;
  slotId: string;
  reservationDate: string;
  examName: string;
  examType: "midterm" | "final";
  status: string;
  createdAt: string;
  createdBy: string;
  createdByRole: SchoolRole;
  attendanceStatus: "present" | "absent";
  attendanceMarkedBy: string | null;
  attendanceMarkedAt: string | null;
};

type AttendanceSession = {
  id: string;
  schoolId: string;
  slotId: string;
  reservationDate: string;
  startedBy: string;
  startedAt: string;
  expiresAt: string;
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
  if (role === "admin" || role === "professor" || role === "exam_supervisor") {
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

  const [{ data: membership }, { data: school }, { data: currentProfile }] =
    await Promise.all([
      supabase
        .from("SchoolMembers")
        .select("role")
        .eq("user_id", user.id)
        .eq("school_id", schoolId)
        .maybeSingle(),
      supabase
        .from("Schools")
        .select("id, name, created_at, created_by")
        .eq("id", schoolId)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("Profiles")
        .select("id, name")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

  if (!school) {
    redirect("/dashboard");
  }

  const isAdmin = membership?.role === "admin" || school.created_by === user.id;
  const isProfessor = membership?.role === "professor";
  const isExamSupervisor = membership?.role === "exam_supervisor";

  if (!isAdmin && !isProfessor && !isExamSupervisor) {
    redirect(`/dashboard/schedule?schoolId=${schoolId}`);
  }

  const [
    { data: memberRows, error: membersError },
    { data: inviteRows, error: invitesError },
    { data: joinRequestRows, error: joinRequestsError },
    { data: examSlotRows, error: examSlotsError },
    { data: reservationRows, error: reservationsError },
    { data: attendanceSessionRows },
    { data: schoolSubjectRows },
  ] = await Promise.all([
    supabase.rpc("get_school_members_with_profiles", {
      target_school_id: schoolId,
    }),
    supabase
      .from("SchoolInvites")
      .select("id, token, created_at, expires_at, is_active")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false }),
    supabase.rpc("get_school_join_requests_with_profiles", {
      target_school_id: schoolId,
    }),
    supabase
      .from("ExamSlots")
      .select("id, name, starts_at, ends_at, capacity")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .order("starts_at", { ascending: true }),
    supabase
      .from("Reservations")
      .select(
        "id, user_id, slot_id, reservation_date, exam_name, exam_type, status, created_at, created_by, created_by_role, attendance_status, attendance_marked_by, attendance_marked_at",
      )
      .eq("school_id", schoolId)
      .eq("status", "confirmed")
      .order("reservation_date", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("AttendanceSessions")
      .select(
        "id, school_id, slot_id, reservation_date, started_by, started_at, expires_at",
      )
      .eq("school_id", schoolId)
      .gt("expires_at", new Date().toISOString()),
    supabase
      .from("SchoolSubjects")
      .select("id, name")
      .eq("school_id", schoolId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
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
    canSelfBook: member.can_self_book ?? true,
    selfBookingDisabledAt: member.self_booking_disabled_at,
    selfBookingDisabledBy: member.self_booking_disabled_by,
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
            canSelfBook: true,
            selfBookingDisabledAt: null,
            selfBookingDisabledBy: null,
            isCurrentUser: true,
          },
        ]),
  ];
  const headerStore = await headers();
  const origin = getRequestOrigin(headerStore);
  const now = new Date();
  const rows_invites = (inviteRows ?? []) as InviteRow[];
  const expiredIds = rows_invites
    .filter((i) => i.is_active && new Date(i.expires_at) < now)
    .map((i) => i.id);
  if (expiredIds.length > 0) {
    await supabase
      .from("SchoolInvites")
      .update({ is_active: false })
      .in("id", expiredIds);
  }
  const invites = rows_invites.map((invite) => ({
    id: invite.id,
    token: invite.token,
    createdAt: invite.created_at,
    expiresAt: invite.expires_at,
    isActive: invite.is_active && new Date(invite.expires_at) >= now,
    url: `${origin}/invite/${invite.token}`,
  }));
  const joinRequests = ((joinRequestRows ?? []) as JoinRequestRow[]).map(
    (request) => ({
      id: request.id,
      userId: request.user_id,
      schoolId: request.school_id,
      name: request.profile_name || "Unnamed user",
      email: request.email,
      requestedAt: request.requested_at,
    }),
  );
  const examSlots: ExamSlot[] = ((examSlotRows ?? []) as ExamSlotRow[]).map(
    (slot) => ({
      id: slot.id,
      name: slot.name,
      startsAt: slot.starts_at,
      endsAt: slot.ends_at,
      capacity: slot.capacity,
    }),
  );
  const reservations: Reservation[] = (
    (reservationRows ?? []) as ReservationRow[]
  ).map((reservation) => ({
    id: reservation.id,
    userId: reservation.user_id,
    slotId: reservation.slot_id,
    reservationDate: reservation.reservation_date,
    examName: reservation.exam_name,
    examType: reservation.exam_type,
    status: reservation.status,
    createdAt: reservation.created_at,
    createdBy: reservation.created_by,
    createdByRole: reservation.created_by_role,
    attendanceStatus: reservation.attendance_status ?? "present",
    attendanceMarkedBy: reservation.attendance_marked_by,
    attendanceMarkedAt: reservation.attendance_marked_at,
  }));
  const attendanceSessions: AttendanceSession[] = (
    (attendanceSessionRows ?? []) as AttendanceSessionRow[]
  ).map((session) => ({
    id: session.id,
    schoolId: session.school_id,
    slotId: session.slot_id,
    reservationDate: session.reservation_date,
    startedBy: session.started_by,
    startedAt: session.started_at,
    expiresAt: session.expires_at,
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
          <span
            className="text-[15px] font-semibold"
            style={{ color: "#111827" }}
          >
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
              style={{
                color: "#111827",
                letterSpacing: "-0.025em",
                lineHeight: 1.25,
              }}
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
                <p
                  className="text-sm font-semibold"
                  style={{ color: "#111827" }}
                >
                  {isAdmin
                    ? "Admin access"
                    : isProfessor
                      ? "Professor access"
                      : "Exam supervisor access"}
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
          examSlots={examSlots}
          reservations={reservations}
          attendanceSessions={attendanceSessions}
          schoolSubjects={((schoolSubjectRows ?? []) as SchoolSubjectRow[]).map(
            (s) => ({ id: s.id, name: s.name }),
          )}
          currentUserRole={
            isAdmin ? "admin" : isProfessor ? "professor" : "exam_supervisor"
          }
          canManageMembers={isAdmin}
          canManageSelfBooking={isAdmin || isProfessor}
          canViewAttendance={isAdmin || isProfessor || isExamSupervisor}
          canMarkAttendance={isExamSupervisor}
          memberError={
            membersError
              ? getUserFacingErrorMessage("loadMembers", membersError)
              : null
          }
          inviteError={
            invitesError
              ? getUserFacingErrorMessage("loadInvites", invitesError)
              : null
          }
          joinRequestError={
            joinRequestsError
              ? getUserFacingErrorMessage("loadJoinRequests", joinRequestsError)
              : null
          }
          reservationError={
            examSlotsError || reservationsError
              ? getUserFacingErrorMessage(
                  "loadReservations",
                  examSlotsError ?? reservationsError,
                )
              : null
          }
        />
      </main>
    </div>
  );
}
