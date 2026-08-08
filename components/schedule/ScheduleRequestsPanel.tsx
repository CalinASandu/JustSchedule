"use client";

import { CheckCheck, Clock3, Loader2, X } from "lucide-react";
import type { ScheduleRequest } from "./types";

type ScheduleRequestsPanelProps = {
  requests: ScheduleRequest[];
  cancelingRequestId: string | null;
  markingSeenRequestId: string | null;
  cancelError: string | null;
  markSeenError: string | null;
  onCancelRequest: (request: ScheduleRequest) => void;
  onMarkSeen: (request: ScheduleRequest) => void;
};

function formatDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value: string) {
  const [hour = "0", minute = "0"] = value.split(":");
  return new Date(2026, 0, 1, Number(hour), Number(minute)).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusCopy(status: ScheduleRequest["status"]) {
  switch (status) {
    case "pending":
      return { label: "Pending", description: "Waiting for professor approval." };
    case "approved":
      return { label: "Approved", description: "A confirmed reservation was created." };
    case "declined":
      return { label: "Declined", description: "The request was declined." };
    case "expired":
      return { label: "Expired", description: "The request passed the two-hour cutoff." };
    case "failed_capacity":
      return { label: "Slot filled", description: "No seat was available when reviewed." };
    case "failed_conflict":
      return { label: "Conflict", description: "This time could not be reserved for you." };
    case "cancelled":
      return { label: "Cancelled", description: "You cancelled this request." };
  }
}

export default function ScheduleRequestsPanel({
  requests,
  cancelingRequestId,
  markingSeenRequestId,
  cancelError,
  markSeenError,
  onCancelRequest,
  onMarkSeen,
}: ScheduleRequestsPanelProps) {
  return (
    <div className="panel p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "var(--accent-subtle)" }}
        >
          <Clock3 size={16} color="var(--accent-color)" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Exam requests
          </h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Requests do not hold seats until approved.
          </p>
        </div>
      </div>

      {(cancelError || markSeenError) && (
        <p
          className="anim-fade-in mb-4 text-[0.8125rem]"
          style={{
            color: "var(--danger)",
            background: "var(--danger-subtle)",
            border: "1px solid var(--danger-border)",
            borderRadius: 8,
            padding: "0.5rem 0.75rem",
          }}
        >
          {cancelError ?? markSeenError}
        </p>
      )}

      {requests.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-[var(--accent-border)] p-4">
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            No exam requests
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Requests you send to professors will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const status = getStatusCopy(request.status);
            const pending = request.status === "pending";
            const canMarkSeen = request.status === "approved" || request.status === "declined";
            const markingSeen = markingSeenRequestId === request.id;

            return (
              <div
                key={request.id}
                className="rounded-[10px] border border-[var(--border-default)] p-4"
                style={{ background: "var(--surface-panel)" }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {request.examName}
                      </p>
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{
                          background: pending ? "var(--accent-subtle)" : "var(--surface-subtle)",
                          color: pending ? "var(--accent-strong)" : "var(--text-secondary)",
                        }}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {formatDate(request.reservationDate)} at {formatTime(request.startsAt)}
                      {" - "}
                      {formatTime(request.endsAt)}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                      Sent to {request.teacherName}. {status.description}
                    </p>
                    {request.reviewerMessage && (
                      <p className="mt-2 text-sm" style={{ color: "var(--text-body)" }}>
                        {request.reviewerMessage}
                      </p>
                    )}
                  </div>

                  {pending ? (
                    <button
                      type="button"
                      onClick={() => onCancelRequest(request)}
                      disabled={cancelingRequestId === request.id || !!markingSeenRequestId}
                      className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-[10px] px-3 text-sm font-semibold transition-colors duration-150 hover:bg-[var(--surface-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] disabled:cursor-not-allowed sm:h-9 sm:w-auto"
                      style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
                    >
                      {cancelingRequestId === request.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <X size={14} />
                      )}
                      Cancel
                    </button>
                  ) : canMarkSeen ? (
                    <button
                      type="button"
                      onClick={() => onMarkSeen(request)}
                      disabled={markingSeen || !!cancelingRequestId}
                      className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-[10px] px-3 text-sm font-semibold transition-colors duration-150 hover:bg-[var(--surface-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] disabled:cursor-not-allowed sm:h-9 sm:w-auto"
                      style={{ border: "1px solid var(--border-default)", color: "var(--accent-color)" }}
                    >
                      {markingSeen ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCheck size={14} />
                      )}
                      Mark seen
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
