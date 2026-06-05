type ErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

type FunctionErrorBody = {
  error?: unknown;
  code?: unknown;
};

export type ErrorContext =
  | "attendanceStart"
  | "attendanceUpdate"
  | "cancelReservation"
  | "createInvite"
  | "joinRequest"
  | "loadInvites"
  | "loadJoinRequests"
  | "loadMembers"
  | "loadReservations"
  | "registerSchool"
  | "requestDirectJoin"
  | "reserveExamSlot"
  | "reservationUpdate"
  | "reviewJoinRequests"
  | "scheduleForStudent"
  | "schoolDelete"
  | "schoolLeave"
  | "schoolMemberKick"
  | "schoolRoleUpdate"
  | "selfBookingUpdate"
  | "slotManagement";

const fallbackMessages: Record<ErrorContext, string> = {
  attendanceStart: "Could not start attendance for this slot. Try again in a moment.",
  attendanceUpdate: "Could not update attendance. Try again in a moment.",
  cancelReservation: "Could not cancel this reservation. Try again in a moment.",
  createInvite: "Could not create an invite link. Try again in a moment.",
  joinRequest: "Could not request access. Try again in a moment.",
  loadInvites: "Could not load invite links. Refresh the page and try again.",
  loadJoinRequests: "Could not load join requests. Refresh the page and try again.",
  loadMembers: "Could not load all school members. Refresh the page and try again.",
  loadReservations: "Could not load reservations. Refresh the page and try again.",
  registerSchool: "Could not register this school. Try again in a moment.",
  requestDirectJoin: "Could not send your join request. Try again in a moment.",
  reserveExamSlot: "Could not schedule this exam. Try again in a moment.",
  reservationUpdate: "Could not update this reservation. Try again in a moment.",
  reviewJoinRequests: "Could not review join requests. Try again in a moment.",
  scheduleForStudent: "Could not schedule this exam for the student. Try again in a moment.",
  schoolDelete: "Could not delete this school. Try again in a moment.",
  schoolLeave: "Could not leave this school. Try again in a moment.",
  schoolMemberKick: "Could not remove this member. Try again in a moment.",
  schoolRoleUpdate: "Could not update member roles. Try again in a moment.",
  selfBookingUpdate: "Could not update self-booking permission. Try again in a moment.",
  slotManagement: "Could not update exam rooms. Try again in a moment.",
};

function normalizeMessage(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function messageIncludes(message: string, fragments: string[]) {
  const normalized = message.toLowerCase();
  return fragments.some((fragment) => normalized.includes(fragment));
}

function isResponseLike(value: unknown): value is Response {
  return (
    typeof value === "object" &&
    value !== null &&
    "clone" in value &&
    typeof (value as { clone?: unknown }).clone === "function"
  );
}

async function readFunctionErrorBody(error: unknown) {
  const context =
    typeof error === "object" && error !== null && "context" in error
      ? (error as { context?: unknown }).context
      : null;

  if (!isResponseLike(context)) {
    return null;
  }

  try {
    const body = (await context.clone().json()) as FunctionErrorBody;
    return {
      code: normalizeMessage(body.code),
      message: normalizeMessage(body.error),
    };
  } catch {
    return null;
  }
}

export function getUserFacingErrorMessage(
  context: ErrorContext,
  error?: ErrorLike | null,
) {
  const code = normalizeMessage(error?.code);
  const message = normalizeMessage(error?.message);

  if (code === "23505" || messageIncludes(message, ["duplicate key", "already requested"])) {
    if (context === "registerSchool") {
      return "A school with this name already exists.";
    }

    if (context === "joinRequest") {
      return "You already requested access to this school.";
    }
  }

  if (code === "42501" || messageIncludes(message, ["row-level security", "permission denied"])) {
    if (context === "createInvite") {
      return "Only school admins can create invite links.";
    }

    if (context === "schoolDelete") {
      return "Only school admins can delete this school.";
    }

    if (context === "schoolLeave") {
      return "You can only leave schools where you are a student or professor.";
    }

    if (context === "schoolMemberKick") {
      return "Only school admins can remove non-admin members.";
    }

    if (context === "schoolRoleUpdate") {
      return "Only school admins can update member roles.";
    }

    if (context === "selfBookingUpdate") {
      return "Only admins and professors can update student self-booking permissions.";
    }

    if (context === "slotManagement") {
      return "Only admins and professors can manage exam rooms.";
    }
  }

  if (context === "reserveExamSlot") {
    if (
      code === "23505" ||
      messageIncludes(message, [
        "already reserved",
        "already scheduled",
        "duplicate key",
        "reservations_user_slot_date_unique",
      ])
    ) {
      return "You already scheduled an exam in this time slot for that date.";
    }

    if (messageIncludes(message, ["slot is full", "selected slot is full", "full"])) {
      return "This time slot is full. Choose another time.";
    }

    if (messageIncludes(message, ["only student members"])) {
      return "Only student members can schedule exams.";
    }

    if (messageIncludes(message, ["self booking is disabled"])) {
      return "A professor must schedule this exam for you.";
    }

    if (messageIncludes(message, ["invalid session", "jwt", "authorization"])) {
      return "Your session expired. Sign in again to schedule this exam.";
    }

    if (messageIncludes(message, ["weekend"])) {
      return "Exams cannot be scheduled on weekends.";
    }

    if (messageIncludes(message, ["next 14 days", "reservation date"])) {
      return "Choose a date within the next 14 days.";
    }

    if (messageIncludes(message, ["slot is unavailable", "selected slot is unavailable"])) {
      return "This time slot is no longer available. Choose another time.";
    }

    if (messageIncludes(message, ["exam name"])) {
      return "Enter the exam name before scheduling.";
    }

    if (messageIncludes(message, ["exam type"])) {
      return "Choose a valid exam type.";
    }
  }

  if (context === "scheduleForStudent" || context === "reservationUpdate") {
    if (
      code === "23505" ||
      messageIncludes(message, [
        "already reserved",
        "already scheduled",
        "duplicate key",
        "reservations_user_slot_date_unique",
      ])
    ) {
      return "This student already has an exam in that time slot for that date.";
    }

    if (messageIncludes(message, ["slot is full", "selected slot is full", "full"])) {
      return "This time slot is full. Choose another time.";
    }

    if (messageIncludes(message, ["admins and professors"])) {
      return context === "reservationUpdate"
        ? "Only admins and professors can update reservations."
        : "Only admins and professors can schedule exams for students.";
    }

    if (messageIncludes(message, ["target user must be a student", "student member"])) {
      return "Choose a student member from this school.";
    }

    if (messageIncludes(message, ["invalid session", "jwt", "authorization"])) {
      return context === "reservationUpdate"
        ? "Your session expired. Sign in again to update this reservation."
        : "Your session expired. Sign in again to schedule this exam.";
    }

    if (messageIncludes(message, ["weekend"])) {
      return "Exams cannot be scheduled on weekends.";
    }

    if (messageIncludes(message, ["next 14 days", "reservation date"])) {
      return "Choose a date within the next 14 days.";
    }

    if (messageIncludes(message, ["slot is unavailable", "selected slot is unavailable"])) {
      return "This time slot is no longer available. Choose another time.";
    }

    if (messageIncludes(message, ["exam name"])) {
      return "Enter the exam name before scheduling.";
    }

    if (messageIncludes(message, ["exam type"])) {
      return "Choose a valid exam type.";
    }
  }

  if (context === "cancelReservation") {
    if (messageIncludes(message, ["only students", "cancel_not_allowed", "permission denied"])) {
      return "Only students, admins, and professors can cancel reservations.";
    }

    if (messageIncludes(message, ["invalid session", "jwt", "authorization"])) {
      return "Your session expired. Sign in again to cancel this reservation.";
    }

    if (messageIncludes(message, ["already cancelled", "no longer available", "reservation_unavailable"])) {
      return "This reservation is no longer available to cancel.";
    }
  }

  if (context === "attendanceStart" || context === "attendanceUpdate") {
    if (messageIncludes(message, ["only exam supervisors"])) {
      return "Only exam supervisors can update attendance.";
    }

    if (messageIncludes(message, ["five minutes", "marking is closed"])) {
      return "Attendance can only be marked during the active exam window.";
    }

    if (messageIncludes(message, ["invalid session", "jwt", "authorization"])) {
      return "Your session expired. Sign in again to update attendance.";
    }

    if (messageIncludes(message, ["slot is unavailable", "reservation is unavailable"])) {
      return "This attendance record is no longer available. Refresh and try again.";
    }
  }

  if (context === "createInvite") {
    if (messageIncludes(message, ["expiresat", "future timestamp"])) {
      return "Choose a future expiration date for the invite link.";
    }

    if (messageIncludes(message, ["siteurl", "valid url"])) {
      return "Could not detect this site's public URL. Refresh the page and try again.";
    }

    if (messageIncludes(message, ["invalid session", "jwt", "authorization"])) {
      return "Your session expired. Sign in again to create an invite link.";
    }
  }

  if (context === "reviewJoinRequests") {
    if (messageIncludes(message, ["only school admins"])) {
      return "Only school admins can review join requests.";
    }

    if (messageIncludes(message, ["no longer pending"])) {
      return "One or more join requests were already reviewed. Refresh the page and try again.";
    }
  }

  if (context === "selfBookingUpdate") {
    if (messageIncludes(message, ["admins and professors"])) {
      return "Only admins and professors can update student self-booking permissions.";
    }

    if (messageIncludes(message, ["only student", "student self-booking"])) {
      return "Only student self-booking permissions can be changed.";
    }

    if (messageIncludes(message, ["own self-booking"])) {
      return "Students cannot update their own self-booking permission.";
    }
  }

  if (context === "slotManagement") {
    if (
      code === "23505" ||
      messageIncludes(message, ["already exists", "duplicate key", "already has an overflow"])
    ) {
      return "An exam room with these details already exists.";
    }

    if (messageIncludes(message, ["capacity"])) {
      return "Capacity must be at least 1.";
    }

    if (messageIncludes(message, ["end time", "after the start"])) {
      return "End time must be after the start time.";
    }

    if (messageIncludes(message, ["slot name", "name is required"])) {
      return "Enter an exam room name.";
    }

    if (messageIncludes(message, ["enable the primary", "primary slot is disabled"])) {
      return "Enable the main room before enabling its overflow room.";
    }
  }

  return fallbackMessages[context];
}

export async function getUserFacingFunctionErrorMessage(
  context: ErrorContext,
  error: unknown,
) {
  const body = await readFunctionErrorBody(error);

  if (body) {
    return getUserFacingErrorMessage(context, body);
  }

  return getUserFacingErrorMessage(
    context,
    typeof error === "object" && error !== null
      ? (error as ErrorLike)
      : { message: normalizeMessage(error) },
  );
}
