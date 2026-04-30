"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import { registerSchool, type RegisterSchoolState } from "@/app/dashboard/actions";

const initialState: RegisterSchoolState = {
  error: null,
  success: false,
};

export default function RegisterSchoolForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(registerSchool, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="space-y-3">
      <label
        htmlFor="schoolName"
        className="block text-[0.8125rem] font-medium"
        style={{ color: "#374151" }}
      >
        School name
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Building2
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            size={16}
            color="#9CA3AF"
            strokeWidth={1.8}
          />
          <input
            id="schoolName"
            name="schoolName"
            type="text"
            minLength={2}
            required
            placeholder="e.g. State University"
            className="h-[2.625rem] w-full rounded-[10px] bg-white pl-9 pr-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow] duration-150"
            style={{
              border: "1.5px solid #E4E8EF",
              color: "#111827",
            }}
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
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold text-white transition-colors duration-150 hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-[#93c5fd]"
          style={{
            background: pending ? "#93C5FD" : "#2563EB",
            boxShadow: pending
              ? "none"
              : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
          }}
        >
          {pending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          Register school
        </button>
      </div>

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
          School registered.
        </p>
      )}
    </form>
  );
}
