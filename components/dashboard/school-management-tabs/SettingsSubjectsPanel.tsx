import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { removeSchoolSubject, upsertSchoolSubject } from "./api";
import type { SchoolSubject } from "./types";

type SettingsSubjectsPanelProps = {
  schoolId: string;
  initialSubjects: SchoolSubject[];
};

export function SettingsSubjectsPanel({
  schoolId,
  initialSubjects,
}: SettingsSubjectsPanelProps) {
  const [subjects, setSubjects] = useState<SchoolSubject[]>(initialSubjects);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [subjectState, setSubjectState] = useState<{
    error: string | null;
    pending: boolean;
  }>({ error: null, pending: false });

  async function addSubject() {
    const name = newSubjectName.trim();
    if (!name) return;

    setSubjectState({ error: null, pending: true });
    const result = await upsertSchoolSubject({ schoolId, name });

    if (result.error) {
      setSubjectState({ error: result.error, pending: false });
      return;
    }

    if (!result.data) {
      setSubjectState({ error: "Could not add subject. Try again.", pending: false });
      return;
    }

    const addedSubject = result.data;
    setSubjects((prev) =>
      [...prev.filter((subject) => subject.id !== addedSubject.id), addedSubject].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
    setNewSubjectName("");
    setSubjectState({ error: null, pending: false });
  }

  async function removeSubject(id: string) {
    setSubjectState({ error: null, pending: true });
    const result = await removeSchoolSubject({ schoolId, subjectId: id });

    if (result.error) {
      setSubjectState({ error: result.error, pending: false });
      return;
    }

    setSubjects((prev) => prev.filter((subject) => subject.id !== id));
    setSubjectState({ error: null, pending: false });
  }

  return (
    <div
      className="rounded-[10px] border p-4"
      style={{ background: "#FFFFFF", borderColor: "#E4E8EF" }}
    >
      <p className="mb-1 text-sm font-semibold" style={{ color: "#111827" }}>
        Subjects
      </p>
      <p className="mb-4 text-sm" style={{ color: "#6B7280", lineHeight: 1.5 }}>
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

      <div className="flex flex-col gap-2 sm:flex-row">
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
          className="h-[2.625rem] min-w-0 flex-1 rounded-[10px] bg-white px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow] disabled:cursor-not-allowed"
          style={{ border: "1.5px solid #E4E8EF", color: "#111827" }}
        />
        <button
          type="button"
          onClick={addSubject}
          disabled={subjectState.pending || !newSubjectName.trim()}
          className="inline-flex h-[2.625rem] items-center justify-center gap-1.5 rounded-[10px] px-4 text-[0.9375rem] font-semibold text-white transition-colors duration-150 disabled:cursor-not-allowed"
          style={{
            background: subjectState.pending || !newSubjectName.trim() ? "#93C5FD" : "#2563EB",
            boxShadow:
              subjectState.pending || !newSubjectName.trim()
                ? "none"
                : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
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
  );
}
