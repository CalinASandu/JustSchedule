"use client";

import { useId, useMemo, useState } from "react";
import { Check, ChevronDown, Mail, UserRound } from "lucide-react";
import type { TeacherOption } from "./types";

interface TeacherRequestSelectorProps {
  teachers: TeacherOption[];
  selectedTeacherId: string;
  onTeacherChange: (teacherId: string) => void;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "P";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return `${first}${second}`.toUpperCase();
}

export default function TeacherRequestSelector({
  teachers,
  selectedTeacherId,
  onTeacherChange,
}: TeacherRequestSelectorProps) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const selectedTeacher = useMemo(
    () => teachers.find((teacher) => teacher.userId === selectedTeacherId) ?? null,
    [selectedTeacherId, teachers],
  );
  const disabled = teachers.length === 0;

  return (
    <div
      className="relative flex flex-col gap-2"
      onBlur={(event) => {
        const nextFocus = event.relatedTarget;

        if (!nextFocus || !event.currentTarget.contains(nextFocus as Node)) {
          setOpen(false);
        }
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <label
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
          htmlFor={listboxId}
        >
          Professor
        </label>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
          style={{
            background: "var(--accent-subtle)",
            color: "var(--accent-strong)",
            border: "1px solid var(--accent-border)",
          }}
        >
          <Mail size={12} aria-hidden="true" />
          Approval request
        </span>
      </div>

      <button
        id={listboxId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="group flex min-h-[4.25rem] w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left outline-none transition-[border-color,box-shadow,background,transform] duration-200 focus-visible:ring-0 disabled:cursor-not-allowed"
        style={{
          background: disabled ? "var(--surface-alt)" : "var(--surface-panel)",
          border: open ? "1.5px solid var(--accent-color)" : "1.5px solid var(--border-default)",
          boxShadow: open ? "0 0 0 3px rgba(59,130,246,0.12)" : "none",
          color: disabled ? "var(--text-muted)" : "var(--text-primary)",
        }}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-semibold"
            style={{
              background: disabled ? "var(--surface-subtle)" : "var(--accent-subtle)",
              color: disabled ? "var(--text-muted)" : "var(--accent-color)",
              border: "1px solid var(--border-default)",
            }}
          >
            {selectedTeacher ? getInitials(selectedTeacher.name) : <UserRound size={17} aria-hidden="true" />}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {selectedTeacher?.name ?? (disabled ? "No professors available" : "Choose a professor")}
            </span>
            <span className="mt-0.5 block truncate text-xs" style={{ color: "var(--text-secondary)" }}>
              {disabled
                ? "Ask an admin to add a professor before requesting."
                : "Receives the in-app notice for this request."}
            </span>
          </span>
        </span>

        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-active:scale-95"
          style={{ background: disabled ? "var(--surface-subtle)" : "var(--surface-alt)", color: "var(--text-secondary)" }}
        >
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && !disabled && (
        <div
          role="listbox"
          aria-label="Professor"
          className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-xl p-1.5 anim-scale-in"
          style={{
            background: "var(--surface-panel)",
            border: "1px solid var(--border-default)",
            boxShadow: "0 18px 42px rgba(15,23,42,0.12)",
          }}
        >
          {teachers.map((teacher) => {
            const selected = teacher.userId === selectedTeacherId;

            return (
              <button
                key={teacher.userId}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onTeacherChange(teacher.userId);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
                style={{
                  background: selected ? "var(--accent-subtle)" : "var(--surface-panel)",
                  color: "var(--text-primary)",
                }}
                onMouseEnter={(event) => {
                  if (!selected) event.currentTarget.style.background = "var(--surface-alt)";
                }}
                onMouseLeave={(event) => {
                  if (!selected) event.currentTarget.style.background = "var(--surface-panel)";
                }}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold"
                    style={{
                      background: selected ? "var(--accent-muted)" : "var(--surface-alt)",
                      color: selected ? "var(--accent-strong)" : "var(--text-secondary)",
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    {getInitials(teacher.name)}
                  </span>
                  <span className="truncate text-sm font-medium">{teacher.name}</span>
                </span>
                {selected && <Check size={16} aria-hidden="true" style={{ color: "var(--accent-color)" }} />}
              </button>
            );
          })}
        </div>
      )}

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Admins can still review this request, but only this professor receives a notice.
      </p>
    </div>
  );
}
