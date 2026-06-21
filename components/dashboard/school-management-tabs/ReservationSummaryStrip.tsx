import type React from "react";
import { CalendarDays, Clock, UserRound } from "lucide-react";
import type { ExamSlot, Reservation, ReservationViewMode } from "./types";

type ReservationSummaryStripProps = {
  viewMode: ReservationViewMode;
  visibleReservations: Reservation[];
  dayReservations: Reservation[];
  weekReservations: Reservation[];
  examSlots: ExamSlot[];
};

export function ReservationSummaryStrip({
  viewMode,
  visibleReservations,
  dayReservations,
  weekReservations,
  examSlots,
}: ReservationSummaryStripProps) {
  const totalCapacity = examSlots.reduce((sum, slot) => sum + slot.capacity, 0);
  const activeReservations = viewMode === "day" ? dayReservations : weekReservations;
  const shownCapacity = viewMode === "day" ? totalCapacity : totalCapacity * 5;
  const utilization = shownCapacity > 0 ? Math.round((activeReservations.length / shownCapacity) * 100) : 0;

  return (
    <div className="mb-4 grid gap-3 lg:grid-cols-3">
      <SummaryCell
        icon={<CalendarDays size={16} />}
        label={viewMode === "day" ? "This day" : "This week"}
        value={`${activeReservations.length} confirmed`}
      />
      <SummaryCell
        icon={<Clock size={16} />}
        label="Active slots"
        value={`${examSlots.length} slot${examSlots.length === 1 ? "" : "s"}`}
      />
      <SummaryCell
        icon={<UserRound size={16} />}
        label="Capacity used"
        value={`${utilization}%`}
        detail={`${visibleReservations.length} loaded`}
      />
    </div>
  );
}

function SummaryCell({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-[10px] px-4 py-3"
      style={{ border: "1px solid #E4E8EF", background: "#FAFAFA" }}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase" style={{ color: "#94A3B8" }}>
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold" style={{ color: "#111827" }}>
          {value}
        </p>
        {detail && (
          <p className="mt-0.5 text-xs" style={{ color: "#9CA3AF" }}>
            {detail}
          </p>
        )}
      </div>
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: "#EFF6FF", color: "#2563EB" }}
      >
        {icon}
      </div>
    </div>
  );
}
