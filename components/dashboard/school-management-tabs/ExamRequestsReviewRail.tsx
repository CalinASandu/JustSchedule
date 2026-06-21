import { Check, Clock, Loader2, Mail, PanelRightClose, X } from "lucide-react";
import { formatExamType, formatReservationDate, formatSlotTime } from "./formatters";
import type { ScheduleRequest } from "./types";

type ExamRequestsReviewRailProps = {
  request: ScheduleRequest | null;
  message: string;
  reviewingRequestId: string | null;
  nowMs: number;
  showOverflowCapacity: boolean;
  onHide: () => void;
  onMessageChange: (requestId: string, message: string) => void;
  onReview: (request: ScheduleRequest, decision: "approved" | "declined") => void;
};

function formatExpiry(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getTimeToExpiry(value: string, nowMs: number) {
  const diffMs = new Date(value).getTime() - nowMs;

  if (diffMs <= 0) {
    return "Expired";
  }

  const hours = Math.floor(diffMs / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d left`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }

  return `${Math.max(minutes, 1)}m left`;
}

export function ExamRequestsReviewRail({
  request,
  message,
  reviewingRequestId,
  nowMs,
  showOverflowCapacity,
  onHide,
  onMessageChange,
  onReview,
}: ExamRequestsReviewRailProps) {
  if (!request) {
    return (
      <aside
        className="hidden rounded-[12px] border bg-white p-4 lg:block"
        style={{ borderColor: "#E4E8EF" }}
      >
        <div
          className="flex min-h-[320px] items-center justify-center rounded-[10px] border border-dashed px-4 text-center text-sm"
          style={{ borderColor: "#E4E8EF", color: "#94A3B8", background: "#FAFAFA" }}
        >
          Select a request to review.
        </div>
      </aside>
    );
  }

  const primaryRemaining = Math.max(request.capacity - request.primaryBooked, 0);
  const overflowRemaining =
    !showOverflowCapacity || request.overflowCapacity === null
      ? null
      : Math.max(request.overflowCapacity - request.overflowBooked, 0);
  const isReviewing = reviewingRequestId === request.id;
  const reviewDisabled = !!reviewingRequestId;

  return (
    <aside
      className="rounded-[12px] border bg-white p-4 xl:sticky xl:top-20"
      style={{ borderColor: "#E4E8EF" }}
      aria-label="Review selected exam request"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#94A3B8" }}>
            Review request
          </p>
          <h3 className="mt-1 break-words text-base font-semibold" style={{ color: "#111827" }}>
            {request.studentName}
          </h3>
          {request.studentEmail && (
            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs" style={{ color: "#6B7280" }}>
              <Mail size={12} aria-hidden="true" />
              <span className="truncate">{request.studentEmail}</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: "#FEF3C7", color: "#B45309" }}
          >
            <Clock size={12} aria-hidden="true" />
            {getTimeToExpiry(request.expiresAt, nowMs)}
          </span>
          <button
            type="button"
            onClick={onHide}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            style={{ borderColor: "#E4E8EF", color: "#6B7280" }}
            aria-label="Hide review rail"
          >
            <PanelRightClose size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-[10px] border p-3" style={{ borderColor: "#E4E8EF", background: "#F8FAFC" }}>
        <p className="truncate text-sm font-semibold" style={{ color: "#111827" }}>
          {request.examName}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: "#DBEAFE", color: "#1D4ED8" }}
          >
            {formatExamType(request.examType)}
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: "#FFFFFF", color: "#64748B", border: "1px solid #E4E8EF" }}
          >
            Pending
          </span>
        </div>
      </div>

      <dl className="mt-4 grid gap-2 text-sm">
        <DetailRow label="Date" value={formatReservationDate(request.reservationDate)} />
        <DetailRow
          label="Slot"
          value={`${request.slotName} · ${formatSlotTime(request.startsAt)}-${formatSlotTime(
            request.endsAt,
          )}`}
        />
        <DetailRow label="Teacher" value={request.teacherName} />
        <DetailRow
          label="Expires"
          value={`${formatExpiry(request.expiresAt)} (2 hours before exam)`}
        />
      </dl>

      <div className="mt-4 grid gap-2">
        <CapacityRow
          label="Main room"
          value={`${primaryRemaining} of ${request.capacity} seats open`}
          full={primaryRemaining === 0}
        />
        {overflowRemaining !== null && request.overflowCapacity !== null && (
          <CapacityRow
            label="Overflow"
            value={`${overflowRemaining} of ${request.overflowCapacity} seats open`}
            full={overflowRemaining === 0}
          />
        )}
      </div>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-[0.8125rem] font-medium" style={{ color: "#374151" }}>
          Optional message
        </span>
        <input
          type="text"
          name={`review-message-${request.id}`}
          value={message}
          onChange={(event) => onMessageChange(request.id, event.target.value)}
          placeholder="Add a note for the student…"
          className="h-[2.625rem] w-full rounded-[10px] bg-white px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow] focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
          style={{ border: "1.5px solid #E4E8EF", color: "#111827" }}
        />
      </label>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onReview(request, "declined")}
          disabled={reviewDisabled}
          className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-semibold transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed"
          style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
        >
          {isReviewing ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
          Decline
        </button>
        <button
          type="button"
          onClick={() => onReview(request, "approved")}
          disabled={reviewDisabled}
          className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-semibold text-white transition-colors duration-150 disabled:cursor-not-allowed"
          style={{
            background: reviewDisabled ? "#93C5FD" : "#2563EB",
            boxShadow: reviewDisabled
              ? "none"
              : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
          }}
        >
          {isReviewing ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          Approve
        </button>
      </div>
    </aside>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-[#F3F4F6] py-2 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-xs font-medium" style={{ color: "#94A3B8" }}>
        {label}
      </dt>
      <dd className="min-w-0 break-words font-medium sm:text-right" style={{ color: "#111827" }}>
        {value}
      </dd>
    </div>
  );
}

function CapacityRow({ label, value, full }: { label: string; value: string; full: boolean }) {
  return (
    <div className="rounded-[10px] border px-3 py-2" style={{ borderColor: "#E4E8EF" }}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold" style={{ color: "#6B7280" }}>
          {label}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={full ? { background: "#E2E8F0", color: "#64748B" } : { background: "#DBEAFE", color: "#1D4ED8" }}
        >
          {full ? "Full" : "Open"}
        </span>
      </div>
      <p className="mt-1 text-sm font-semibold" style={{ color: "#111827" }}>
        {value}
      </p>
    </div>
  );
}
