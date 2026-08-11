"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/useTheme";
import type { Theme } from "@/lib/theme";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function ThemeToggle() {
  const { theme, mounted, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const active = OPTIONS.find((option) => option.value === theme) ?? OPTIONS[2];
  const ActiveIcon = active.icon;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] hover:bg-[var(--surface-subtle)]"
        style={{
          border: "1px solid var(--border-default)",
          color: "var(--text-secondary)",
        }}
        aria-label={mounted ? `Theme: ${active.label}` : "Theme"}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {/* Neutral until hydrated: the stored preference lives in a cookie
            the server never reads, so the icon would otherwise mismatch. */}
        {mounted ? (
          <ActiveIcon size={16} aria-hidden="true" />
        ) : (
          <span className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Theme"
          className="panel anim-scale-in absolute right-0 top-[calc(100%+6px)] z-50 w-[168px] overflow-hidden p-1"
          style={{ boxShadow: "var(--shadow-dialog)" }}
        >
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = mounted && theme === option.value;

            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setTheme(option.value);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] hover:bg-[var(--surface-subtle)]"
                style={{
                  background: selected ? "var(--accent-subtle)" : undefined,
                  color: selected ? "var(--accent-strong)" : "var(--text-secondary)",
                }}
              >
                <Icon size={15} aria-hidden="true" />
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
