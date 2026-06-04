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
                className="flex min-h-[360px] flex-col overflow-hidden rounded-[12px] border bg-white"
                style={{ borderColor: isToday ? "#93C5FD" : "#E4E8EF" }}
              >
                <div
                  className="px-3 py-3"
                  style={{
                    background: isToday ? "#EFF6FF" : "#FAFAFA",
                    borderBottom: `1px solid ${isToday ? "#BFDBFE" : "#F3F4F6"}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p
                        className="text-[11px] font-semibold uppercase"
                        style={{ color: isToday ? "#2563EB" : "#94A3B8" }}
                      >
                        {dayLabel}
                      </p>
                      <p
                        className="mt-0.5 text-sm font-semibold"
                        style={{ color: isToday ? "#1D4ED8" : "#111827" }}
                      >
                        {dayNum}
                      </p>
                    </div>
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={
                        dayReservations.length > 0
                          ? { background: "#DBEAFE", color: "#1D4ED8" }
                          : { background: "#E2E8F0", color: "#64748B" }
                      }
                    >
                      {dayReservations.length}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-2 p-2.5">
                  {dayReservations.length === 0 ? (
                    <div
                      className="flex flex-1 items-center justify-center rounded-[10px] border border-dashed bg-[#FAFAFA] px-3 text-center text-xs"
                      style={{ borderColor: "#E4E8EF", color: "#94A3B8" }}
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
                          className="group w-full rounded-[10px] border bg-white p-2.5 text-left transition-[background,border-color] duration-150 hover:bg-[#EFF6FF]"
                          style={{ borderColor: "#E4E8EF" }}
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                              style={{ background: "#EFF6FF", color: "#2563EB" }}
                            >
                              <UserRound size={12} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p
                                className="truncate text-[12px] font-semibold leading-tight"
                                style={{ color: "#111827" }}
                              >
                                {memberNamesByUserId.get(reservation.userId) ?? "Unnamed student"}
                              </p>
                              <p className="mt-1 truncate text-[12px]" style={{ color: "#374151" }}>
                                {reservation.examName}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {slot && (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                    style={{ background: "#DBEAFE", color: "#1D4ED8" }}
                                  >
                                    <Clock size={10} />
                                    {formatSlotTime(slot.startsAt)}
                                  </span>
                                )}
                                <span
                                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize"
                                  style={{
                                    background: "#F8FAFC",
                                    color: "#64748B",
                                    border: "1px solid #E4E8EF",
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
