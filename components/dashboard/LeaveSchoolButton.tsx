"use client";

import { useEffect, useState } from "react";
import { LogOut, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUserFacingErrorMessage } from "@/lib/user-facing-errors";

export default function LeaveSchoolButton({
  membershipId,
  schoolName,
}: {
  membershipId: string;
  schoolName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(5);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || secondsRemaining === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSecondsRemaining((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [open, secondsRemaining]);

  function openDialog() {
    setOpen(true);
    setError(null);
    setSecondsRemaining(5);
  }

  function closeDialog() {
    if (pending) {
      return;
    }

    setOpen(false);
    setError(null);
    setSecondsRemaining(5);
  }

  async function leaveSchool() {
    if (secondsRemaining > 0) {
      return;
    }

    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("SchoolMembers")
      .delete()
      .eq("id", membershipId);

    if (deleteError) {
      console.error("Leave school failed", deleteError);
      setError(getUserFacingErrorMessage("schoolLeave", deleteError));
      setPending(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        disabled={pending}
        className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed disabled:opacity-70"
        style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
      >
        <LogOut size={16} />
        Leave school
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "var(--overlay-scrim)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-school-title"
        >
          <div
            className="panel w-full max-w-[420px] p-5"
            style={{ boxShadow: "var(--shadow-dialog)" }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="leave-school-title"
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Leave {schoolName}
                </h2>
                <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  You will lose access to this school&apos;s schedule until an admin approves a new request.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                disabled={pending}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed"
                style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
                aria-label="Close dialog"
              >
                <X size={15} />
              </button>
            </div>

            {error && (
              <p
                className="mb-4 text-[0.8125rem]"
                style={{
                  color: "var(--danger)",
                  background: "var(--danger-subtle)",
                  border: "1px solid var(--danger-border)",
                  borderRadius: 8,
                  padding: "0.5rem 0.75rem",
                }}
              >
                {error}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDialog}
                disabled={pending}
                className="inline-flex h-[2.625rem] items-center justify-center rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed"
                style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={leaveSchool}
                disabled={pending || secondsRemaining > 0}
                className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 disabled:cursor-not-allowed"
                style={{
                  color: "var(--text-on-accent)",
                  background:
                    pending || secondsRemaining > 0 ? "var(--accent-disabled)" : "var(--accent-color)",
                  boxShadow:
                    pending || secondsRemaining > 0
                      ? "none"
                      : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
                }}
              >
                {pending && <Loader2 size={16} className="animate-spin" />}
                {secondsRemaining > 0 ? `Confirm in ${secondsRemaining}s` : "Confirm Leave"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
