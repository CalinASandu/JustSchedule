import type { AttendanceSession, ExamSlot } from "./types";

const ATTENDANCE_OPEN_BEFORE_MS = 5 * 60 * 1000;
const ATTENDANCE_CLOSE_AFTER_MS = 25 * 60 * 1000;

export function getSlotDateTime(dateKey: string, timeValue: string) {
  return new Date(`${dateKey}T${timeValue}`);
}

export function isAttendanceMarkingOpen(
  dateKey: string,
  slot: ExamSlot | null,
  session: AttendanceSession | null,
) {
  if (!slot) {
    return false;
  }

  const now = new Date();

  if (session && new Date(session.expiresAt) > now) {
    return true;
  }

  const startsAt = getSlotDateTime(dateKey, slot.startsAt);
  const opensAt = new Date(startsAt.getTime() - ATTENDANCE_OPEN_BEFORE_MS);
  const closesAt = new Date(startsAt.getTime() + ATTENDANCE_CLOSE_AFTER_MS);

  return now >= opensAt && now <= closesAt;
}

export function getAttendanceWindowLabel(
  dateKey: string,
  slot: ExamSlot | null,
  session: AttendanceSession | null,
) {
  if (!slot) {
    return "Choose a slot";
  }

  if (session && new Date(session.expiresAt) > new Date()) {
    return "Started for testing";
  }

  const now = new Date();
  const startsAt = getSlotDateTime(dateKey, slot.startsAt);
  const opensAt = new Date(startsAt.getTime() - ATTENDANCE_OPEN_BEFORE_MS);
  const closesAt = new Date(startsAt.getTime() + ATTENDANCE_CLOSE_AFTER_MS);

  if (now < opensAt) {
    return `Opens at ${opensAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  if (now > closesAt) {
    return "Closed";
  }

  return `Open until ${closesAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}
