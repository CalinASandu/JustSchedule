import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ClipboardCopy, Copy, X } from "lucide-react";
import { createPortal } from "react-dom";

type ReservationCopyExamsButtonProps = {
  /** One "Exam name, Type" line per reservation of the selected day, in slot order. */
  lines: string[];
  dateLabel: string;
};

/** Opens a dialog listing every exam taken on the selected day, with a copy action. */
export function ReservationCopyExamsButton({ lines, dateLabel }: ReservationCopyExamsButtonProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const isEmpty = lines.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isEmpty}
        title={isEmpty ? "No exams on this day" : undefined}
        className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors duration-150 hover:bg-[var(--surface-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent md:w-auto"
        style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
      >
        <ClipboardCopy size={15} />
        Copy exams
        {!isEmpty && (
          <span
            className="rounded-full px-1.5 text-xs font-semibold tabular-nums"
            style={{ background: "var(--surface-subtle)", color: "var(--text-muted)" }}
          >
            {lines.length}
          </span>
        )}
      </button>

      {open && (
        <CopyExamsDialog lines={lines} dateLabel={dateLabel} onClose={close} />
      )}
    </>
  );
}

function CopyExamsDialog({
  lines,
  dateLabel,
  onClose,
}: ReservationCopyExamsButtonProps & { onClose: () => void }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const dialogRef = useRef<HTMLDivElement>(null);
  const copyButtonRef = useRef<HTMLButtonElement>(null);

  // Focus the copy action, lock page scroll, close on Escape, keep Tab inside,
  // and hand focus back to the opener on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    copyButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    if (status === "idle") return;
    const timeout = window.setTimeout(() => setStatus("idle"), 1600);
    return () => window.clearTimeout(timeout);
  }, [status]);

  async function copyExams() {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "var(--overlay-scrim)" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="copy-exams-title"
        className="panel anim-scale-in flex max-h-[85vh] w-full max-w-[440px] flex-col p-5"
        style={{ boxShadow: "var(--shadow-dialog)" }}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              id="copy-exams-title"
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Exams on {dateLabel}
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {lines.length} exam{lines.length === 1 ? "" : "s"} across all time slots.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-[var(--surface-subtle)]"
            style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
            aria-label="Close dialog"
          >
            <X size={15} />
          </button>
        </div>

        <ol
          className="mb-4 min-h-0 flex-1 overflow-y-auto rounded-[10px] border py-1 text-sm"
          style={{
            background: "var(--surface-subtle)",
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
            overscrollBehavior: "contain",
          }}
        >
          {lines.map((line, index) => (
            <li
              key={index}
              className="px-3 py-1.5"
              style={index > 0 ? { borderTop: "1px solid var(--border-default)" } : undefined}
            >
              {line}
            </li>
          ))}
        </ol>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-[2.625rem] items-center justify-center rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 hover:bg-[var(--surface-subtle)]"
            style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
          >
            Close
          </button>
          <button
            ref={copyButtonRef}
            type="button"
            onClick={copyExams}
            aria-live="polite"
            className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] focus-visible:ring-offset-2"
            style={{
              color: "var(--text-on-accent)",
              background: status === "failed" ? "var(--danger)" : "var(--accent-color)",
            }}
          >
            {status === "copied" ? <Check size={16} /> : <Copy size={16} />}
            {status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : "Copy"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
