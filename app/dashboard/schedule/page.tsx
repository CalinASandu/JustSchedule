import ScheduleClient from "./ScheduleClient";
import { getCompletedProfileName, getProfileNameSetupPath } from "@/lib/profile-name";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type {
  ExamType,
  Reservation,
  ScheduleRequest,
  SlotDef,
  TeacherOption,
  UserNotification,
} from "@/components/schedule/types";
import { getUserFacingErrorMessage } from "@/lib/user-facing-errors";

type SchoolMemberRow = {
  id: string;
  role: string | null;
  school_id: string;
  can_self_book: boolean | null;
};

type SchoolRow = {
  id: string;
  name: string;
  created_by: string | null;
};

type ExamSlotRow = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  slot_kind: "primary" | "overflow" | null;
  primary_slot_id: string | null;
};

type ReservationRow = {
  id: string;
  user_id: string;
  student_name: string | null;
  slot_id: string;
  slot_name: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  reservation_date: string;
  exam_name: string;
  exam_type: string;
  status: string;
  created_at: string;
  created_by: string | null;
  created_by_role: string | null;
  attendance_status: "present" | "absent" | null;
  attendance_marked_by: string | null;
  attendance_marked_at: string | null;
};

type ScheduleRequestRow = {
  id: string;
  school_id: string;
  student_user_id: string;
  requested_teacher_user_id: string;
  teacher_name: string | null;
  requested_slot_id: string;
  requested_slot_group_id: string;
  slot_name: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  overflow_slot_id: string | null;
  overflow_capacity: number | null;
  reservation_date: string;
  exam_name: string;
  exam_type: string;
  status: ScheduleRequest["status"];
  reviewer_message: string | null;
  reviewed_at: string | null;
  reservation_id: string | null;
  expires_at: string;
  created_at: string;
  student_seen_at: string | null;
};

type TeacherRow = {
  user_id: string;
  name: string;
};

type NotificationRow = {
  id: string;
  school_id: string | null;
  schedule_request_id: string | null;
  reservation_id: string | null;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

function getSchoolId(value: string | string[] | undefined) {
  const schoolId = Array.isArray(value) ? value[0] : value;
  return schoolId?.trim() || null;
}

function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function formatTime(value: string) {
  const [hour = "0", minute = "0"] = value.split(":");
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2000, 0, 1, Number(hour), Number(minute)));
}

function formatDuration(startsAt: string, endsAt: string) {
  const [startHour = "0", startMinute = "0"] = startsAt.split(":");
  const [endHour = "0", endMinute = "0"] = endsAt.split(":");
  const start = Number(startHour) * 60 + Number(startMinute);
  const end = Number(endHour) * 60 + Number(endMinute);
  const duration = Math.max(end - start, 0);
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  if (hours && minutes) {
    return `${hours}h ${minutes}m`;
  }

  if (hours) {
    return `${hours}h`;
  }

  return `${minutes}m`;
}

function normalizeExamType(value: string): ExamType {
  return value === "final" ? "final" : "midterm";
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
      .select("id, role, school_id, can_self_book")
      .eq("user_id", user.id)
      .eq("school_id", schoolId)
      .maybeSingle(),
    supabase
      .from("Schools")
      .select("id, name, created_by")
      .eq("id", schoolId)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  const membershipRow = membership as SchoolMemberRow | null;
  const schoolRow = school as SchoolRow | null;
  const displayName = getCompletedProfileName(profile);

  if (!schoolRow) {
    redirect("/dashboard");
  }

  if (!displayName) {
    redirect(getProfileNameSetupPath(`/dashboard/schedule?schoolId=${schoolId}`));
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + 14);
  const startDate = formatLocalDate(today);
  const endDate = formatLocalDate(end);

  const [
    { data: examSlotRows, error: examSlotsError },
    { data: reservationRows, error: reservationsError },
    { data: schoolSubjectRows },
    { data: scheduleRequestRows, error: scheduleRequestsError },
    { data: teacherRows, error: teachersError },
    { data: notificationRows },
  ] = await Promise.all([
    supabase
      .from("ExamSlots")
      .select("id, name, starts_at, ends_at, capacity, slot_kind, primary_slot_id")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .order("starts_at", { ascending: true }),
    supabase.rpc("get_school_confirmed_reservations", {
      target_school_id: schoolId,
      start_date: startDate,
      end_date: endDate,
    }),
    supabase
      .from("SchoolSubjects")
      .select("id, name")
      .eq("school_id", schoolId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase.rpc("get_student_schedule_requests", {
      target_school_id: schoolId,
    }),
    supabase.rpc("get_school_request_teachers", {
      target_school_id: schoolId,
    }),
    supabase.rpc("get_user_notifications", {
      target_school_id: schoolId,
    }),
  ]);

  const examSlots: SlotDef[] = ((examSlotRows ?? []) as ExamSlotRow[])
    .filter((slot) => (slot.slot_kind ?? "primary") === "primary")
    .map((slot) => ({
      id: slot.id,
      label: `${formatTime(slot.starts_at)} - ${formatTime(slot.ends_at)}`,
      duration: formatDuration(slot.starts_at, slot.ends_at),
      startsAt: slot.starts_at,
      endsAt: slot.ends_at,
      capacity: slot.capacity,
      slotKind: slot.slot_kind ?? "primary",
      primarySlotId: slot.primary_slot_id,
    }));

  const reservations: Reservation[] = ((reservationRows ?? []) as ReservationRow[]).map(
    (reservation) => ({
      id: reservation.id,
      userId: reservation.user_id,
      studentName: reservation.student_name || "Unnamed student",
      slotId: reservation.slot_id,
      slotName: reservation.slot_name,
      startsAt: reservation.starts_at,
      endsAt: reservation.ends_at,
      capacity: reservation.capacity,
      reservationDate: reservation.reservation_date,
      examName: reservation.exam_name,
      examType: normalizeExamType(reservation.exam_type),
      status: reservation.status,
      createdAt: reservation.created_at,
      createdBy: reservation.created_by ?? reservation.user_id,
      createdByRole:
        reservation.created_by_role === "admin" || reservation.created_by_role === "professor"
          ? reservation.created_by_role
          : "student",
      attendanceStatus: reservation.attendance_status ?? "present",
      attendanceMarkedBy: reservation.attendance_marked_by,
      attendanceMarkedAt: reservation.attendance_marked_at,
    }),
  );

  const schoolSubjects = ((schoolSubjectRows ?? []) as { id: string; name: string }[]).map(
    (s) => ({ id: s.id, name: s.name }),
  );
  const scheduleRequests: ScheduleRequest[] = (
    (scheduleRequestRows ?? []) as ScheduleRequestRow[]
  ).map((request) => ({
    id: request.id,
    schoolId: request.school_id,
    studentUserId: request.student_user_id,
    teacherUserId: request.requested_teacher_user_id,
    teacherName: request.teacher_name || "Professor",
    slotId: request.requested_slot_id,
    slotGroupId: request.requested_slot_group_id,
    slotName: request.slot_name,
    startsAt: request.starts_at,
    endsAt: request.ends_at,
    capacity: request.capacity,
    overflowSlotId: request.overflow_slot_id,
    overflowCapacity: request.overflow_capacity,
    reservationDate: request.reservation_date,
    examName: request.exam_name,
    examType: normalizeExamType(request.exam_type),
    status: request.status,
    reviewerMessage: request.reviewer_message,
    reviewedAt: request.reviewed_at,
    reservationId: request.reservation_id,
    expiresAt: request.expires_at,
    createdAt: request.created_at,
    studentSeenAt: request.student_seen_at,
  }));
  const requestTeachers: TeacherOption[] = ((teacherRows ?? []) as TeacherRow[]).map(
    (teacher) => ({
      userId: teacher.user_id,
      name: teacher.name,
    }),
  );
  const notifications: UserNotification[] = ((notificationRows ?? []) as NotificationRow[]).map(
    (notification) => ({
      id: notification.id,
      schoolId: notification.school_id,
      scheduleRequestId: notification.schedule_request_id,
      reservationId: notification.reservation_id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      href: notification.href,
      readAt: notification.read_at,
      createdAt: notification.created_at,
    }),
  );
  const canSelfBook = membershipRow.can_self_book === true;

  return (
    <ScheduleClient
      schoolId={schoolRow.id}
      schoolName={schoolRow.name}
      membershipId={membershipRow.id}
      studentName={displayName}
      userEmail={user.email ?? "Signed in with Google"}
      currentUserId={user.id}
      canSelfBook={canSelfBook}
      examSlots={examSlots}
      initialReservations={reservations}
      initialScheduleRequests={scheduleRequests}
      requestTeachers={requestTeachers}
      notifications={notifications}
      schoolSubjects={schoolSubjects}
      reservationError={
        examSlotsError || reservationsError || scheduleRequestsError || teachersError
          ? getUserFacingErrorMessage(
              "loadReservations",
              examSlotsError ?? reservationsError ?? scheduleRequestsError ?? teachersError,
            )
          : null
      }
    />
  );
}
