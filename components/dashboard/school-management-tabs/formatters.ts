import type { Reservation, SchoolRole } from "./types";

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatReservationDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatSlotTime(value: string) {
  const [hour = "0", minute = "0"] = value.split(":");
  const date = new Date(2026, 0, 1, Number(hour), Number(minute));

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatExamType(type: Reservation["examType"]) {
  return type[0].toUpperCase() + type.slice(1);
}

export function formatRole(role: SchoolRole) {
  return role === "exam_supervisor" ? "Exam supervisor" : role;
}
