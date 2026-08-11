import { Clock, UserRound } from "lucide-react";
import { ReservationActionMenu } from "./ReservationActionMenu";
import type { ExamSlot, Reservation, SchoolRole } from "./types";

type ReservationDayViewProps = {
  examSlots: ExamSlot[];
  reservationsBySlotId: Map<string, Reservation[]>;
  memberNamesByUserId: Map<string, string>;
  currentUserId: string | null;
  currentUserRole: Exclude<SchoolRole, "student">;
  cancelReservationState: {
    error: string | null;
    success: string | null;
    pendingReservationId: string | null;
  };
  updatePendingReservationId: string | null;
  onCancelReservationRequest: (id: string) => void;
  onUpdateReservationRequest: (id: string) => void;
  formatSlotTime: (value: string) => string;
  formatExamType: (type: Reservation["examType"]) => string;
};

export function ReservationDayView({
  examSlots,
  reservationsBySlotId,
  memberNamesByUserId,
  currentUserId,
  currentUserRole,
  cancelReservationState,
  updatePendingReservationId,
  onCancelReservationRequest,
  onUpdateReservationRequest,
  formatSlotTime,
  formatExamType,
}: ReservationDayViewProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {examSlots.map((slot) => {
        const slotReservations = reservationsBySlotId.get(slot.id) ?? [];
        const remaining = Math.max(0, slot.capacity - slotReservations.length);
        const usedPercent =
          slot.capacity > 0
            ? Math.min(100, Math.round((slotReservations.length / slot.capacity) * 100))
            : 0;
        const loadStyle = getLoadStyle(remaining, slot.capacity);

        return (
          <section
            key={slot.id}
            className="overflow-hidden rounded-[12px] border"
            style={{ background: "var(--surface-panel)", borderColor: "var(--border-default)" }}
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {slot.name}
                  </h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <Clock size={13} />
                    {formatSlotTime(slot.startsAt)} - {formatSlotTime(slot.endsAt)}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={loadStyle}
                >
                  {remaining === 0 ? "Full" : `${remaining} open`}
                </span>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span style={{ color: "var(--text-secondary)" }}>
                    {slotReservations.length} of {slot.capacity} seats booked
                  </span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {usedPercent}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--border-strong)" }}>
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{
                      width: `${usedPercent}%`,
                      background: remaining === 0 ? "var(--text-faint)" : "var(--accent-color)",
                    }}
                  />
                </div>
              </div>
            </div>

            <div
              className="space-y-2 border-t p-3"
              style={{ borderColor: "var(--border-subtle)", background: "var(--surface-inset)" }}
            >
              {slotReservations.length === 0 ? (
                <div
                  className="flex min-h-[84px] items-center justify-center rounded-[10px] border border-dashed px-3 text-center text-sm"
                  style={{
                    background: "var(--surface-panel)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-faint)",
                  }}
                >
                  No reservations in this slot.
                </div>
              ) : (
                slotReservations.map((reservation, index) => {
                  const canManageReservation =
                    !!currentUserId &&
                    (currentUserRole === "admin" || currentUserRole === "professor");

                  return (
                    <article
                      key={reservation.id}
                      className="rounded-[10px] border p-3"
                      style={{ background: "var(--surface-panel)", borderColor: "var(--border-default)" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className="flex min-w-0 items-center gap-1.5 text-sm font-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            <UserRound size={14} className="shrink-0" />
                            <span className="truncate">
                              {memberNamesByUserId.get(reservation.userId) ?? "Unnamed student"}
                            </span>
                          </p>
                          <p className="mt-1 truncate text-sm" style={{ color: "var(--text-body)" }}>
                            {reservation.examName}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span
                              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                              style={{ background: "var(--accent-muted)", color: "var(--accent-strong)" }}
                            >
                              Seat {index + 1}
                            </span>
                            <span
                              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                              style={{
                                background: "var(--surface-alt)",
                                color: "var(--text-slate)",
                                border: "1px solid var(--border-default)",
                              }}
                            >
                              {formatExamType(reservation.examType)}
                            </span>
                          </div>
                        </div>
                        {canManageReservation && (
                          <ReservationActionMenu
                            disabled={
                              !!cancelReservationState.pendingReservationId ||
                              !!updatePendingReservationId
                            }
                            onCancel={() => onCancelReservationRequest(reservation.id)}
                            onUpdate={() => onUpdateReservationRequest(reservation.id)}
                          />
                        )}
                      </div>
                    </article>
                  );
                })
              )}

              {remaining > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {Array.from({ length: Math.min(remaining, 4) }, (_, index) => (
                    <span
                      key={`${slot.id}-open-${index}`}
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        background: "var(--surface-panel)",
                        border: "1px solid var(--border-default)",
                        color: "var(--text-faint)",
                      }}
                    >
                      Seat {slotReservations.length + index + 1}
                    </span>
                  ))}
                  {remaining > 4 && (
                    <span
                      className="px-1.5 py-0.5 text-[11px] font-medium"
                      style={{ color: "var(--text-faint)" }}
                    >
                      +{remaining - 4} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function getLoadStyle(remaining: number, capacity: number) {
  if (capacity <= 0 || remaining === 0) {
    return { background: "var(--surface-subtle)", color: "var(--text-slate)" };
  }

  if (remaining <= 2) {
    return { background: "var(--warning-subtle)", color: "var(--warning)" };
  }

  return { background: "var(--accent-muted)", color: "var(--accent-strong)" };
}
