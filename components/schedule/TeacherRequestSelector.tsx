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
          style={{ color: "#9CA3AF" }}
          htmlFor={listboxId}
        >
          Professor
        </label>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
          style={{
            background: "#EFF6FF",
            color: "#1D4ED8",
            border: "1px solid #BFDBFE",
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
          background: disabled ? "#F8FAFC" : "#FFFFFF",
          border: open ? "1.5px solid #2563EB" : "1.5px solid #E4E8EF",
          boxShadow: open ? "0 0 0 3px rgba(59,130,246,0.12)" : "none",
          color: disabled ? "#9CA3AF" : "#111827",
        }}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-semibold"
            style={{
              background: disabled ? "#E5E7EB" : "#EFF6FF",
              color: disabled ? "#9CA3AF" : "#2563EB",
              border: "1px solid #E4E8EF",
            }}
          >
            {selectedTeacher ? getInitials(selectedTeacher.name) : <UserRound size={17} aria-hidden="true" />}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {selectedTeacher?.name ?? (disabled ? "No professors available" : "Choose a professor")}
            </span>
            <span className="mt-0.5 block truncate text-xs" style={{ color: "#6B7280" }}>
              {disabled
                ? "Ask an admin to add a professor before requesting."
                : "Receives the in-app notice for this request."}
            </span>
          </span>
        </span>

        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-active:scale-95"
          style={{ background: disabled ? "#F3F4F6" : "#F8FAFC", color: "#6B7280" }}
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
            background: "#FFFFFF",
            border: "1px solid #E4E8EF",
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
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                style={{
                  background: selected ? "#EFF6FF" : "#FFFFFF",
                  color: "#111827",
                }}
                onMouseEnter={(event) => {
                  if (!selected) event.currentTarget.style.background = "#F8FAFC";
                }}
                onMouseLeave={(event) => {
                  if (!selected) event.currentTarget.style.background = "#FFFFFF";
                }}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold"
                    style={{
                      background: selected ? "#DBEAFE" : "#F8FAFC",
                      color: selected ? "#1D4ED8" : "#6B7280",
                      border: "1px solid #E4E8EF",
                    }}
                  >
                    {getInitials(teacher.name)}
                  </span>
                  <span className="truncate text-sm font-medium">{teacher.name}</span>
                </span>
                {selected && <Check size={16} aria-hidden="true" style={{ color: "#2563EB" }} />}
              </button>
            );
          })}
        </div>
      )}

      <p className="text-xs" style={{ color: "#9CA3AF" }}>
        Admins can still review this request, but only this professor receives a notice.
      </p>
    </div>
  );
}
