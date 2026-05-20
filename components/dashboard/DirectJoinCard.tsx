"use client";

import { useActionState } from "react";
import { Check, Loader2, Send } from "lucide-react";
import { requestDirectJoin, type DirectJoinState } from "@/app/dashboard/actions";

const initialState: DirectJoinState = {
  error: null,
  success: false,
};

type Props = {
  schoolId: string;
  schoolName: string;
  isPending: boolean;
};

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "JS"
  );
}

export default function DirectJoinCard({ schoolId, schoolName, isPending }: Props) {
  const [state, formAction, submitting] = useActionState(requestDirectJoin, initialState);

  const hasPending = isPending || state.success;

  return (
    <article className="panel flex min-h-[178px] flex-col justify-between p-5 anim-slide-up anim-d1">
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-semibold"
          style={{ background: "#EFF6FF", color: "#2563EB" }}
        >
          {getInitials(schoolName)}
        </div>
        <div>
          <h2 className="text-[0.9375rem] font-semibold" style={{ color: "#111827" }}>
            {schoolName}
          </h2>
          <p className="mt-1 text-xs" style={{ color: "#9CA3AF" }}>
            {hasPending ? "Request pending admin approval" : "You are not a member yet"}
          </p>
        </div>
      </div>

      <div className="mt-4">
        {hasPending ? (
          <div
            className="inline-flex h-[2.375rem] items-center gap-2 rounded-[10px] px-3 text-[0.8125rem] font-medium"
            style={{ background: "#EFF6FF", color: "#2563EB" }}
          >
            <Check size={14} />
            Request sent
          </div>
        ) : (
          <form action={formAction}>
            <input type="hidden" name="schoolId" value={schoolId} />
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-[2.375rem] items-center gap-2 rounded-[10px] px-4 text-[0.8125rem] font-semibold text-white transition-colors duration-150 disabled:cursor-not-allowed"
              style={{
                background: submitting ? "#93C5FD" : "#2563EB",
                boxShadow: submitting
                  ? "none"
                  : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
              }}
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Request to join
            </button>
          </form>
        )}

        {state.error && (
          <p
            className="anim-fade-in mt-2 text-[0.8125rem]"
            style={{
              color: "#DC2626",
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 8,
              padding: "0.5rem 0.75rem",
            }}
          >
            {state.error}
          </p>
        )}
      </div>
    </article>
  );
}
