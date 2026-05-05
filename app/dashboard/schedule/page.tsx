import ScheduleClient from "./ScheduleClient";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { ExamType, Reservation, SlotDef } from "@/components/schedule/types";
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + 14);
  const startDate = formatLocalDate(today);
  const endDate = formatLocalDate(end);

  const [
    { data: examSlotRows, error: examSlotsError },
    { data: reservationRows, error: reservationsError },
  ] = await Promise.all([
    supabase
      .from("ExamSlots")
      .select("id, name, starts_at, ends_at, capacity")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .order("starts_at", { ascending: true }),
    supabase.rpc("get_school_confirmed_reservations", {
      target_school_id: schoolId,
      start_date: startDate,
      end_date: endDate,
    }),
  ]);

  const examSlots: SlotDef[] = ((examSlotRows ?? []) as ExamSlotRow[]).map((slot) => ({
    id: slot.id,
    label: `${formatTime(slot.starts_at)} - ${formatTime(slot.ends_at)}`,
    duration: formatDuration(slot.starts_at, slot.ends_at),
    startsAt: slot.starts_at,
    endsAt: slot.ends_at,
    capacity: slot.capacity,
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
    }),
  );

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
      currentUserId={user.id}
      canSelfBook={membershipRow.can_self_book ?? true}
      examSlots={examSlots}
      initialReservations={reservations}
      reservationError={
        examSlotsError || reservationsError
          ? getUserFacingErrorMessage(
              "loadReservations",
              examSlotsError ?? reservationsError,
            )
          : null
      }
    />
  );
}
