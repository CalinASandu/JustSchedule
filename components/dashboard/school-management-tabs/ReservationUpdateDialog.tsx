import type React from "react";
import { useState } from "react";
import { CalendarDays, Clock, FileText, Loader2, Pencil, X } from "lucide-react";
import SubjectCommandPalette from "@/components/schedule/SubjectCommandPalette";
import { getMaxBookingDate, getTodayKey } from "./date-utils";
import { formatReservationDate, formatSlotTime } from "./formatters";
import { ErrorBanner } from "./shared";
import type { ExamSlot, ExamType, Reservation, SchoolSubject } from "./types";

type ReservationUpdateValues = {
  slotId: string;
  reservationDate: string;
  examName: string;
  examType: ExamType;
};

type ReservationUpdateDialogProps = {
  reservation: Reservation;
  studentName: string;
  examSlots: ExamSlot[];
  subjects: SchoolSubject[];
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: ReservationUpdateValues) => void;
};

export function ReservationUpdateDialog({
  reservation,
  studentName,
  examSlots,
  subjects,
  pending,
  error,
  onClose,
  onSubmit,
}: ReservationUpdateDialogProps) {
  const currentSlot = examSlots.find((slot) => slot.id === reservation.slotId) ?? null;
  const initialSlotId =
    currentSlot?.slotKind === "overflow"
      ? currentSlot.primarySlotId ?? reservation.slotId
      : reservation.slotId;
  const primarySlots = examSlots.filter((slot) => slot.slotKind === "primary");
  const selectableSlots = primarySlots.length > 0 ? primarySlots : examSlots;
  const normalizedInitialSlotId = selectableSlots.some((slot) => slot.id === initialSlotId)
    ? initialSlotId
    : selectableSlots[0]?.id ?? "";
  const [reservationDate, setReservationDate] = useState(reservation.reservationDate);
  const [slotId, setSlotId] = useState(normalizedInitialSlotId);
  const [examName, setExamName] = useState(reservation.examName);
  const [examType, setExamType] = useState<ExamType>(reservation.examType);
  const selectedSlot = selectableSlots.find((slot) => slot.id === slotId) ?? selectableSlots[0] ?? null;
  const hasValidExamName =
    subjects.length === 0 ||
    subjects.some((subject) => subject.name.trim().toLowerCase() === examName.trim().toLowerCase());
  const canSubmit = !!slotId && !!examName.trim() && hasValidExamName;

  function openDatePicker(event: React.MouseEvent<HTMLInputElement>) {
    const input = event.currentTarget as HTMLInputElement & { showPicker?: () => void };
    input.showPicker?.();
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      slotId,
      reservationDate,
      examName: examName.trim(),
      examType,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      style={{ background: "var(--overlay-scrim)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-reservation-title"
    >
      <form
        onSubmit={submit}
        className="panel anim-scale-in w-full max-w-[620px]"
        style={{ boxShadow: "var(--shadow-dialog)" }}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}
            >
              <Pencil size={17} />
            </div>
            <div className="min-w-0">
              <h2
                id="update-reservation-title"
                className="text-[0.9375rem] font-semibold"
                style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
              >
                Update reservation
              </h2>
              <p className="mt-1 truncate text-sm" style={{ color: "var(--text-secondary)" }}>
                {studentName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed"
            style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-5 pb-5 sm:px-6">
          {error && <ErrorBanner message={error} />}

          <div
            className="mb-4 grid gap-0 overflow-hidden rounded-2xl sm:grid-cols-3"
            style={{ border: "1px solid var(--border-default)", background: "var(--surface-alt)" }}
          >
            <SummaryItem icon={<CalendarDays size={15} />} label="Date" value={formatReservationDate(reservationDate)} />
            <SummaryItem
              icon={<Clock size={15} />}
              label="Slot"
              value={
                selectedSlot
                  ? `${formatSlotTime(selectedSlot.startsAt)} - ${formatSlotTime(selectedSlot.endsAt)}`
                  : "No active slot"
              }
            />
            <SummaryItem icon={<FileText size={15} />} label="Exam" value={examName || "No exam name"} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date" htmlFor="reservation-update-date">
              <input
                id="reservation-update-date"
                type="date"
                value={reservationDate}
                min={getTodayKey()}
                max={getMaxBookingDate()}
                onChange={(event) => setReservationDate(event.target.value)}
                onClick={openDatePicker}
                disabled={pending}
                className="h-[2.625rem] w-full cursor-pointer rounded-[10px] px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow] disabled:cursor-not-allowed"
                style={{
                  background: "var(--surface-panel)",
                  border: "1.5px solid var(--border-default)",
                  color: "var(--text-primary)",
                }}
              />
            </Field>

            <Field label="Slot" htmlFor="reservation-update-slot">
              <select
                id="reservation-update-slot"
                value={slotId}
                onChange={(event) => setSlotId(event.target.value)}
                disabled={pending || selectableSlots.length === 0}
                className="h-[2.625rem] w-full rounded-[10px] px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow] disabled:cursor-not-allowed"
                style={{
                  background: "var(--surface-panel)",
                  border: "1.5px solid var(--border-default)",
                  color: "var(--text-primary)",
                }}
              >
                {selectableSlots.length === 0 ? (
                  <option value="">No active slots</option>
                ) : (
                  selectableSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.name} - {formatSlotTime(slot.startsAt)}
                    </option>
                  ))
                )}
              </select>
            </Field>

            <Field label="Exam type" htmlFor="reservation-update-exam-type">
              <select
                id="reservation-update-exam-type"
                value={examType}
                onChange={(event) => setExamType(event.target.value as ExamType)}
                disabled={pending}
                className="h-[2.625rem] w-full rounded-[10px] px-3 text-[0.9375rem] capitalize outline-none transition-[border-color,box-shadow] disabled:cursor-not-allowed"
                style={{
                  background: "var(--surface-panel)",
                  border: "1.5px solid var(--border-default)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="midterm">Midterm</option>
                <option value="final">Final</option>
              </select>
            </Field>

            <Field label="Exam name" htmlFor="reservation-update-exam-name">
              <SubjectCommandPalette
                id="reservation-update-exam-name"
                subjects={subjects}
                value={examName}
                onChange={setExamName}
                placeholder="Search subject..."
                disabled={pending}
              />
              {!hasValidExamName && examName.trim() && (
                <p className="mt-1.5 text-xs font-medium" style={{ color: "var(--danger)" }}>
                  Choose an exam from the school subject list.
                </p>
              )}
            </Field>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[var(--border-subtle)] pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="inline-flex h-[2.625rem] items-center justify-center rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed"
              style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !canSubmit}
              className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 disabled:cursor-not-allowed"
              style={{
                color: "var(--text-on-accent)",
                background: pending || !canSubmit ? "var(--accent-disabled)" : "var(--accent-color)",
                boxShadow:
                  pending || !canSubmit
                    ? "none"
                    : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
              }}
            >
              {pending ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
              Save changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[0.8125rem] font-medium"
        style={{ color: "var(--text-body)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 sm:border-r sm:border-[var(--border-default)] last:sm:border-r-0">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: "var(--surface-panel)", color: "var(--accent-color)", border: "1px solid var(--border-default)" }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase" style={{ color: "var(--text-faint)" }}>
          {label}
        </p>
        <p className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {value}
        </p>
      </div>
    </div>
  );
}
