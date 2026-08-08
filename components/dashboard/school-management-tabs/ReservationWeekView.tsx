import { Clock, UserRound } from "lucide-react";
import type { ExamSlot, Reservation } from "./types";

type ReservationWeekViewProps = {
  reservationWeekDates: string[];
  reservationsByDate: Map<string, Reservation[]>;
  examSlots: ExamSlot[];
  memberNamesByUserId: Map<string, string>;
  setSelectedWeekReservationId: (id: string) => void;
  getTodayKey: () => string;
  formatSlotTime: (value: string) => string;
};

export function ReservationWeekView({
  reservationWeekDates,
  reservationsByDate,
  examSlots,
  memberNamesByUserId,
  setSelectedWeekReservationId,
  getTodayKey,
  formatSlotTime,
}: ReservationWeekViewProps) {
  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[900px] gap-3"
        style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}
      >
        {reservationWeekDates
          .filter((dateKey) => {
            const dow = new Date(`${dateKey}T00:00:00`).getDay();
            return dow !== 0 && dow !== 6;
          })
          .map((dateKey) => {
            const dayReservations = reservationsByDate.get(dateKey) ?? [];
            const isToday = dateKey === getTodayKey();
            const dayDate = new Date(`${dateKey}T00:00:00`);
            const dayLabel = dayDate.toLocaleDateString("en-US", { weekday: "short" });
            const dayNum = dayDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });

            return (
              <section
                key={dateKey}
                className="flex min-h-[360px] flex-col overflow-hidden rounded-[12px] border"
                style={{
                  background: "var(--surface-panel)",
                  borderColor: isToday ? "var(--accent-border-strong)" : "var(--border-default)",
                }}
              >
                <div
                  className="px-3 py-3"
                  style={{
                    background: isToday ? "var(--accent-subtle)" : "var(--surface-inset)",
                    borderBottom: `1px solid ${isToday ? "var(--accent-border)" : "var(--border-subtle)"}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p
                        className="text-[11px] font-semibold uppercase"
                        style={{ color: isToday ? "var(--accent-color)" : "var(--text-faint)" }}
                      >
                        {dayLabel}
                      </p>
                      <p
                        className="mt-0.5 text-sm font-semibold"
                        style={{ color: isToday ? "var(--accent-strong)" : "var(--text-primary)" }}
                      >
                        {dayNum}
                      </p>
                    </div>
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={
                        dayReservations.length > 0
                          ? { background: "var(--accent-muted)", color: "var(--accent-strong)" }
                          : { background: "var(--surface-subtle)", color: "var(--text-slate)" }
                      }
                    >
                      {dayReservations.length}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-2 p-2.5">
                  {dayReservations.length === 0 ? (
                    <div
                      className="flex flex-1 items-center justify-center rounded-[10px] border border-dashed px-3 text-center text-xs"
                      style={{
                        background: "var(--surface-inset)",
                        borderColor: "var(--border-default)",
                        color: "var(--text-faint)",
                      }}
                    >
                      No reservations
                    </div>
                  ) : (
                    dayReservations.map((reservation) => {
                      const slot = examSlots.find((item) => item.id === reservation.slotId);

                      return (
                        <button
                          key={reservation.id}
                          type="button"
                          onClick={() => setSelectedWeekReservationId(reservation.id)}
                          className="group w-full rounded-[10px] border p-2.5 text-left transition-[background,border-color] duration-150 hover:bg-[var(--accent-subtle)]"
                          style={{ background: "var(--surface-panel)", borderColor: "var(--border-default)" }}
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                              style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}
                            >
                              <UserRound size={12} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p
                                className="truncate text-[12px] font-semibold leading-tight"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {memberNamesByUserId.get(reservation.userId) ?? "Unnamed student"}
                              </p>
                              <p className="mt-1 truncate text-[12px]" style={{ color: "var(--text-body)" }}>
                                {reservation.examName}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {slot && (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                    style={{ background: "var(--accent-muted)", color: "var(--accent-strong)" }}
                                  >
                                    <Clock size={10} />
                                    {formatSlotTime(slot.startsAt)}
                                  </span>
                                )}
                                <span
                                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize"
                                  style={{
                                    background: "var(--surface-alt)",
                                    color: "var(--text-slate)",
                                    border: "1px solid var(--border-default)",
                                  }}
                                >
                                  {reservation.examType}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
}
