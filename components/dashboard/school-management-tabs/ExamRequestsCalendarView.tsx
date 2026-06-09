import { AlertTriangle, Clock } from "lucide-react";
import { formatExamType, formatSlotTime } from "./formatters";
import type { ExamSlot, ScheduleRequest } from "./types";

type ExamRequestsCalendarViewProps = {
  weekDates: string[];
  selectedDate: string;
  examSlots: ExamSlot[];
  requests: ScheduleRequest[];
  selectedRequestId: string | null;
  nowMs: number;
  onSelectDate: (date: string) => void;
  onSelectRequest: (requestId: string) => void;
};

function formatDayName(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(
    new Date(`${dateKey}T00:00:00`),
  );
}

function formatDayNumber(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function getTodayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isUrgent(request: ScheduleRequest, nowMs: number) {
  return new Date(request.expiresAt).getTime() - nowMs <= 24 * 60 * 60 * 1000;
}

function getRequestSortValue(request: ScheduleRequest) {
  return new Date(request.expiresAt).getTime();
}

function getRequestsForSlot(
  requests: ScheduleRequest[],
  dateKey: string,
  slot: ExamSlot,
) {
  return requests
    .filter(
      (request) =>
        request.reservationDate === dateKey &&
        (slot.slotKind === "primary"
          ? request.slotGroupId === slot.id || request.slotId === slot.id
          : request.slotId === slot.id),
    )
    .toSorted((first, second) => getRequestSortValue(first) - getRequestSortValue(second));
}

function getDateRequests(requests: ScheduleRequest[], dateKey: string) {
  return requests.filter((request) => request.reservationDate === dateKey);
}

export function ExamRequestsCalendarView({
  weekDates,
  selectedDate,
  examSlots,
  requests,
  selectedRequestId,
  nowMs,
  onSelectDate,
  onSelectRequest,
}: ExamRequestsCalendarViewProps) {
  const weekdays = weekDates.filter((dateKey) => {
    const day = new Date(`${dateKey}T00:00:00`).getDay();
    return day !== 0 && day !== 6;
  });
  const todayKey = getTodayKey();
  const activePrimarySlots = examSlots
    .filter((slot) => slot.isActive && slot.slotKind === "primary")
    .toSorted((first, second) => first.startsAt.localeCompare(second.startsAt));
  const activeOverflowByPrimaryId = new Map(
    examSlots
      .filter((slot) => slot.isActive && slot.slotKind === "overflow" && slot.primarySlotId)
      .map((slot) => [slot.primarySlotId as string, slot]),
  );

  return (
    <div className="min-w-0">
      <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
        {weekdays.map((dateKey) => {
          const dateRequests = getDateRequests(requests, dateKey);
          const selected = dateKey === selectedDate;

          return (
            <button
              key={dateKey}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelectDate(dateKey)}
              className="min-h-16 min-w-[88px] rounded-[12px] border px-3 py-2 text-left transition-[background-color,border-color] duration-150 hover:bg-[#EFF6FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              style={{
                background: selected ? "#EFF6FF" : "#FFFFFF",
                borderColor: selected ? "#93C5FD" : "#E4E8EF",
              }}
            >
              <span
                className="block text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: selected ? "#2563EB" : "#94A3B8" }}
              >
                {formatDayName(dateKey)}
              </span>
              <span
                className="mt-1 block text-sm font-semibold"
                style={{ color: selected ? "#1D4ED8" : "#111827" }}
              >
                {formatDayNumber(dateKey)}
              </span>
              <span className="mt-1 block text-[11px]" style={{ color: "#6B7280" }}>
                {dateRequests.length} pending
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-[12px] border bg-white" style={{ borderColor: "#E4E8EF" }}>
        <div className="min-w-[1080px]">
          <div
            className="sticky top-0 z-10 grid border-b bg-white"
            style={{
              gridTemplateColumns: "170px repeat(5, minmax(170px, 1fr))",
              borderColor: "#E4E8EF",
            }}
          >
            <div
              className="flex items-center gap-2 border-r px-3 py-3 text-[11px] font-semibold uppercase tracking-wider"
              style={{ borderColor: "#E4E8EF", color: "#94A3B8" }}
            >
              <Clock size={13} aria-hidden="true" />
              Exam Time
            </div>
            {weekdays.map((dateKey) => {
              const isToday = dateKey === todayKey;
              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => onSelectDate(dateKey)}
                  className="border-r px-3 py-3 text-left transition-[background-color] duration-150 last:border-r-0 hover:bg-[#EFF6FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                  style={{
                    background: isToday ? "#EFF6FF" : "#FFFFFF",
                    borderColor: "#E4E8EF",
                  }}
                >
                  <span
                    className="block text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: isToday ? "#2563EB" : "#94A3B8" }}
                  >
                    {formatDayName(dateKey)}
                  </span>
                  <span
                    className="mt-0.5 block text-sm font-semibold"
                    style={{ color: isToday ? "#1D4ED8" : "#111827" }}
                  >
                    {formatDayNumber(dateKey)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid">
            {activePrimarySlots.map((slot) => (
              <SlotTableSection
                key={slot.id}
                slot={slot}
                overflowSlot={activeOverflowByPrimaryId.get(slot.id) ?? null}
                weekdays={weekdays}
                requests={requests}
                selectedRequestId={selectedRequestId}
                nowMs={nowMs}
                onSelectRequest={onSelectRequest}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SlotTableSection({
  slot,
  overflowSlot,
  weekdays,
  requests,
  selectedRequestId,
  nowMs,
  onSelectRequest,
}: {
  slot: ExamSlot;
  overflowSlot: ExamSlot | null;
  weekdays: string[];
  requests: ScheduleRequest[];
  selectedRequestId: string | null;
  nowMs: number;
  onSelectRequest: (requestId: string) => void;
}) {
  const sections = overflowSlot ? [slot, overflowSlot] : [slot];

  return (
    <section className="border-b last:border-b-0" style={{ borderColor: "#E4E8EF" }}>
      {sections.map((sectionSlot) => {
        const rowCount = Math.max(
          sectionSlot.capacity,
          ...weekdays.map(
            (dateKey) => getRequestsForSlot(requests, dateKey, sectionSlot).length,
          ),
        );

        return (
          <div
            key={sectionSlot.id}
            className="grid"
            style={{ gridTemplateColumns: "170px repeat(5, minmax(170px, 1fr))" }}
          >
            <div
              className="border-r px-3 py-3"
              style={{
                borderColor: "#E4E8EF",
                background: sectionSlot.slotKind === "overflow" ? "#F8FAFC" : "#FAFAFA",
              }}
            >
              <div className="sticky top-[73px]">
                <p className="truncate text-sm font-semibold" style={{ color: "#111827" }}>
                  {sectionSlot.name}
                </p>
                <p className="mt-1 text-[11px] font-medium" style={{ color: "#6B7280" }}>
                  {formatSlotTime(sectionSlot.startsAt)}-{formatSlotTime(sectionSlot.endsAt)}
                </p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#94A3B8" }}>
                  {sectionSlot.capacity} seats
                </p>
              </div>
            </div>

            {weekdays.map((dateKey) => {
              const slotRequests = getRequestsForSlot(requests, dateKey, sectionSlot);

              return (
                <div
                  key={`${sectionSlot.id}-${dateKey}`}
                  className="grid border-r last:border-r-0"
                  style={{ borderColor: "#E4E8EF" }}
                >
                  {Array.from({ length: rowCount }, (_, index) => {
                    const request = slotRequests[index] ?? null;
                    return (
                      <SeatCell
                        key={`${sectionSlot.id}-${dateKey}-${index}`}
                        request={request}
                        seatNumber={index + 1}
                        isQueueRow={index >= sectionSlot.capacity}
                        selected={request?.id === selectedRequestId}
                        urgent={request ? isUrgent(request, nowMs) : false}
                        onSelectRequest={onSelectRequest}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}

function SeatCell({
  request,
  seatNumber,
  isQueueRow,
  selected,
  urgent,
  onSelectRequest,
}: {
  request: ScheduleRequest | null;
  seatNumber: number;
  isQueueRow: boolean;
  selected: boolean;
  urgent: boolean;
  onSelectRequest: (requestId: string) => void;
}) {
  if (!request) {
    return (
      <div
        className="flex min-h-[66px] items-center border-b px-2.5 py-2 last:border-b-0"
        style={{ borderColor: "#F3F4F6", background: "#FFFFFF" }}
      >
        <span className="text-[11px] font-medium tabular-nums" style={{ color: "#CBD5E1" }}>
          {isQueueRow ? "Queue" : `Seat ${seatNumber}`}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelectRequest(request.id)}
      className="group min-h-[66px] w-full border-b px-2.5 py-2 text-left transition-[background-color,border-color,box-shadow] duration-150 last:border-b-0 hover:bg-[#EFF6FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      style={{
        background: selected ? "#EFF6FF" : "#FFFFFF",
        borderColor: selected ? "#93C5FD" : urgent ? "#FCD34D" : "#F3F4F6",
        boxShadow: selected ? "inset 0 0 0 1px #2563EB" : "none",
      }}
      aria-label={`Review request from ${request.studentName} for ${request.examName}`}
    >
      <div className="flex min-w-0 items-start gap-2">
        <span
          className="mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
          style={urgent ? { background: "#FEF3C7", color: "#B45309" } : { background: "#F8FAFC", color: "#64748B" }}
        >
          {isQueueRow ? "Q" : seatNumber}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold leading-tight" style={{ color: "#111827" }}>
            {request.studentName}
          </span>
          <span className="mt-1 block truncate text-[12px]" style={{ color: "#374151" }}>
            {request.examName}
          </span>
          <span className="mt-1.5 flex min-w-0 items-center gap-1.5">
            <span
              className="truncate rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: "#DBEAFE", color: "#1D4ED8" }}
            >
              {formatExamType(request.examType)}
            </span>
            {urgent && (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ background: "#FEF3C7", color: "#B45309" }}
              >
                <AlertTriangle size={10} aria-hidden="true" />
                Soon
              </span>
            )}
          </span>
        </span>
      </div>
    </button>
  );
}
