import type React from "react";
import { useState } from "react";
import { CalendarDays, Clock, FileText, Loader2, Pencil, X } from "lucide-react";
import { getMaxBookingDate, getTodayKey } from "./date-utils";
import { formatReservationDate, formatSlotTime } from "./formatters";
import { ErrorBanner } from "./shared";
import type { ExamSlot, ExamType, Reservation } from "./types";

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
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: ReservationUpdateValues) => void;
};

export function ReservationUpdateDialog({
  reservation,
  studentName,
  examSlots,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-reservation-title"
    >
      <form
        onSubmit={submit}
        className="panel anim-scale-in w-full max-w-[620px] overflow-hidden shadow-[0_18px_60px_rgba(15,23,42,0.18)]"
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "#EFF6FF", color: "#2563EB" }}
            >
              <Pencil size={17} />
            </div>
            <div className="min-w-0">
              <h2
                id="update-reservation-title"
                className="text-[0.9375rem] font-semibold"
                style={{ color: "#111827", letterSpacing: "-0.01em" }}
              >
                Update reservation
              </h2>
              <p className="mt-1 truncate text-sm" style={{ color: "#6B7280" }}>
                {studentName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed"
            style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-5 pb-5 sm:px-6">
          {error && <ErrorBanner message={error} />}

          <div
            className="mb-4 grid gap-0 overflow-hidden rounded-2xl sm:grid-cols-3"
            style={{ border: "1px solid #E4E8EF", background: "#F8FAFC" }}
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
                disabled={pending}
                className="h-[2.625rem] w-full rounded-[10px] bg-white px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow] disabled:cursor-not-allowed"
                style={{ border: "1.5px solid #E4E8EF", color: "#111827" }}
              />
            </Field>

            <Field label="Slot" htmlFor="reservation-update-slot">
              <select
                id="reservation-update-slot"
                value={slotId}
                onChange={(event) => setSlotId(event.target.value)}
                disabled={pending || selectableSlots.length === 0}
                className="h-[2.625rem] w-full rounded-[10px] bg-white px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow] disabled:cursor-not-allowed"
                style={{ border: "1.5px solid #E4E8EF", color: "#111827" }}
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
                className="h-[2.625rem] w-full rounded-[10px] bg-white px-3 text-[0.9375rem] capitalize outline-none transition-[border-color,box-shadow] disabled:cursor-not-allowed"
                style={{ border: "1.5px solid #E4E8EF", color: "#111827" }}
              >
                <option value="midterm">Midterm</option>
                <option value="final">Final</option>
              </select>
            </Field>

            <Field label="Exam name" htmlFor="reservation-update-exam-name">
              <input
                id="reservation-update-exam-name"
                type="text"
                value={examName}
                onChange={(event) => setExamName(event.target.value)}
                disabled={pending}
                className="h-[2.625rem] w-full rounded-[10px] bg-white px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow] disabled:cursor-not-allowed"
                style={{ border: "1.5px solid #E4E8EF", color: "#111827" }}
              />
            </Field>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[#F3F4F6] pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="inline-flex h-[2.625rem] items-center justify-center rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed"
              style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !slotId || !examName.trim()}
              className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold text-white transition-colors duration-150 disabled:cursor-not-allowed"
              style={{
                background: pending || !slotId || !examName.trim() ? "#93C5FD" : "#2563EB",
                boxShadow:
                  pending || !slotId || !examName.trim()
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
        style={{ color: "#374151" }}
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
    <div className="flex items-center gap-3 px-4 py-3 sm:border-r sm:border-[#E4E8EF] last:sm:border-r-0">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: "#FFFFFF", color: "#2563EB", border: "1px solid #E4E8EF" }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase" style={{ color: "#94A3B8" }}>
          {label}
        </p>
        <p className="truncate text-sm font-semibold" style={{ color: "#111827" }}>
          {value}
        </p>
      </div>
    </div>
  );
}
