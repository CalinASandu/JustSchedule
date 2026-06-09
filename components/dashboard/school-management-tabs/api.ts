import { createClient } from "@/lib/supabase/client";
import {
  getUserFacingErrorMessage,
  getUserFacingFunctionErrorMessage,
} from "@/lib/user-facing-errors";
import type {
  AttendanceStatus,
  Decision,
  ExamSlot,
  ExamType,
  ReservationUpdateResult,
  ScheduleRequest,
  SchoolRole,
  SchoolSubject,
} from "./types";

type ApiResult<T> = { data: T; error: null } | { data: null; error: string };

function isMissingRefreshTokenError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const authError = error as { code?: unknown; message?: unknown };
  const message = typeof authError.message === "string" ? authError.message : "";

  return (
    authError.code === "refresh_token_not_found" ||
    message.includes("Invalid Refresh Token") ||
    message.includes("Refresh Token Not Found")
  );
}

async function getAccessToken() {
  const supabase = createClient();
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      if (isMissingRefreshTokenError(error)) {
        await supabase.auth.signOut({ scope: "local" });
      }

      return null;
    }

    return session?.access_token ?? null;
  } catch (error) {
    if (isMissingRefreshTokenError(error)) {
      await supabase.auth.signOut({ scope: "local" });
    }

    return null;
  }
}

export async function createSchoolInvite(args: {
  schoolId: string;
  expiresAt: string;
  siteUrl: string;
}): Promise<ApiResult<string>> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return { data: null, error: "You need to sign in again." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("create-school-invite", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: args,
  });

  if (error) {
    console.error("Create school invite failed", error);
    return {
      data: null,
      error: await getUserFacingFunctionErrorMessage("createInvite", error),
    };
  }

  const inviteLink =
    typeof data === "object" && data && "inviteLink" in data ? String(data.inviteLink) : "";

  if (!inviteLink) {
    return { data: null, error: "The invite function returned an invalid response." };
  }

  return { data: inviteLink, error: null };
}

export async function reviewSchoolJoinRequests(args: {
  schoolId: string;
  decisions: { requestId: string; decision: Decision }[];
}): Promise<ApiResult<{ approved: number; rejected: number }>> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return { data: null, error: "You need to sign in again." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("review-school-join-requests", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: args,
  });

  if (error) {
    console.error("Review join requests failed", error);
    return {
      data: null,
      error: await getUserFacingFunctionErrorMessage("reviewJoinRequests", error),
    };
  }

  return {
    data: {
      approved: typeof data === "object" && data && "approved" in data ? Number(data.approved) : 0,
      rejected: typeof data === "object" && data && "rejected" in data ? Number(data.rejected) : 0,
    },
    error: null,
  };
}

export async function updateMemberRoles(args: {
  schoolId: string;
  changes: { memberId: string; nextRole: SchoolRole }[];
}): Promise<ApiResult<null>> {
  const supabase = createClient();
  const results = await Promise.all(
    args.changes.map(({ memberId, nextRole }) =>
      supabase
        .from("SchoolMembers")
        .update({ role: nextRole }, { count: "exact" })
        .eq("id", memberId)
        .eq("school_id", args.schoolId),
    ),
  );
  const failedResult = results.find((result) => result.error);
  const unchangedResult = results.find((result) => result.count !== 1);

  if (failedResult?.error) {
    console.error("Update member role failed", failedResult.error);
    return {
      data: null,
      error: getUserFacingErrorMessage("schoolRoleUpdate", failedResult.error),
    };
  }

  if (unchangedResult) {
    return {
      data: null,
      error: "No role changes were applied. Your admin permissions may need to be refreshed.",
    };
  }

  return { data: null, error: null };
}

export async function setStudentSelfBookingPermission(args: {
  schoolId: string;
  memberId: string;
  canSelfBook: boolean;
}): Promise<ApiResult<boolean>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("set_student_self_booking_permission", {
    target_school_id: args.schoolId,
    target_member_id: args.memberId,
    target_can_self_book: args.canSelfBook,
  });

  if (error) {
    console.error("Update student self-booking permission failed", error);
    return {
      data: null,
      error: getUserFacingErrorMessage("selfBookingUpdate", error),
    };
  }

  const [updatedMember] = (data ?? []) as { can_self_book: boolean }[];
  return { data: updatedMember?.can_self_book ?? args.canSelfBook, error: null };
}

export async function scheduleExamForStudent(args: {
  schoolId: string;
  studentUserId: string;
  slotId: string;
  reservationDate: string;
  examName: string;
  examType: ExamType;
}): Promise<ApiResult<null>> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return { data: null, error: "You need to sign in again." };
  }

  const supabase = createClient();
  const { error } = await supabase.functions.invoke("schedule-exam-for-student", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: args,
  });

  if (error) {
    console.error("Schedule exam for student failed", error);
    return {
      data: null,
      error: await getUserFacingFunctionErrorMessage("scheduleForStudent", error),
    };
  }

  return { data: null, error: null };
}

export async function cancelSchoolReservation(reservationId: string): Promise<ApiResult<null>> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return {
      data: null,
      error: "Your session expired. Sign in again to cancel this reservation.",
    };
  }

  const supabase = createClient();
  const { error } = await supabase.functions.invoke("cancel-reservation", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: {
      reservationId,
    },
  });

  if (error) {
    console.error("Cancel reservation failed", error);
    return {
      data: null,
      error: await getUserFacingFunctionErrorMessage("cancelReservation", error),
    };
  }

  return { data: null, error: null };
}

export async function updateSchoolReservation(args: {
  reservationId: string;
  slotId: string;
  reservationDate: string;
  examName: string;
  examType: ExamType;
}): Promise<ApiResult<ReservationUpdateResult>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("update_reservation", {
    target_reservation_id: args.reservationId,
    target_slot_id: args.slotId,
    target_reservation_date: args.reservationDate,
    target_exam_name: args.examName,
    target_exam_type: args.examType,
  });

  if (error) {
    console.error("Update reservation failed", error);
    return {
      data: null,
      error: getUserFacingErrorMessage("reservationUpdate", error),
    };
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== "object") {
    return { data: null, error: "The reservation update returned an invalid response." };
  }

  const result = row as Record<string, unknown>;

  return {
    data: {
      reservationId: String(result.reservation_id ?? args.reservationId),
      bookedSlotId: String(result.booked_slot_id ?? args.slotId),
      bookedSlotKind: result.booked_slot_kind === "overflow" ? "overflow" : "primary",
      routedToOverflow: Boolean(result.routed_to_overflow ?? false),
      slotName: String(result.slot_name ?? ""),
      startsAt: String(result.starts_at ?? ""),
      endsAt: String(result.ends_at ?? ""),
      capacity: Number(result.capacity ?? 0),
      remaining: Number(result.remaining ?? 0),
    },
    error: null,
  };
}

export async function reviewScheduleRequest(args: {
  requestId: string;
  decision: "approved" | "declined";
  message?: string;
}): Promise<
  ApiResult<{
    requestId: string;
    status: ScheduleRequest["status"];
    reservationId: string | null;
    bookedSlotId: string | null;
    bookedSlotKind: "primary" | "overflow" | null;
    remaining: number | null;
  }>
> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("review_schedule_request", {
    target_request_id: args.requestId,
    target_decision: args.decision,
    target_reviewer_message: args.message?.trim() || null,
  });

  if (error) {
    console.error("Review schedule request failed", error);
    return {
      data: null,
      error: getUserFacingErrorMessage("scheduleRequest", error),
    };
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== "object") {
    return { data: null, error: "The request review returned an invalid response." };
  }

  const result = row as Record<string, unknown>;

  return {
    data: {
      requestId: String(result.request_id ?? args.requestId),
      status: String(result.status ?? args.decision) as ScheduleRequest["status"],
      reservationId: result.reservation_id ? String(result.reservation_id) : null,
      bookedSlotId: result.booked_slot_id ? String(result.booked_slot_id) : null,
      bookedSlotKind:
        result.booked_slot_kind === "primary" || result.booked_slot_kind === "overflow"
          ? result.booked_slot_kind
          : null,
      remaining:
        typeof result.remaining === "number" ? result.remaining : null,
    },
    error: null,
  };
}

export async function markScheduleRequestTeacherSeen(requestId: string): Promise<ApiResult<null>> {
  const supabase = createClient();
  const { error } = await supabase.rpc("mark_schedule_request_teacher_seen", {
    target_request_id: requestId,
  });

  if (error) {
    console.error("Mark schedule request teacher seen failed", error);
    return {
      data: null,
      error: getUserFacingErrorMessage("scheduleRequest", error),
    };
  }

  return { data: null, error: null };
}

export async function upsertSchoolSubject(args: {
  schoolId: string;
  name: string;
}): Promise<ApiResult<SchoolSubject>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("upsert_school_subject", {
    target_school_id: args.schoolId,
    subject_name: args.name,
  });

  if (error) {
    return { data: null, error: "Could not add subject. Try again." };
  }

  return { data: data as SchoolSubject, error: null };
}

function normalizeExamSlot(row: Record<string, unknown>): ExamSlot {
  return {
    id: String(row.slot_id ?? row.id ?? ""),
    name: String(row.name ?? ""),
    startsAt: String(row.starts_at ?? ""),
    endsAt: String(row.ends_at ?? ""),
    capacity: Number(row.capacity ?? 0),
    isActive: Boolean(row.is_active ?? false),
    slotKind: row.slot_kind === "overflow" ? "overflow" : "primary",
    primarySlotId: row.primary_slot_id ? String(row.primary_slot_id) : null,
  };
}

export async function createExamSlot(args: {
  schoolId: string;
  name: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
}): Promise<ApiResult<ExamSlot>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_exam_slot", {
    target_school_id: args.schoolId,
    slot_name: args.name,
    slot_starts_at: args.startsAt,
    slot_ends_at: args.endsAt,
    slot_capacity: args.capacity,
  });

  if (error) {
    console.error("Create exam slot failed", error);
    return {
      data: null,
      error: getUserFacingErrorMessage("slotManagement", error),
    };
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== "object") {
    return { data: null, error: "The slot function returned an invalid response." };
  }

  return { data: normalizeExamSlot(row as Record<string, unknown>), error: null };
}

export async function createOverflowExamSlot(args: {
  primarySlotId: string;
  capacity: number;
}): Promise<ApiResult<ExamSlot>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_overflow_exam_slot", {
    target_primary_slot_id: args.primarySlotId,
    slot_capacity: args.capacity,
  });

  if (error) {
    console.error("Create overflow exam slot failed", error);
    return {
      data: null,
      error: getUserFacingErrorMessage("slotManagement", error),
    };
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== "object") {
    return { data: null, error: "The overflow slot function returned an invalid response." };
  }

  return { data: normalizeExamSlot(row as Record<string, unknown>), error: null };
}

export async function updateExamSlot(args: {
  slotId: string;
  name: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  isActive?: boolean;
}): Promise<ApiResult<ExamSlot>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("update_exam_slot", {
    target_slot_id: args.slotId,
    slot_name: args.name,
    slot_starts_at: args.startsAt,
    slot_ends_at: args.endsAt,
    slot_capacity: args.capacity,
    target_is_active: args.isActive ?? null,
  });

  if (error) {
    console.error("Update exam slot failed", error);
    return {
      data: null,
      error: getUserFacingErrorMessage("slotManagement", error),
    };
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== "object") {
    return { data: null, error: "The slot update function returned an invalid response." };
  }

  return { data: normalizeExamSlot(row as Record<string, unknown>), error: null };
}

export async function setExamSlotActive(args: {
  slotId: string;
  isActive: boolean;
}): Promise<ApiResult<ExamSlot[]>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("update_exam_slot", {
    target_slot_id: args.slotId,
    target_is_active: args.isActive,
  });

  if (error) {
    console.error("Update exam slot active state failed", error);
    return {
      data: null,
      error: getUserFacingErrorMessage("slotManagement", error),
    };
  }

  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(normalizeExamSlot),
    error: null,
  };
}

export async function removeSchoolSubject(args: {
  schoolId: string;
  subjectId: string;
}): Promise<ApiResult<null>> {
  const supabase = createClient();
  const { error } = await supabase.rpc("remove_school_subject", {
    target_school_id: args.schoolId,
    target_subject_id: args.subjectId,
  });

  if (error) {
    console.error("Remove school subject failed", error);
    return { data: null, error: "Could not remove subject. Try again." };
  }

  return { data: null, error: null };
}

export async function kickSchoolMember(args: {
  schoolId: string;
  memberId: string;
}): Promise<ApiResult<null>> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("SchoolMembers")
    .delete({ count: "exact" })
    .eq("id", args.memberId)
    .eq("school_id", args.schoolId)
    .neq("role", "admin");

  if (error) {
    console.error("Kick school member failed", error);
    return {
      data: null,
      error: getUserFacingErrorMessage("schoolMemberKick", error),
    };
  }

  if (count !== 1) {
    return {
      data: null,
      error: "No member was kicked. Your admin permissions may need to be refreshed.",
    };
  }

  return { data: null, error: null };
}

export async function softDeleteSchool(schoolId: string): Promise<ApiResult<null>> {
  const supabase = createClient();
  const { error } = await supabase.rpc("soft_delete_school", {
    target_school_id: schoolId,
  });

  if (error) {
    console.error("Delete school failed", error);
    return {
      data: null,
      error: getUserFacingErrorMessage("schoolDelete", error),
    };
  }

  return { data: null, error: null };
}

export async function setReservationAttendance(args: {
  reservationId: string;
  status: AttendanceStatus;
}): Promise<ApiResult<null>> {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_reservation_attendance", {
    target_reservation_id: args.reservationId,
    target_attendance_status: args.status,
  });

  if (error) {
    console.error("Update attendance failed", error);
    return {
      data: null,
      error: getUserFacingErrorMessage("attendanceUpdate", error),
    };
  }

  return { data: null, error: null };
}
