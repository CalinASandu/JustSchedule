import { Loader2, X } from "lucide-react";
import { createPortal } from "react-dom";
import { ErrorBanner } from "./shared";
import type { SchoolMember } from "./types";

type MemberKickDialogProps = {
  schoolName: string;
  member: SchoolMember;
  secondsRemaining: number;
  state: { error: string | null; pending: boolean };
  onClose: () => void;
  onConfirm: () => void;
};

export function MemberKickDialog({
  schoolName,
  member,
  secondsRemaining,
  state,
  onClose,
  onConfirm,
}: MemberKickDialogProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "var(--overlay-scrim)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="kick-student-title"
    >
      <div className="panel w-full max-w-[420px] p-5" style={{ boxShadow: "var(--shadow-dialog)" }}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2
              id="kick-student-title"
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Kick {member.name}
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
              This removes the member from {schoolName}. They will need a new approved join request
              to return.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={state.pending}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed"
            style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
            aria-label="Close dialog"
          >
            <X size={15} />
          </button>
        </div>

        {state.error && <ErrorBanner message={state.error} />}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={state.pending}
            className="inline-flex h-[2.625rem] items-center justify-center rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed"
            style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={state.pending || secondsRemaining > 0}
            className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 disabled:cursor-not-allowed"
            style={{
              color: "var(--text-on-accent)",
              background:
                state.pending || secondsRemaining > 0 ? "var(--accent-disabled)" : "var(--accent-color)",
              boxShadow:
                state.pending || secondsRemaining > 0
                  ? "none"
                  : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
            }}
          >
            {state.pending && <Loader2 size={16} className="animate-spin" />}
            {secondsRemaining > 0 ? `Confirm in ${secondsRemaining}s` : "Confirm Kick"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
