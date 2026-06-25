"use client";

import { useEffect, useId, useRef, useState } from "react";

interface Subject {
  id: string;
  name: string;
}

interface SubjectComboboxProps {
  subjects: Subject[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function SubjectCombobox({
  subjects,
  value,
  onChange,
  placeholder = "Search subject…",
  disabled = false,
}: SubjectComboboxProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const generatedListboxId = useId();
  const listboxId = `${generatedListboxId}-subjects`;
  const query = value;

  const filtered =
    query.trim() === ""
      ? subjects
      : subjects.filter((s) =>
          s.name.toLowerCase().includes(query.trim().toLowerCase()),
        );

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // Close on outside click
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function selectSubject(name: string) {
    onChange(name);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    onChange(v);
    setOpen(true);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setActiveIndex((i) => Math.max(i - 1, 0));
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && filtered[activeIndex]) {
        selectSubject(filtered[activeIndex].name);
      }
      e.preventDefault();
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  // If no subjects loaded, fall back to a plain text input
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
      />
    );
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => {
          setOpen(true);
          if (inputRef.current) {
            inputRef.current.style.borderColor = "#3B82F6";
            inputRef.current.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)";
          }
        }}
        onBlur={() => {
          if (inputRef.current) {
            inputRef.current.style.borderColor = "#E4E8EF";
            inputRef.current.style.boxShadow = "none";
          }
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
        className="h-[2.625rem] w-full rounded-[10px] bg-white px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow]"
        style={{
          border: "1.5px solid #E4E8EF",
          color: disabled ? "#9CA3AF" : "#111827",
          cursor: disabled ? "not-allowed" : "text",
        }}
      />

      {open && filtered.length > 0 && (
        <ul
          id={listboxId}
          ref={listRef}
          role="listbox"
          className="anim-scale-in"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "#FFFFFF",
            border: "1px solid #E4E8EF",
            borderRadius: 10,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            maxHeight: 220,
            overflowY: "auto",
            padding: "4px 0",
            margin: 0,
            listStyle: "none",
          }}
        >
          {filtered.map((subject, index) => (
            <li
              key={subject.id}
              role="option"
              aria-selected={index === activeIndex}
              onPointerDown={(e) => {
                e.preventDefault();
                selectSubject(subject.name);
              }}
              style={{
                padding: "8px 12px",
                fontSize: "0.9375rem",
                color: "#111827",
                cursor: "pointer",
                background: index === activeIndex ? "#F0F5FF" : "transparent",
                borderRadius: 6,
                margin: "0 4px",
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {subject.name}
            </li>
          ))}
        </ul>
      )}

      {open && filtered.length === 0 && query.trim() !== "" && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "#FFFFFF",
            border: "1px solid #E4E8EF",
            borderRadius: 10,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            padding: "10px 12px",
            fontSize: "0.875rem",
            color: "#9CA3AF",
          }}
        >
          No subjects match &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
