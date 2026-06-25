"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

interface Subject {
  id: string;
  name: string;
}

interface SubjectCommandPaletteProps {
  id?: string;
  subjects: Subject[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function SubjectCommandPalette({
  id,
  subjects,
  value,
  onChange,
  placeholder = "Search subject…",
  disabled = false,
}: SubjectCommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const generatedListboxId = useId();
  const listboxId = `${generatedListboxId}-subjects`;
  const query = value;

  const filtered = useMemo(
    () =>
      query.trim() === ""
        ? subjects
        : subjects.filter((s) =>
            s.name.toLowerCase().includes(query.trim().toLowerCase()),
          ),
    [query, subjects],
  );

  function openPalette() {
    if (disabled) return;
    setActiveIndex(0);
    setOpen(true);
  }

  function closePalette() {
    setOpen(false);
    setActiveIndex(0);
  }

  function select(name: string) {
    onChange(name);
    closePalette();
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current?.contains(event.target as Node)) {
        return;
      }

      closePalette();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      closePalette();
      return;
    }

    if (event.key === "ArrowDown") {
      if (!open) {
        openPalette();
      } else {
        setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
      }
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowUp") {
      setActiveIndex((index) => Math.max(index - 1, 0));
      event.preventDefault();
      return;
    }

    if (event.key === "Enter" && open) {
      if (filtered[activeIndex]) {
        select(filtered[activeIndex].name);
      }
      event.preventDefault();
    }
  }

  // fallback if no subjects seeded yet
  if (subjects.length === 0) {
    return (
      <input
        id={id}
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
    <div ref={containerRef} className="relative">
      <Search
        size={14}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
        style={{ color: "#9CA3AF" }}
      />
      <input
        id={id}
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={(event) => {
          openPalette();
          event.currentTarget.select();
          event.currentTarget.style.borderColor = "#3B82F6";
          event.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)";
        }}
        onClick={openPalette}
        onBlur={(event) => {
          event.currentTarget.style.borderColor = "#E4E8EF";
          event.currentTarget.style.boxShadow = "none";
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="h-[2.625rem] w-full rounded-[10px] bg-white py-0 pl-9 pr-9 text-[0.9375rem] outline-none transition-[border-color,box-shadow] disabled:cursor-not-allowed"
        style={{
          border: "1.5px solid #E4E8EF",
          color: disabled ? "#9CA3AF" : "#111827",
        }}
      />
      {value && !disabled && (
        <button
          type="button"
          aria-label="Clear subject"
          className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full transition-colors hover:bg-slate-100"
          style={{ color: "#9CA3AF" }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onChange("");
            setActiveIndex(0);
            setOpen(true);
            inputRef.current?.focus();
          }}
        >
          <X size={12} strokeWidth={2.4} />
        </button>
      )}

      {open && (
        <div
          className="anim-scale-in absolute left-0 right-0 top-[calc(100%+0.375rem)] z-[80] overflow-hidden rounded-[10px] bg-white"
          style={{
            border: "1px solid #E4E8EF",
            boxShadow: "0 14px 36px rgba(15,23,42,0.14)",
          }}
        >
          {filtered.length > 0 ? (
            <ul
              id={listboxId}
              ref={listRef}
              role="listbox"
              className="h-[12.5rem] overscroll-contain overflow-y-auto p-1.5"
              style={{ scrollbarGutter: "stable" }}
            >
              {filtered.map((subject, index) => (
                <li
                  key={subject.id}
                  role="option"
                  aria-selected={index === activeIndex}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    select(subject.name);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className="flex cursor-pointer items-center rounded-[8px] px-3 py-2 text-[0.9375rem] transition-colors duration-75"
                  style={{
                    color: "#111827",
                    background: index === activeIndex ? "#EEF4FF" : "transparent",
                  }}
                >
                  <span className="truncate">{subject.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div
              className="flex h-[12.5rem] items-center px-3 py-3 text-sm"
              style={{ color: "#9CA3AF" }}
            >
              No subjects match &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
