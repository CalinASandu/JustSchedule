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
    <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
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
            className="overflow-hidden rounded-[12px] border bg-white"
            style={{ borderColor: "#E4E8EF" }}
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold" style={{ color: "#111827" }}>
                    {slot.name}
                  </h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs" style={{ color: "#6B7280" }}>
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
                  <span style={{ color: "#6B7280" }}>
                    {slotReservations.length} of {slot.capacity} seats booked
                  </span>
                  <span className="font-semibold" style={{ color: "#111827" }}>
                    {usedPercent}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background: "#E2E8F0" }}>
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{
                      width: `${usedPercent}%`,
                      background: remaining === 0 ? "#94A3B8" : "#2563EB",
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-[#F3F4F6] bg-[#FAFAFA] p-3">
              {slotReservations.length === 0 ? (
                <div
                  className="flex min-h-[84px] items-center justify-center rounded-[10px] border border-dashed bg-white px-3 text-center text-sm"
                  style={{ borderColor: "#E4E8EF", color: "#94A3B8" }}
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
                      className="rounded-[10px] border bg-white p-3"
                      style={{ borderColor: "#E4E8EF" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className="flex min-w-0 items-center gap-1.5 text-sm font-semibold"
                            style={{ color: "#111827" }}
                          >
                            <UserRound size={14} className="shrink-0" />
                            <span className="truncate">
                              {memberNamesByUserId.get(reservation.userId) ?? "Unnamed student"}
                            </span>
                          </p>
                          <p className="mt-1 truncate text-sm" style={{ color: "#374151" }}>
                            {reservation.examName}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span
                              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                              style={{ background: "#DBEAFE", color: "#1D4ED8" }}
                            >
                              Seat {index + 1}
                            </span>
                            <span
                              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                              style={{
                                background: "#F8FAFC",
                                color: "#64748B",
                                border: "1px solid #E4E8EF",
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
                        background: "#FFFFFF",
                        border: "1px solid #E4E8EF",
                        color: "#94A3B8",
                      }}
                    >
                      Seat {slotReservations.length + index + 1}
                    </span>
                  ))}
                  {remaining > 4 && (
                    <span
                      className="px-1.5 py-0.5 text-[11px] font-medium"
                      style={{ color: "#94A3B8" }}
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
    return { background: "#E2E8F0", color: "#64748B" };
  }

  if (remaining <= 2) {
    return { background: "#FEF3C7", color: "#B45309" };
  }

  return { background: "#DBEAFE", color: "#1D4ED8" };
}
