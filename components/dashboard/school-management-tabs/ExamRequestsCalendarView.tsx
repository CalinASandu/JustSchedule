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
              className="min-h-16 min-w-[88px] rounded-[12px] border px-3 py-2 text-left transition-[background-color,border-color] duration-150 hover:bg-[var(--accent-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
              style={{
                background: selected ? "var(--accent-subtle)" : "var(--surface-panel)",
                borderColor: selected ? "var(--accent-border-strong)" : "var(--border-default)",
              }}
            >
              <span
                className="block text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: selected ? "var(--accent-color)" : "var(--text-faint)" }}
              >
                {formatDayName(dateKey)}
              </span>
              <span
                className="mt-1 block text-sm font-semibold"
                style={{ color: selected ? "var(--accent-strong)" : "var(--text-primary)" }}
              >
                {formatDayNumber(dateKey)}
              </span>
              <span className="mt-1 block text-[11px]" style={{ color: "var(--text-secondary)" }}>
                {dateRequests.length} pending
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 lg:hidden">
        {activePrimarySlots.flatMap((slot) => {
          const overflowSlot = activeOverflowByPrimaryId.get(slot.id) ?? null;
          return [slot, overflowSlot].filter((item): item is ExamSlot => Boolean(item));
        }).map((slot) => {
          const slotRequests = getRequestsForSlot(requests, selectedDate, slot);
          const rowCount = Math.max(slot.capacity, slotRequests.length);

          return (
            <section
              key={`${selectedDate}-${slot.id}`}
              className="overflow-hidden rounded-[12px] border"
              style={{ background: "var(--surface-panel)", borderColor: "var(--border-default)" }}
            >
              <div
                className="flex items-start justify-between gap-3 px-3 py-3"
                style={{
                  background: slot.slotKind === "overflow" ? "var(--surface-alt)" : "var(--surface-inset)",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {slot.name}
                  </p>
                  <p className="mt-1 text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                    {formatSlotTime(slot.startsAt)}-{formatSlotTime(slot.endsAt)}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{ background: "var(--accent-muted)", color: "var(--accent-strong)" }}
                >
                  {slotRequests.length} / {slot.capacity}
                </span>
              </div>

              <div className="grid gap-2 p-2.5">
                {rowCount === 0 ? (
                  <div
                    className="flex min-h-[64px] items-center justify-center rounded-[10px] border border-dashed bg-[var(--surface-inset)] px-3 text-center text-xs"
                    style={{ borderColor: "var(--border-default)", color: "var(--text-faint)" }}
                  >
                    No seats configured
                  </div>
                ) : (
                  Array.from({ length: rowCount }, (_, index) => {
                    const request = slotRequests[index] ?? null;
                    return (
                      <MobileSeatCard
                        key={`${selectedDate}-${slot.id}-${index}`}
                        request={request}
                        seatNumber={index + 1}
                        isQueueRow={index >= slot.capacity}
                        selected={request?.id === selectedRequestId}
                        urgent={request ? isUrgent(request, nowMs) : false}
                        onSelectRequest={onSelectRequest}
                      />
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div
        className="hidden overflow-x-auto rounded-[12px] border lg:block"
        style={{ background: "var(--surface-panel)", borderColor: "var(--border-default)" }}
      >
        <div className="min-w-[1080px]">
          <div
            className="sticky top-0 z-10 grid border-b"
            style={{
              gridTemplateColumns: "170px repeat(5, minmax(170px, 1fr))",
              background: "var(--surface-panel)",
              borderColor: "var(--border-default)",
            }}
          >
            <div
              className="flex items-center gap-2 border-r px-3 py-3 text-[11px] font-semibold uppercase tracking-wider"
              style={{ borderColor: "var(--border-default)", color: "var(--text-faint)" }}
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
                  className="border-r px-3 py-3 text-left transition-[background-color] duration-150 last:border-r-0 hover:bg-[var(--accent-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-color)]"
                  style={{
                    background: isToday ? "var(--accent-subtle)" : "var(--surface-panel)",
                    borderColor: "var(--border-default)",
                  }}
                >
                  <span
                    className="block text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: isToday ? "var(--accent-color)" : "var(--text-faint)" }}
                  >
                    {formatDayName(dateKey)}
                  </span>
                  <span
                    className="mt-0.5 block text-sm font-semibold"
                    style={{ color: isToday ? "var(--accent-strong)" : "var(--text-primary)" }}
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

function MobileSeatCard({
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
        className="flex min-h-12 items-center rounded-[10px] border px-3 py-2"
        style={{ background: "var(--surface-panel)", borderColor: "var(--border-default)" }}
      >
        <span className="text-[11px] font-medium tabular-nums" style={{ color: "var(--text-faint)" }}>
          {isQueueRow ? "Queue" : `Seat ${seatNumber}`}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelectRequest(request.id)}
      className="min-h-[72px] w-full rounded-[10px] border px-3 py-2.5 text-left transition-[background-color,border-color,box-shadow] duration-150 hover:bg-[var(--accent-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
      style={{
        background: selected ? "var(--accent-subtle)" : "var(--surface-panel)",
        borderColor: selected ? "var(--accent-border-strong)" : urgent ? "var(--warning-border)" : "var(--border-default)",
        boxShadow: selected ? "inset 0 0 0 1px var(--accent-color)" : "none",
      }}
      aria-label={`Review request from ${request.studentName} for ${request.examName}`}
    >
      <div className="flex min-w-0 items-start gap-2">
        <span
          className="mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
          style={urgent ? { background: "var(--warning-subtle)", color: "var(--warning)" } : { background: "var(--surface-alt)", color: "var(--text-slate)" }}
        >
          {isQueueRow ? "Q" : seatNumber}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-[12px] font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
            {request.studentName}
          </span>
          <span className="mt-1 block break-words text-[12px]" style={{ color: "var(--text-body)" }}>
            {request.examName}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: "var(--accent-muted)", color: "var(--accent-strong)" }}
            >
              {formatExamType(request.examType)}
            </span>
            {urgent && (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ background: "var(--warning-subtle)", color: "var(--warning)" }}
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
    <section className="border-b last:border-b-0" style={{ borderColor: "var(--border-default)" }}>
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
                borderColor: "var(--border-default)",
                background: sectionSlot.slotKind === "overflow" ? "var(--surface-alt)" : "var(--surface-inset)",
              }}
            >
              <div className="sticky top-[73px]">
                <p className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {sectionSlot.name}
                </p>
                <p className="mt-1 text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                  {formatSlotTime(sectionSlot.startsAt)}-{formatSlotTime(sectionSlot.endsAt)}
                </p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
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
                  style={{ borderColor: "var(--border-default)" }}
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
        style={{ borderColor: "var(--border-subtle)", background: "var(--surface-panel)" }}
      >
        <span className="text-[11px] font-medium tabular-nums" style={{ color: "var(--text-faint)" }}>
          {isQueueRow ? "Queue" : `Seat ${seatNumber}`}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelectRequest(request.id)}
      className="group min-h-[66px] w-full border-b px-2.5 py-2 text-left transition-[background-color,border-color,box-shadow] duration-150 last:border-b-0 hover:bg-[var(--accent-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-color)]"
      style={{
        background: selected ? "var(--accent-subtle)" : "var(--surface-panel)",
        borderColor: selected ? "var(--accent-border-strong)" : urgent ? "var(--warning-border)" : "var(--border-subtle)",
        boxShadow: selected ? "inset 0 0 0 1px var(--accent-color)" : "none",
      }}
      aria-label={`Review request from ${request.studentName} for ${request.examName}`}
    >
      <div className="flex min-w-0 items-start gap-2">
        <span
          className="mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
          style={urgent ? { background: "var(--warning-subtle)", color: "var(--warning)" } : { background: "var(--surface-alt)", color: "var(--text-slate)" }}
        >
          {isQueueRow ? "Q" : seatNumber}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
            {request.studentName}
          </span>
          <span className="mt-1 block truncate text-[12px]" style={{ color: "var(--text-body)" }}>
            {request.examName}
          </span>
          <span className="mt-1.5 flex min-w-0 items-center gap-1.5">
            <span
              className="truncate rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: "var(--accent-muted)", color: "var(--accent-strong)" }}
            >
              {formatExamType(request.examType)}
            </span>
            {urgent && (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ background: "var(--warning-subtle)", color: "var(--warning)" }}
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
