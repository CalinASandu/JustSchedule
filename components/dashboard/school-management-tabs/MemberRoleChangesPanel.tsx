import { Check, Loader2 } from "lucide-react";
import type { SchoolMember, SchoolRole } from "./types";

type MemberRoleChangesPanelProps = {
  pendingRoleChanges: { member: SchoolMember; nextRole: SchoolRole }[];
  pending: boolean;
  onClear: () => void;
  onConfirm: () => void;
};

export function MemberRoleChangesPanel({
  pendingRoleChanges,
  pending,
  onClear,
  onConfirm,
}: MemberRoleChangesPanelProps) {
  return (
    <div className="anim-fade-in mb-4 rounded-[10px] border border-[#E4E8EF] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: "#111827" }}>
            Pending role changes
          </p>
          <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
            {pendingRoleChanges.length} member{pendingRoleChanges.length === 1 ? "" : "s"} will
            be updated.
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onClear}
            disabled={pending}
            className="inline-flex h-[2.625rem] items-center justify-center rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed"
            style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold text-white transition-colors duration-150 disabled:cursor-not-allowed"
            style={{
              background: pending ? "#93C5FD" : "#2563EB",
              boxShadow: pending
                ? "none"
                : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
            }}
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Confirm changes
          </button>
        </div>
      </div>
    </div>
  );
}
