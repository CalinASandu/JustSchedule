import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, CalendarDays, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import DashboardSignOutButton from "@/components/dashboard/DashboardSignOutButton";
import NotificationBell, {
  type NotificationBellItem,
} from "@/components/dashboard/NotificationBell";
import SchoolManagementTabs from "@/components/dashboard/SchoolManagementTabs";
import { getCompletedProfileName, getProfileNameSetupPath } from "@/lib/profile-name";
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
  is_active: boolean;
  slot_kind: "primary" | "overflow" | null;
  primary_slot_id: string | null;
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
  isActive: boolean;
  slotKind: "primary" | "overflow";
  primarySlotId: string | null;
};

type ScheduleRequestRow = {
  id: string;
  school_id: string;
  student_user_id: string;
  student_name: string | null;
  student_email: string | null;
  requested_teacher_user_id: string;
  teacher_name: string | null;
  requested_slot_id: string;
  requested_slot_group_id: string;
  slot_name: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  primary_booked: number;
  overflow_slot_id: string | null;
  overflow_capacity: number | null;
  overflow_booked: number | null;
  reservation_date: string;
  exam_name: string;
  exam_type: "midterm" | "final";
  status:
    | "pending"
    | "approved"
    | "declined"
    | "expired"
    | "failed_capacity"
    | "failed_conflict"
    | "cancelled";
  reviewer_message: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reservation_id: string | null;
  expires_at: string;
  created_at: string;
};

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
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
    { data: scheduleRequestRows, error: scheduleRequestsError },
    { data: notificationRows },
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
      .select("id, name, starts_at, ends_at, capacity, is_active, slot_kind, primary_slot_id")
      .eq("school_id", schoolId)
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
    isAdmin || isProfessor
      ? supabase.rpc("get_school_schedule_requests", {
          target_school_id: schoolId,
        })
      : Promise.resolve({ data: [], error: null }),
    isProfessor
      ? supabase.rpc("get_user_notifications", {
          target_school_id: schoolId,
        })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const rows = (memberRows ?? []) as SchoolMemberRow[];
  const currentProfileRow = currentProfile as ProfileRow | null;
  const displayName = getCompletedProfileName(currentProfileRow);

  if (!displayName) {
    redirect(getProfileNameSetupPath(`/dashboard/schools/${schoolId}`));
  }

  const hasCurrentUserRow = rows.some((member) => member.user_id === user.id);
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
      isActive: slot.is_active,
      slotKind: slot.slot_kind ?? "primary",
      primarySlotId: slot.primary_slot_id,
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
  const scheduleRequests = ((scheduleRequestRows ?? []) as ScheduleRequestRow[]).map(
    (request) => ({
      id: request.id,
      schoolId: request.school_id,
      studentUserId: request.student_user_id,
      studentName: request.student_name || "Unnamed student",
      studentEmail: request.student_email,
      teacherUserId: request.requested_teacher_user_id,
      teacherName: request.teacher_name || "Professor",
      slotId: request.requested_slot_id,
      slotGroupId: request.requested_slot_group_id,
      slotName: request.slot_name,
      startsAt: request.starts_at,
      endsAt: request.ends_at,
      capacity: request.capacity,
      primaryBooked: request.primary_booked,
      overflowSlotId: request.overflow_slot_id,
      overflowCapacity: request.overflow_capacity,
      overflowBooked: request.overflow_booked ?? 0,
      reservationDate: request.reservation_date,
      examName: request.exam_name,
      examType: request.exam_type,
      status: request.status,
      reviewerMessage: request.reviewer_message,
      reviewedBy: request.reviewed_by,
      reviewedAt: request.reviewed_at,
      reservationId: request.reservation_id,
      expiresAt: request.expires_at,
      createdAt: request.created_at,
    }),
  );
  const notifications: NotificationBellItem[] = ((notificationRows ?? []) as NotificationRow[]).map(
    (notification) => ({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      href: notification.href,
      readAt: notification.read_at,
      createdAt: notification.created_at,
    }),
  );

  return (
    <div className="min-h-dvh bg-[#F7F8FA]">
      <header
        className="sticky top-0 z-30 flex h-14 items-center bg-white px-4 sm:px-6"
        style={{ borderBottom: "1px solid #E4E8EF" }}
      >
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
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
          {isProfessor && <NotificationBell notifications={notifications} />}
          <DashboardSignOutButton />
          <div
            className="hidden h-8 w-8 select-none items-center justify-center rounded-full text-[11px] font-semibold text-white sm:flex"
            style={{ background: "#2563EB" }}
            title={user.email ?? "Signed in with Google"}
          >
            {initials}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href="/dashboard"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium"
          style={{ color: "#6B7280" }}
        >
          <ArrowLeft size={15} strokeWidth={1.8} />
          Schools
        </Link>

        <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="anim-slide-up min-w-0">
            <h1
              className="break-words text-[1.35rem] font-bold"
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
              <div className="min-w-0">
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
                <p className="truncate text-xs" style={{ color: "#9CA3AF" }}>
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
          scheduleRequests={scheduleRequests}
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
          scheduleRequestError={
            scheduleRequestsError
              ? getUserFacingErrorMessage("loadReservations", scheduleRequestsError)
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
