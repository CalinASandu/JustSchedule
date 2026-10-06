import { useState } from "react";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import { removeSchoolSubject, upsertSchoolSubject } from "./api";
import type { SchoolSubject } from "./types";

type SettingsSubjectsPanelProps = {
  schoolId: string;
  initialSubjects: SchoolSubject[];
};

function normalizeSubjectName(value: string) {
  return value.trim().toLowerCase();
}

export function SettingsSubjectsPanel({
  schoolId,
  initialSubjects,
}: SettingsSubjectsPanelProps) {
  const [subjects, setSubjects] = useState<SchoolSubject[]>(initialSubjects);
  const [query, setQuery] = useState("");
  const [subjectState, setSubjectState] = useState<{
    error: string | null;
    // "add" while adding, or the subject id being removed.
    pendingKey: string | null;
  }>({ error: null, pendingKey: null });

  const trimmedQuery = query.trim();
  const normalizedQuery = normalizeSubjectName(query);
  const matchingSubjects = normalizedQuery
    ? subjects.filter((subject) => normalizeSubjectName(subject.name).includes(normalizedQuery))
    : subjects;
  const hasExactMatch = subjects.some(
    (subject) => normalizeSubjectName(subject.name) === normalizedQuery,
  );
  const canAdd = trimmedQuery.length > 0 && !hasExactMatch;
  const pending = subjectState.pendingKey !== null;

  async function addSubject() {
    if (!canAdd || pending) return;

    setSubjectState({ error: null, pendingKey: "add" });
    const result = await upsertSchoolSubject({ schoolId, name: trimmedQuery });

    if (result.error) {
      setSubjectState({ error: result.error, pendingKey: null });
      return;
    }

    if (!result.data) {
      setSubjectState({ error: "Could not add subject. Try again.", pendingKey: null });
      return;
    }

    const addedSubject = result.data;
    setSubjects((prev) =>
      [...prev.filter((subject) => subject.id !== addedSubject.id), addedSubject].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
    setQuery("");
    setSubjectState({ error: null, pendingKey: null });
  }

  async function removeSubject(id: string) {
    setSubjectState({ error: null, pendingKey: id });
    const result = await removeSchoolSubject({ schoolId, subjectId: id });

    if (result.error) {
      setSubjectState({ error: result.error, pendingKey: null });
      return;
    }

    setSubjects((prev) => prev.filter((subject) => subject.id !== id));
    setSubjectState({ error: null, pendingKey: null });
  }

  return (
    <div
      className="rounded-[10px] border p-4"
      style={{ background: "var(--surface-panel)", borderColor: "var(--border-default)" }}
    >
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <p className="mb-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Subjects
          </p>
          <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Students select from these subjects when scheduling an exam.
          </p>
        </div>
        <span className="shrink-0 text-sm tabular-nums" style={{ color: "var(--text-muted)" }}>
          {subjects.length} {subjects.length === 1 ? "subject" : "subjects"}
        </span>
      </div>

      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--text-muted)" }}
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addSubject();
            }
          }}
          placeholder="Search or add a subject…"
          aria-label="Search or add a subject"
          aria-controls="subject-results"
          autoComplete="off"
          className="h-[2.625rem] w-full min-w-0 rounded-[10px] pl-9 pr-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow] focus-visible:border-[var(--accent-color)]"
          style={{
            background: "var(--surface-panel)",
            border: "1.5px solid var(--border-default)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      <ul
        id="subject-results"
        className="mt-2 max-h-[22rem] overflow-y-auto overscroll-contain rounded-[10px] border"
        style={{ borderColor: "var(--border-default)" }}
        aria-label="Subjects"
      >
        {canAdd && (
          <li>
            <button
              type="button"
              onClick={addSubject}
              disabled={pending}
              className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-semibold transition-colors duration-150 hover:bg-[var(--accent-subtle)] disabled:cursor-not-allowed"
              style={{ color: "var(--accent-strong)" }}
            >
              {subjectState.pendingKey === "add" ? (
                <Loader2 size={15} className="shrink-0 animate-spin" />
              ) : (
                <Plus size={15} strokeWidth={2.2} className="shrink-0" />
              )}
              <span className="min-w-0 truncate">Add &ldquo;{trimmedQuery}&rdquo;</span>
            </button>
          </li>
        )}

        {matchingSubjects.map((subject, index) => {
          const removing = subjectState.pendingKey === subject.id;

          return (
            <li
              key={subject.id}
              className={
                index > 0 || canAdd ? "border-t border-[var(--border-subtle)]" : undefined
              }
            >
              <div className="flex min-h-11 items-center justify-between gap-3 px-3 py-1.5">
                <span className="min-w-0 truncate text-sm" style={{ color: "var(--text-body)" }}>
                  {subject.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeSubject(subject.id)}
                  disabled={pending}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] px-2.5 text-[0.8125rem] font-medium transition-colors duration-150 hover:bg-[var(--danger-subtle)] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ color: "var(--danger)" }}
                  aria-label={`Remove ${subject.name}`}
                >
                  {removing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  Remove
                </button>
              </div>
            </li>
          );
        })}

        {matchingSubjects.length === 0 && !canAdd && (
          <li className="px-3 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
            No subjects yet. Type a name above to add one.
          </li>
        )}
      </ul>

      {subjectState.error && (
        <p
          className="anim-fade-in mt-3 rounded-lg px-3 py-2 text-[0.8125rem]"
          style={{
            background: "var(--danger-subtle)",
            border: "1px solid var(--danger-border)",
            color: "var(--danger)",
          }}
          role="alert"
        >
          {subjectState.error}
        </p>
      )}
    </div>
  );
}
