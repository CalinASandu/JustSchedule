import { useState } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { removeSchoolSubject, softDeleteSchool, upsertSchoolSubject } from "./api";
import { ErrorBanner } from "./shared";
import type { SchoolSubject } from "./types";

type SettingsTabProps = {
  schoolId: string;
  schoolName: string;
  initialSubjects: SchoolSubject[];
};

export function SettingsTab({
  schoolId,
  schoolName,
  initialSubjects,
}: SettingsTabProps) {
  const router = useRouter();
  const [subjects, setSubjects] = useState<SchoolSubject[]>(initialSubjects);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [subjectState, setSubjectState] = useState<{
    error: string | null;
    success: string | null;
    pending: boolean;
  }>({ error: null, success: null, pending: false });
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteState, setDeleteState] = useState<{ error: string | null; pending: boolean }>({
    error: null,
    pending: false,
  });

  async function addSubject() {
    const name = newSubjectName.trim();
    if (!name) return;

    setSubjectState({ error: null, success: null, pending: true });
    const result = await upsertSchoolSubject({ schoolId, name });

    if (result.error) {
      setSubjectState({ error: result.error, success: null, pending: false });
      return;
    }

    if (!result.data) {
      setSubjectState({ error: "Could not add subject. Try again.", success: null, pending: false });
      return;
    }

    const addedSubject = result.data;
    setSubjects((prev) =>
      [...prev.filter((subject) => subject.id !== addedSubject.id), addedSubject].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
    setNewSubjectName("");
    setSubjectState({ error: null, success: null, pending: false });
  }

  async function removeSubject(id: string) {
    setSubjectState({ error: null, success: null, pending: true });
    const result = await removeSchoolSubject({ schoolId, subjectId: id });

    if (result.error) {
      setSubjectState({ error: result.error, success: null, pending: false });
      return;
    }

    setSubjects((prev) => prev.filter((subject) => subject.id !== id));
    setSubjectState({ error: null, success: null, pending: false });
  }

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
    <div className="p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold" style={{ color: "#111827" }}>
          School settings
        </h2>
        <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
          Manage subjects and school configuration.
        </p>
      </div>

      <div
        className="mb-5 rounded-[10px] border p-4"
        style={{ background: "#FFFFFF", borderColor: "#E4E8EF" }}
      >
        <p className="mb-1 text-sm font-semibold" style={{ color: "#111827" }}>
          Subjects
        </p>
        <p
          className="mb-4 text-sm"
          style={{ color: "#6B7280", lineHeight: 1.5 }}
        >
          Students select from these subjects when scheduling an exam.
        </p>

        {subjects.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {subjects.map((subject) => (
              <span
                key={subject.id}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
                style={{
                  background: "#F0F5FF",
                  color: "#1D4ED8",
                  border: "1px solid #DBEAFE",
                }}
              >
                {subject.name}
                <button
                  type="button"
                  onClick={() => removeSubject(subject.id)}
                  disabled={subjectState.pending}
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-blue-200 disabled:cursor-not-allowed"
                  aria-label={`Remove ${subject.name}`}
                >
                  <X size={10} strokeWidth={2.5} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm" style={{ color: "#9CA3AF" }}>
            No subjects yet. Add one below.
          </p>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newSubjectName}
            onChange={(event) => setNewSubjectName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addSubject();
              }
            }}
            placeholder="Add a subject..."
            disabled={subjectState.pending}
            className="h-[2.625rem] flex-1 rounded-[10px] bg-white px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow] disabled:cursor-not-allowed"
            style={{ border: "1.5px solid #E4E8EF", color: "#111827" }}
            onFocus={(event) => {
              event.currentTarget.style.borderColor = "#3B82F6";
              event.currentTarget.style.boxShadow =
                "0 0 0 3px rgba(59,130,246,0.12)";
            }}
            onBlur={(event) => {
              event.currentTarget.style.borderColor = "#E4E8EF";
              event.currentTarget.style.boxShadow = "none";
            }}
          />
          <button
            type="button"
            onClick={addSubject}
            disabled={subjectState.pending || !newSubjectName.trim()}
            className="inline-flex h-[2.625rem] items-center gap-1.5 rounded-[10px] px-4 text-[0.9375rem] font-semibold text-white transition-colors duration-150 disabled:cursor-not-allowed"
            style={{
              background:
                subjectState.pending || !newSubjectName.trim()
                  ? "#93C5FD"
                  : "#2563EB",
              boxShadow:
                "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
            }}
            onMouseEnter={(event) => {
              if (!subjectState.pending && newSubjectName.trim()) {
                event.currentTarget.style.background = "#1D4ED8";
              }
            }}
            onMouseLeave={(event) => {
              if (!subjectState.pending && newSubjectName.trim()) {
                event.currentTarget.style.background = "#2563EB";
              }
            }}
          >
            {subjectState.pending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Plus size={15} strokeWidth={2.2} />
            )}
            Add
          </button>
        </div>

        {subjectState.error && (
          <p
            className="anim-fade-in mt-3 rounded-lg px-3 py-2 text-[0.8125rem]"
            style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#DC2626",
            }}
          >
            {subjectState.error}
          </p>
        )}
      </div>

      <div
        className="rounded-[10px] border p-4"
        style={{ background: "#FFFFFF", borderColor: "#FECACA" }}
      >
        <div className="mb-4 flex items-start gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ background: "#FEF2F2" }}
          >
            <Trash2 size={16} color="#DC2626" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#111827" }}>
              Delete school
            </p>
            <p
              className="mt-1 text-sm"
              style={{ color: "#6B7280", lineHeight: 1.5 }}
            >
              This permanently deletes {schoolName}. Type the school name
              exactly to confirm.
            </p>
          </div>
        </div>

        {deleteState.error && <ErrorBanner message={deleteState.error} />}

        <label
          htmlFor="delete-school-confirmation"
          className="mb-1.5 block text-[0.8125rem] font-medium"
          style={{ color: "#374151" }}
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
            className="h-[2.625rem] min-w-0 flex-1 rounded-[10px] bg-white px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow]"
            style={{ border: "1.5px solid #E4E8EF", color: "#111827" }}
            onFocus={(event) => {
              event.currentTarget.style.borderColor = "#3B82F6";
              event.currentTarget.style.boxShadow =
                "0 0 0 3px rgba(59,130,246,0.12)";
            }}
            onBlur={(event) => {
              event.currentTarget.style.borderColor = "#E4E8EF";
              event.currentTarget.style.boxShadow = "none";
            }}
          />
          <button
            type="button"
            onClick={deleteSchool}
            disabled={deleteState.pending || deleteConfirmation !== schoolName}
            className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold text-white transition-colors duration-150 disabled:cursor-not-allowed"
            style={{
              background:
                deleteState.pending || deleteConfirmation !== schoolName
                  ? "#93C5FD"
                  : "#2563EB",
              boxShadow:
                deleteState.pending || deleteConfirmation !== schoolName
                  ? "none"
                  : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
            }}
          >
            {deleteState.pending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
            Delete school
          </button>
        </div>
      </div>
    </div>
  );
}
