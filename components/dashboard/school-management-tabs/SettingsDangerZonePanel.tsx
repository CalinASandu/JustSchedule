import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { softDeleteSchool } from "./api";
import { ErrorBanner } from "./shared";

type SettingsDangerZonePanelProps = {
  schoolId: string;
  schoolName: string;
};

export function SettingsDangerZonePanel({
  schoolId,
  schoolName,
}: SettingsDangerZonePanelProps) {
  const router = useRouter();
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteState, setDeleteState] = useState<{ error: string | null; pending: boolean }>({
    error: null,
    pending: false,
  });

  async function deleteSchool() {
    if (deleteConfirmation !== schoolName) {
      setDeleteState({ error: "Type the school name exactly before deleting.", pending: false });
      return;
    }

    setDeleteState({ error: null, pending: true });
    const result = await softDeleteSchool(schoolId);

    if (result.error) {
      setDeleteState({ error: result.error, pending: false });
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div
      className="rounded-[10px] border p-4"
      style={{ background: "var(--surface-panel)", borderColor: "var(--danger-border)" }}
    >
      <div className="mb-4 flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--danger-subtle)" }}
        >
          <Trash2 size={16} color="var(--danger)" strokeWidth={1.8} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Delete school
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
            This disables {schoolName} and preserves dependent records for audit history.
            Type the school name exactly to confirm.
          </p>
        </div>
      </div>

      {deleteState.error && <ErrorBanner message={deleteState.error} />}

      <label
        htmlFor="delete-school-confirmation"
        className="mb-1.5 block text-[0.8125rem] font-medium"
        style={{ color: "var(--text-body)" }}
      >
        School name
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="delete-school-confirmation"
          type="text"
          value={deleteConfirmation}
          onChange={(event) => setDeleteConfirmation(event.target.value)}
          placeholder={schoolName}
          className="h-[2.625rem] min-w-0 flex-1 rounded-[10px] px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow]"
          style={{
            background: "var(--surface-panel)",
            border: "1.5px solid var(--border-default)",
            color: "var(--text-primary)",
          }}
        />
        <button
          type="button"
          onClick={deleteSchool}
          disabled={deleteState.pending || deleteConfirmation !== schoolName}
          className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 disabled:cursor-not-allowed"
          style={{
            color: "var(--text-on-accent)",
            background:
              deleteState.pending || deleteConfirmation !== schoolName
                ? "var(--accent-disabled)"
                : "var(--accent-color)",
            boxShadow:
              deleteState.pending || deleteConfirmation !== schoolName
                ? "none"
                : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
          }}
        >
          {deleteState.pending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          Delete school
        </button>
      </div>
    </div>
  );
}
