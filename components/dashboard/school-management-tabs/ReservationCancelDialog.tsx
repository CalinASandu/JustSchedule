import { Ban, Loader2 } from "lucide-react";
import { ErrorBanner } from "./shared";
import type { Reservation } from "./types";

type ReservationCancelDialogProps = {
  reservation: Reservation;
  studentName: string;
  error: string | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ReservationCancelDialog({
  reservation,
  studentName,
  error,
  pending,
  onClose,
  onConfirm,
}: ReservationCancelDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-reservation-title"
    >
      <div className="panel w-full max-w-[420px] p-5 shadow-[0_18px_60px_rgba(15,23,42,0.18)]">
        <div className="mb-4 flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "#FEF2F2" }}
          >
            <Ban size={18} color="#DC2626" strokeWidth={1.9} />
          </div>
          <div>
            <h3 id="cancel-reservation-title" className="text-sm font-semibold" style={{ color: "#111827" }}>
              Cancel reservation
            </h3>
            <p className="mt-1 text-sm" style={{ color: "#6B7280", lineHeight: 1.5 }}>
              This will cancel {reservation.examName} for {studentName}.
            </p>
          </div>
        </div>

        {error && <ErrorBanner message={error} />}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex h-10 items-center justify-center rounded-[10px] px-4 text-sm font-semibold transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed"
            style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
          >
            Keep
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-semibold transition-colors duration-150 hover:bg-red-50 disabled:cursor-not-allowed"
            style={{ border: "1px solid #FECACA", color: "#DC2626" }}
          >
            {pending ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}
            Cancel reservation
          </button>
        </div>
      </div>
    </div>
  );
}
