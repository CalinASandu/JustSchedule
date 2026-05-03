"use client";

import { useActionState } from "react";
import { Check, Loader2, Send } from "lucide-react";
import { requestSchoolJoin, type JoinSchoolState } from "@/app/invite/actions";

const initialState: JoinSchoolState = {
  error: null,
  success: false,
};

export default function JoinRequestForm({ inviteToken }: { inviteToken: string }) {
  const [state, formAction, pending] = useActionState(requestSchoolJoin, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="inviteToken" value={inviteToken} />
      <button
        type="submit"
        disabled={pending || state.success}
        className="inline-flex h-[2.625rem] w-full items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold text-white transition-colors duration-150 disabled:cursor-not-allowed"
        style={{
          background: pending || state.success ? "#93C5FD" : "#2563EB",
          boxShadow:
            pending || state.success
              ? "none"
              : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
        }}
      >
        {pending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : state.success ? (
          <Check size={16} />
        ) : (
          <Send size={16} />
        )}
        {state.success ? "Request sent" : "Request to join"}
      </button>

      {state.error && (
        <p
          className="anim-fade-in text-[0.8125rem]"
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

      {state.success && (
        <p className="anim-fade-in text-[0.8125rem] font-medium" style={{ color: "#1D4ED8" }}>
          Your request is waiting for admin approval.
        </p>
      )}
    </form>
  );
}
