"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

interface Subject {
  id: string;
  name: string;
}

interface SubjectCommandPaletteProps {
  subjects: Subject[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function SubjectCommandPalette({
  subjects,
  value,
  onChange,
  placeholder = "Search subject…",
  disabled = false,
}: SubjectCommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered =
    query.trim() === ""
      ? subjects
      : subjects.filter((s) =>
          s.name.toLowerCase().includes(query.trim().toLowerCase()),
        );

  function openPalette() {
    if (disabled) return;
    setQuery("");
    setActiveIndex(0);
    setOpen(true);
  }

  function closePalette() {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }

  function select(name: string) {
    onChange(name);
    closePalette();
  }

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { closePalette(); return; }
      if (e.key === "ArrowDown") {
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        setActiveIndex((i) => Math.max(i - 1, 0));
        e.preventDefault();
      } else if (e.key === "Enter") {
        if (filtered[activeIndex]) select(filtered[activeIndex].name);
        e.preventDefault();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, filtered, activeIndex]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // fallback if no subjects seeded yet
  if (subjects.length === 0) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-[2.625rem] w-full rounded-[10px] bg-white px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow]"
        style={{ border: "1.5px solid #E4E8EF", color: "#111827" }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "#3B82F6";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "#E4E8EF";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
    );
  }

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={openPalette}
        disabled={disabled}
        className="flex h-[2.625rem] w-full items-center gap-2 rounded-[10px] bg-white px-3 text-left text-[0.9375rem] outline-none transition-[border-color,box-shadow] disabled:cursor-not-allowed"
        style={{
          border: "1.5px solid #E4E8EF",
          color: value ? "#111827" : "#9CA3AF",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "#3B82F6";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "#E4E8EF";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <Search size={14} style={{ color: "#9CA3AF", flexShrink: 0 }} />
        <span className="flex-1 truncate">{value || placeholder}</span>
        {value && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear"
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-slate-100"
            style={{ color: "#9CA3AF" }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onChange("");
            }}
          >
            <X size={11} strokeWidth={2.5} />
          </span>
        )}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) closePalette();
          }}
        >
          <div
            className="anim-scale-in mx-4 flex w-full max-w-[480px] flex-col overflow-hidden bg-white"
            style={{
              borderRadius: 18,
              border: "1px solid #E4E8EF",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            {/* Search input */}
            <div
              className="flex items-center gap-3 px-4"
              style={{ borderBottom: "1px solid #E4E8EF" }}
            >
              <Search size={16} style={{ color: "#9CA3AF", flexShrink: 0 }} />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search subjects…"
                className="h-12 flex-1 bg-transparent text-[0.9375rem] outline-none"
                style={{ color: "#111827" }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-slate-100"
                  style={{ color: "#9CA3AF" }}
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              )}
            </div>

            {/* Results list */}
            {filtered.length > 0 ? (
              <ul
                ref={listRef}
                role="listbox"
                style={{ maxHeight: 360, overflowY: "auto", padding: "6px 0" }}
              >
                {filtered.map((subject, index) => (
                  <li
                    key={subject.id}
                    role="option"
                    aria-selected={index === activeIndex}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      select(subject.name);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className="mx-1.5 flex cursor-pointer items-center rounded-[8px] px-3 py-2 text-[0.9375rem] transition-colors duration-75"
                    style={{
                      color: "#111827",
                      background: index === activeIndex ? "#EEF4FF" : "transparent",
                    }}
                  >
                    {subject.name}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-8 text-center text-sm" style={{ color: "#9CA3AF" }}>
                No subjects match &ldquo;{query}&rdquo;
              </div>
            )}

            {/* Footer */}
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ borderTop: "1px solid #E4E8EF" }}
            >
              <span className="text-xs" style={{ color: "#9CA3AF" }}>
                {filtered.length} subject{filtered.length !== 1 ? "s" : ""}
                {query ? ` matching "${query}"` : ""}
              </span>
              <span className="text-xs" style={{ color: "#9CA3AF" }}>
                Esc to close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
