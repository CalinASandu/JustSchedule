import { CalendarDays, CalendarPlus, Clock, FileText, Loader2, UserRound, X } from "lucide-react";
import { createPortal } from "react-dom";
import SubjectCommandPalette from "@/components/schedule/SubjectCommandPalette";
import { getMaxBookingDate, getTodayKey } from "./date-utils";
import { formatReservationDate, formatSlotTime } from "./formatters";
import { ErrorBanner } from "./shared";
import type { ExamSlot, ExamType, Reservation, SchoolMember, SchoolSubject } from "./types";

type MemberScheduleDialogProps = {
  member: SchoolMember;
  subjects: SchoolSubject[];
  examSlots: ExamSlot[];
  reservations: Reservation[];
  scheduleDate: string;
  scheduleSlotId: string;
  scheduleExamName: string;
  scheduleExamType: ExamType;
  state: {
    error: string | null;
    success: string | null;
    pending: boolean;
  };
  setScheduleDate: (value: string) => void;
  setScheduleSlotId: (value: string) => void;
  setScheduleExamName: (value: string) => void;
  setScheduleExamType: (value: ExamType) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function MemberScheduleDialog({
  member,
  subjects,
  examSlots,
  reservations,
  scheduleDate,
  scheduleSlotId,
  scheduleExamName,
  scheduleExamType,
  state,
  setScheduleDate,
  setScheduleSlotId,
  setScheduleExamName,
  setScheduleExamType,
  onClose,
  onSubmit,
}: MemberScheduleDialogProps) {
  const selectedScheduleSlot =
    examSlots.find((slot) => slot.id === scheduleSlotId) ?? examSlots[0] ?? null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-student-title"
    >
      <div className="panel w-full max-w-[620px] overflow-hidden shadow-[0_18px_60px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "#EFF6FF", color: "#2563EB" }}
              aria-hidden="true"
            >
              <CalendarPlus size={18} />
            </div>
            <div className="min-w-0">
              <h2
                id="schedule-student-title"
                className="text-[0.9375rem] font-semibold"
                style={{ color: "#111827", letterSpacing: "-0.01em" }}
              >
                Schedule exam
              </h2>
              <p className="mt-1 text-sm" style={{ color: "#6B7280", lineHeight: 1.5 }}>
                Create a confirmed booking for this student.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={state.pending}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed"
            style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
            aria-label="Close dialog"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-5 pb-5 sm:px-6">
          {state.error && <ErrorBanner message={state.error} />}

          <div
            className="mb-4 grid gap-0 overflow-hidden rounded-2xl sm:grid-cols-3"
            style={{ border: "1px solid #E4E8EF", background: "#F8FAFC" }}
          >
            <div className="flex items-center gap-3 px-4 py-3 sm:border-r sm:border-[#E4E8EF]">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: "#FFFFFF", color: "#2563EB", border: "1px solid #E4E8EF" }}
              >
                <UserRound size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase" style={{ color: "#94A3B8" }}>
                  Student
                </p>
                <p className="truncate text-sm font-semibold" style={{ color: "#111827" }}>
                  {member.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-[#E4E8EF] px-4 py-3 sm:border-r sm:border-t-0">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: "#FFFFFF", color: "#2563EB", border: "1px solid #E4E8EF" }}
              >
                <CalendarDays size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase" style={{ color: "#94A3B8" }}>
                  Date
                </p>
                <p className="truncate text-sm font-semibold" style={{ color: "#111827" }}>
                  {formatReservationDate(scheduleDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-[#E4E8EF] px-4 py-3 sm:border-t-0">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: "#FFFFFF", color: "#2563EB", border: "1px solid #E4E8EF" }}
              >
                <Clock size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase" style={{ color: "#94A3B8" }}>
                  Slot
                </p>
                <p className="truncate text-sm font-semibold" style={{ color: "#111827" }}>
                  {selectedScheduleSlot
                    ? `${formatSlotTime(selectedScheduleSlot.startsAt)} - ${formatSlotTime(
                        selectedScheduleSlot.endsAt,
                      )}`
                    : "No active slots"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="schedule-student-date"
                className="mb-1.5 block text-[0.8125rem] font-medium"
                style={{ color: "#374151" }}
              >
                Date
              </label>
              <input
                id="schedule-student-date"
                type="date"
                value={scheduleDate}
                min={getTodayKey()}
                max={getMaxBookingDate()}
                onChange={(event) => setScheduleDate(event.target.value)}
                className="h-[2.625rem] w-full rounded-[10px] bg-white px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow]"
                style={{ border: "1.5px solid #E4E8EF", color: "#111827" }}
                onFocus={(event) => {
                  event.currentTarget.style.borderColor = "#3B82F6";
                  event.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)";
                }}
                onBlur={(event) => {
                  event.currentTarget.style.borderColor = "#E4E8EF";
                  event.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            <div>
              <label
                htmlFor="schedule-student-slot"
                className="mb-1.5 block text-[0.8125rem] font-medium"
                style={{ color: "#374151" }}
              >
                Slot
              </label>
              <select
                id="schedule-student-slot"
                value={scheduleSlotId}
                onChange={(event) => setScheduleSlotId(event.target.value)}
                className="h-[2.625rem] w-full rounded-[10px] bg-white px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow]"
                style={{ border: "1.5px solid #E4E8EF", color: "#111827" }}
                onFocus={(event) => {
                  event.currentTarget.style.borderColor = "#3B82F6";
                  event.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)";
                }}
                onBlur={(event) => {
                  event.currentTarget.style.borderColor = "#E4E8EF";
                  event.currentTarget.style.boxShadow = "none";
                }}
              >
                {examSlots.length === 0 ? (
                  <option value="">No active slots</option>
                ) : (
                  examSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.name} - {formatSlotTime(slot.startsAt)}
                    </option>
                  ))
                )}
              </select>
              {selectedScheduleSlot && (
                <SlotRemainingPill
                  slot={selectedScheduleSlot}
                  reservations={reservations}
                  scheduleDate={scheduleDate}
                  scheduleSlotId={scheduleSlotId}
                />
              )}
            </div>

            <div>
              <label
                htmlFor="schedule-student-exam-type"
                className="mb-1.5 block text-[0.8125rem] font-medium"
                style={{ color: "#374151" }}
              >
                Exam type
              </label>
              <select
                id="schedule-student-exam-type"
                value={scheduleExamType}
                onChange={(event) => setScheduleExamType(event.target.value as ExamType)}
                className="h-[2.625rem] w-full rounded-[10px] bg-white px-3 text-[0.9375rem] capitalize outline-none transition-[border-color,box-shadow]"
                style={{ border: "1.5px solid #E4E8EF", color: "#111827" }}
                onFocus={(event) => {
                  event.currentTarget.style.borderColor = "#3B82F6";
                  event.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)";
                }}
                onBlur={(event) => {
                  event.currentTarget.style.borderColor = "#E4E8EF";
                  event.currentTarget.style.boxShadow = "none";
                }}
              >
                <option value="midterm">Midterm</option>
                <option value="final">Final</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="schedule-student-exam-name"
                className="mb-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium"
                style={{ color: "#374151" }}
              >
                <FileText size={14} />
                Exam name
              </label>
              <SubjectCommandPalette
                subjects={subjects}
                value={scheduleExamName}
                onChange={setScheduleExamName}
                placeholder="Search subject..."
                disabled={state.pending}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[#F3F4F6] pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={state.pending}
              className="inline-flex h-[2.625rem] items-center justify-center rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed"
              style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={
                state.pending ||
                !scheduleSlotId ||
                !scheduleExamName.trim() ||
                examSlots.length === 0
              }
              className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold text-white transition-colors duration-150 disabled:cursor-not-allowed"
              style={{
                background:
                  state.pending || !scheduleSlotId || !scheduleExamName.trim() || examSlots.length === 0
                    ? "#93C5FD"
                    : "#2563EB",
                boxShadow:
                  state.pending || !scheduleSlotId || !scheduleExamName.trim() || examSlots.length === 0
                    ? "none"
                    : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
              }}
            >
              {state.pending ? <Loader2 size={16} className="animate-spin" /> : <CalendarPlus size={16} />}
              Schedule exam
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SlotRemainingPill({
  slot,
  reservations,
  scheduleDate,
  scheduleSlotId,
}: {
  slot: ExamSlot;
  reservations: Reservation[];
  scheduleDate: string;
  scheduleSlotId: string;
}) {
  const booked = reservations.filter(
    (reservation) =>
      reservation.slotId === scheduleSlotId && reservation.reservationDate === scheduleDate,
  ).length;
  const remaining = slot.capacity - booked;
  const bg = remaining <= 0 ? "#FEF2F2" : remaining <= 2 ? "#FEF3C7" : "#DBEAFE";
  const color = remaining <= 0 ? "#DC2626" : remaining <= 2 ? "#B45309" : "#1D4ED8";
  const label =
    remaining <= 0
      ? "No spots left"
      : `${remaining} of ${slot.capacity} spot${slot.capacity !== 1 ? "s" : ""} left`;

  return (
    <p
      className="anim-fade-in mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: bg, color }}
    >
      {label}
    </p>
  );
}
