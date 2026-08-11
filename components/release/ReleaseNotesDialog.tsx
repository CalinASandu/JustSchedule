"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { RELEASE_ICONS, type Release } from "@/lib/release-notes";

const TITLE_ID = "whats-new-title";

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
};

function formatReleaseDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, DATE_FORMAT);
}

type ReleaseNotesDialogProps = {
  releases: Release[];
  onDismiss: () => void;
};

/**
 * Presentation only. It renders whatever releases it is handed and reports a
 * dismissal; deciding what is unseen and recording it belongs to the caller.
 */
export function ReleaseNotesDialog({ releases, onDismiss }: ReleaseNotesDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const showVersionHeadings = releases.length > 1;

  // Move focus into the dialog without targeting a control: autofocusing a
  // button on mobile can scroll the viewport and flash the tap highlight.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    cardRef.current?.focus();

    return () => {
      previouslyFocused?.focus?.();
    };
  }, []);

  // The page behind a modal must not scroll.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onDismiss();
        return;
      }

      if (event.key !== "Tab") return;

      const card = cardRef.current;
      if (!card) return;

      const focusable = Array.from(
        card.querySelectorAll<HTMLElement>("button:not([disabled])"),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === card)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onDismiss],
  );

  return createPortal(
    <div
      className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "var(--overlay-scrim)", overscrollBehavior: "contain" }}
      onClick={onDismiss}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        onClick={(event) => event.stopPropagation()}
        className="panel anim-scale-in flex max-h-[calc(100dvh-2rem)] w-full max-w-[440px] flex-col overflow-hidden p-5 outline-none"
        style={{ boxShadow: "var(--shadow-dialog)", touchAction: "manipulation" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              id={TITLE_ID}
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              What&rsquo;s new
            </h2>
            <p
              className="mt-1 text-sm break-words"
              style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}
            >
              {showVersionHeadings
                ? "Here is what has changed since you were last here."
                : releases[0].title}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-[var(--surface-subtle)]"
            style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
            aria-label="Close what's new"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        <div
          className="-mx-1 mt-4 min-h-0 flex-1 overflow-y-auto px-1"
          style={{ overscrollBehavior: "contain" }}
        >
          {releases.map((release, index) => (
            <section key={release.version} className={index > 0 ? "mt-5" : undefined}>
              {showVersionHeadings ? (
                <h3
                  className="mb-2 text-[11px] font-medium tracking-wide uppercase"
                  style={{ color: "var(--text-faint)" }}
                >
                  {release.title} &middot; {formatReleaseDate(release.date)}
                </h3>
              ) : null}

              <ul className="flex flex-col gap-3">
                {release.items.map((item) => {
                  const Icon = RELEASE_ICONS[item.icon];

                  return (
                    <li key={item.text} className="flex items-start gap-3">
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          background: "var(--surface-subtle)",
                          color: "var(--accent-color)",
                        }}
                      >
                        <Icon size={14} aria-hidden="true" />
                      </span>
                      <span
                        className="min-w-0 text-sm break-words"
                        style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}
                      >
                        {item.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-5 inline-flex h-[2.625rem] w-full items-center justify-center rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150"
          style={{
            color: "var(--text-on-accent)",
            background: "var(--accent-color)",
            boxShadow: "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
          }}
        >
          Got it
        </button>
      </div>
    </div>,
    document.body,
  );
}
