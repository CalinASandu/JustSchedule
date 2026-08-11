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
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "var(--overlay-scrim)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-reservation-title"
    >
      <div className="panel w-full max-w-[420px] p-5" style={{ boxShadow: "var(--shadow-dialog)" }}>
        <div className="mb-4 flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "var(--danger-subtle)" }}
          >
            <Ban size={18} color="var(--danger)" strokeWidth={1.9} />
          </div>
          <div>
            <h3
              id="cancel-reservation-title"
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Cancel reservation
            </h3>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
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
            className="inline-flex h-10 items-center justify-center rounded-[10px] px-4 text-sm font-semibold transition-colors duration-150 hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed"
            style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
          >
            Keep
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-semibold transition-colors duration-150 hover:bg-[var(--danger-subtle)] disabled:cursor-not-allowed"
            style={{ border: "1px solid var(--danger-border)", color: "var(--danger)" }}
          >
            {pending ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}
            Cancel reservation
          </button>
        </div>
      </div>
    </div>
  );
}
