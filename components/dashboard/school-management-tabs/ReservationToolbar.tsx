import type React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { ReservationViewMode } from "./types";

type ReservationToolbarProps = {
  reservationDate: string;
  reservationViewMode: ReservationViewMode;
  reservationWeekDates: string[];
  setReservationDate: React.Dispatch<React.SetStateAction<string>>;
  setReservationViewMode: (mode: ReservationViewMode) => void;
  addDays: (dateKey: string, days: number) => string;
  formatReservationDate: (dateKey: string) => string;
};

export function ReservationToolbar({
  reservationDate,
  reservationViewMode,
  reservationWeekDates,
  setReservationDate,
  setReservationViewMode,
  addDays,
  formatReservationDate,
}: ReservationToolbarProps) {
  const rangeLabel =
    reservationViewMode === "day"
      ? formatReservationDate(reservationDate)
      : `${formatReservationDate(reservationWeekDates[0])} - ${formatReservationDate(
          reservationWeekDates[6],
        )}`;

  return (
    <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}
          >
            <CalendarDays size={17} />
          </div>
          <div className="min-w-0">
            <h2
              className="truncate text-[0.9375rem] font-semibold"
              style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
            >
              Reservations
            </h2>
            <p className="mt-0.5 truncate text-sm" style={{ color: "var(--text-secondary)" }}>
              {reservationViewMode === "day" ? "Daily slot load" : "Weekday agenda"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div
          className="flex w-full min-w-0 items-center gap-2 rounded-[12px] md:w-auto"
          style={{ background: "var(--surface-panel)" }}
        >
          <button
            type="button"
            onClick={() =>
              setReservationDate((current) =>
                addDays(current, reservationViewMode === "day" ? -1 : -7),
              )
            }
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-[var(--surface-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
            style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
            aria-label={
              reservationViewMode === "day" ? "Previous day" : "Previous week"
            }
          >
            <ChevronLeft size={16} />
          </button>
          <span
            className="min-w-0 flex-1 rounded-xl px-3 py-2 text-center text-sm font-semibold md:min-w-[210px]"
            style={{ border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
          >
            {rangeLabel}
          </span>
          <button
            type="button"
            onClick={() =>
              setReservationDate((current) =>
                addDays(current, reservationViewMode === "day" ? 1 : 7),
              )
            }
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-[var(--surface-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
            style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
            aria-label={
              reservationViewMode === "day" ? "Next day" : "Next week"
            }
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div
          className="flex w-full rounded-xl p-1 md:w-fit"
          style={{ border: "1px solid var(--border-default)", background: "var(--surface-alt)" }}
          role="group"
          aria-label="Reservation view"
        >
          {(["day", "week"] as ReservationViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setReservationViewMode(mode)}
              className="h-9 flex-1 rounded-[10px] px-3 text-sm font-semibold capitalize transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] md:flex-none"
              style={
                reservationViewMode === mode
                  ? {
                      background: "var(--surface-panel)",
                      color: "var(--accent-strong)",
                      border: "1px solid var(--accent-border)",
                    }
                  : {
                      background: "transparent",
                      color: "var(--text-secondary)",
                      border: "1px solid transparent",
                    }
              }
            >
              {mode}
            </button>
          ))}
      </div>
    </div>
    </div>
  );
}
