import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import { markScheduleRequestTeacherSeen, reviewScheduleRequest } from "./api";
import { addDays, getTodayKey, getWeekDates } from "./date-utils";
import { formatReservationDate } from "./formatters";
import { ExamRequestsCalendarView } from "./ExamRequestsCalendarView";
import { ExamRequestsReviewRail } from "./ExamRequestsReviewRail";
import { EmptyState, ErrorBanner } from "./shared";
import type { ExamSlot, ScheduleRequest, SchoolRole } from "./types";

type ExamRequestsTabProps = {
  requests: ScheduleRequest[];
  requestError: string | null;
  examSlots: ExamSlot[];
  currentUserRole: Exclude<SchoolRole, "student">;
};

function getStatusLabel(status: ScheduleRequest["status"]) {
  switch (status) {
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "declined":
      return "Declined";
    case "expired":
      return "Expired";
    case "failed_capacity":
      return "Slot filled";
    case "failed_conflict":
      return "Conflict";
    case "cancelled":
      return "Cancelled";
  }
}

function getRequestSortValue(request: ScheduleRequest) {
  return new Date(request.expiresAt).getTime();
}

function getUrgentCount(requests: ScheduleRequest[], nowMs: number) {
  return requests.filter(
    (request) => new Date(request.expiresAt).getTime() - nowMs <= 24 * 60 * 60 * 1000,
  ).length;
}

export function ExamRequestsTab({
  requests,
  requestError,
  examSlots,
  currentUserRole,
}: ExamRequestsTabProps) {
  const router = useRouter();
  const [nowMs] = useState(() => Date.now());
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(getTodayKey);
  const [weekAnchorDate, setWeekAnchorDate] = useState(getTodayKey);
  const [teacherFilter, setTeacherFilter] = useState<string>("all");
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [localStatuses, setLocalStatuses] = useState<Record<string, ScheduleRequest["status"]>>({});
  const [locallyTeacherSeenRequestIds, setLocallyTeacherSeenRequestIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [reviewState, setReviewState] = useState<{
    error: string | null;
    success: string | null;
  }>({ error: null, success: null });

  const visibleRequests = useMemo(
    () =>
      requests.map((request) => ({
        ...request,
        status: localStatuses[request.id] ?? request.status,
      })),
    [localStatuses, requests],
  );
  const pendingRequests = useMemo(
    () =>
      visibleRequests
        .filter((request) => request.status === "pending")
        .toSorted((first, second) => getRequestSortValue(first) - getRequestSortValue(second)),
    [visibleRequests],
  );
  const teacherOptions = useMemo(() => {
    const options = new Map<string, string>();

    for (const request of pendingRequests) {
      options.set(request.teacherUserId, request.teacherName);
    }

    return Array.from(options, ([userId, name]) => ({ userId, name })).toSorted((first, second) =>
      first.name.localeCompare(second.name),
    );
  }, [pendingRequests]);
  const filteredRequests = useMemo(
    () =>
      teacherFilter === "all"
        ? pendingRequests
        : pendingRequests.filter((request) => request.teacherUserId === teacherFilter),
    [pendingRequests, teacherFilter],
  );
  const weekDates = useMemo(() => getWeekDates(weekAnchorDate), [weekAnchorDate]);
  const selectedRequest = selectedRequestId
    ? filteredRequests.find((request) => request.id === selectedRequestId) ?? null
    : null;
  const selectedRequestHasActiveOverflow =
    !!selectedRequest?.overflowSlotId &&
    examSlots.some(
      (slot) =>
        slot.isActive &&
        slot.slotKind === "overflow" &&
        slot.id === selectedRequest.overflowSlotId,
    );
  const selectedMessage = selectedRequest ? messages[selectedRequest.id] ?? "" : "";
  const urgentCount = getUrgentCount(filteredRequests, nowMs);
  const primarySlots = examSlots.filter((slot) => slot.isActive && slot.slotKind === "primary");
  const rangeLabel = `${formatReservationDate(weekDates[0])} - ${formatReservationDate(
    weekDates[6],
  )}`;

  async function reviewRequest(request: ScheduleRequest, decision: "approved" | "declined") {
    setReviewingRequestId(request.id);
    setReviewState({ error: null, success: null });

    const result = await reviewScheduleRequest({
      requestId: request.id,
      decision,
      message: messages[request.id],
    });

    if (result.error) {
      setReviewState({ error: result.error, success: null });
      setReviewingRequestId(null);
      return;
    }

    const nextStatus = result.data?.status ?? decision;
    setLocalStatuses((current) => ({ ...current, [request.id]: nextStatus }));
    setSelectedRequestId(null);
    setReviewState({
      error: null,
      success:
        nextStatus === "approved"
          ? "Request approved and reservation created."
          : nextStatus === "failed_capacity"
            ? "The request could not be approved because the slot is full."
            : nextStatus === "failed_conflict"
              ? "The request could not be approved because the student has a conflict."
              : `Request ${getStatusLabel(nextStatus).toLowerCase()}.`,
    });
    setReviewingRequestId(null);
    router.refresh();
  }

  function moveWeek(days: number) {
    setWeekAnchorDate((current) => {
      const next = addDays(current, days);
      setSelectedDate(next);
      return next;
    });
  }

  function updateMessage(requestId: string, message: string) {
    setMessages((current) => ({ ...current, [requestId]: message }));
  }

  function selectRequest(requestId: string) {
    setSelectedRequestId(requestId);

    if (locallyTeacherSeenRequestIds.has(requestId)) {
      return;
    }

    setLocallyTeacherSeenRequestIds((current) => {
      const next = new Set(current);
      next.add(requestId);
      return next;
    });

    void markScheduleRequestTeacherSeen(requestId);
  }

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}
            >
              <CalendarDays size={17} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-[0.9375rem] font-semibold" style={{ color: "var(--text-primary)" }}>
                Exam requests
              </h2>
              <p className="mt-0.5 truncate text-sm" style={{ color: "var(--text-secondary)" }}>
                Pending requests expire two hours before the selected exam slot.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          {currentUserRole === "admin" && (
            <label
              className="flex min-h-10 w-full items-center gap-2 rounded-[12px] border px-3 py-2 lg:w-auto"
              style={{ borderColor: "var(--border-default)", background: "var(--surface-panel)" }}
            >
              <Filter size={14} aria-hidden="true" style={{ color: "var(--text-secondary)" }} />
              <span className="sr-only">Assigned teacher filter</span>
              <select
                value={teacherFilter}
                onChange={(event) => setTeacherFilter(event.target.value)}
                className="min-h-5 min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] lg:min-w-[150px]"
                style={{ color: "var(--text-primary)" }}
              >
                <option value="all">All requests</option>
                {teacherOptions.map((teacher) => (
                  <option key={teacher.userId} value={teacher.userId}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div
            className="flex w-full min-w-0 items-center gap-2 rounded-[12px] lg:w-auto"
            style={{ background: "var(--surface-panel)" }}
          >
            <button
              type="button"
              onClick={() => moveWeek(-7)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-[var(--surface-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
              style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
              aria-label="Previous week"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <span
              className="min-w-0 flex-1 rounded-xl px-3 py-2 text-center text-sm font-semibold lg:min-w-[210px]"
              style={{ border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
            >
              {rangeLabel}
            </span>
            <button
              type="button"
              onClick={() => moveWeek(7)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-[var(--surface-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
              style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
              aria-label="Next week"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <SummaryPill label="Pending" value={filteredRequests.length} emphasis />
        <SummaryPill label="Expiring soon" value={urgentCount} />
        <SummaryPill label="Slots shown" value={primarySlots.length} />
      </div>

      {(requestError || reviewState.error) && (
        <ErrorBanner message={reviewState.error ?? requestError ?? ""} />
      )}

      {reviewState.success && (
        <p
          className="anim-fade-in mb-4 text-[0.8125rem] font-medium"
          style={{ color: "var(--accent-strong)" }}
        >
          {reviewState.success}
        </p>
      )}

      {pendingRequests.length === 0 ? (
        <EmptyState
          title="No pending exam requests"
          description="New requests from students without self-booking permission will appear on this calendar."
        />
      ) : primarySlots.length === 0 ? (
        <EmptyState
          title="No active exam slots"
          description="Requests cannot be shown in slot lanes until the school has active primary slots."
        />
      ) : (
        <div className={selectedRequest ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]" : ""}>
          <ExamRequestsCalendarView
            weekDates={weekDates}
            selectedDate={selectedDate}
            examSlots={examSlots}
            requests={filteredRequests}
            selectedRequestId={selectedRequestId}
            nowMs={nowMs}
            onSelectDate={setSelectedDate}
            onSelectRequest={selectRequest}
          />
          {selectedRequest && (
            <ExamRequestsReviewRail
              request={selectedRequest}
              message={selectedMessage}
              reviewingRequestId={reviewingRequestId}
              nowMs={nowMs}
              showOverflowCapacity={selectedRequestHasActiveOverflow}
              onHide={() => setSelectedRequestId(null)}
              onMessageChange={updateMessage}
              onReview={reviewRequest}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SummaryPill({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div
      className="rounded-[12px] border px-3 py-2"
      style={{
        background: emphasis ? "var(--accent-subtle)" : "var(--surface-panel)",
        borderColor: emphasis ? "var(--accent-border)" : "var(--border-default)",
      }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
        {label}
      </p>
      <p
        className="mt-0.5 text-lg font-semibold tabular-nums"
        style={{ color: emphasis ? "var(--accent-strong)" : "var(--text-primary)" }}
      >
        {value}
      </p>
    </div>
  );
}
