import { useMemo, useState } from "react";
import { Check, Loader2, Mail, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { reviewSchoolJoinRequests } from "./api";
import { formatDate } from "./formatters";
import { EmptyState, ErrorBanner } from "./shared";
import type { Decision, JoinRequest } from "./types";

type JoinRequestsTabProps = {
  schoolId: string;
  joinRequests: JoinRequest[];
  joinRequestError: string | null;
};

export function JoinRequestsTab({
  schoolId,
  joinRequests,
  joinRequestError,
}: JoinRequestsTabProps) {
  const router = useRouter();
  const [reviewedRequestIds, setReviewedRequestIds] = useState<Set<string>>(new Set());
  const [requestDecisions, setRequestDecisions] = useState<Record<string, Decision>>({});
  const [reviewState, setReviewState] = useState<{
    error: string | null;
    success: string | null;
    pending: boolean;
  }>({
    error: null,
    success: null,
    pending: false,
  });
  const visibleJoinRequests = useMemo(
    () => joinRequests.filter((request) => !reviewedRequestIds.has(request.id)),
    [joinRequests, reviewedRequestIds],
  );
  const selectedDecisions = Object.entries(requestDecisions).filter(([requestId]) =>
    visibleJoinRequests.some((request) => request.id === requestId),
  );

  async function reviewRequests() {
    if (selectedDecisions.length === 0) {
      setReviewState({
        error: "Choose at least one request to review.",
        success: null,
        pending: false,
      });
      return;
    }

    setReviewState({ error: null, success: null, pending: true });

    const result = await reviewSchoolJoinRequests({
      schoolId,
      decisions: selectedDecisions.map(([requestId, decision]) => ({ requestId, decision })),
    });

    if (result.error) {
      setReviewState({
        error: result.error,
        success: null,
        pending: false,
      });
      return;
    }

    if (!result.data) {
      setReviewState({
        error: "The review function returned an invalid response.",
        success: null,
        pending: false,
      });
      return;
    }

    const processedIds = selectedDecisions.map(([requestId]) => requestId);
    const reviewed = result.data.approved + result.data.rejected;

    setReviewedRequestIds((current) => new Set([...current, ...processedIds]));
    setRequestDecisions((current) => {
      const next = { ...current };
      for (const requestId of processedIds) {
        delete next[requestId];
      }
      return next;
    });
    setReviewState({
      error: null,
      success: `Reviewed ${reviewed} request${reviewed === 1 ? "" : "s"}.`,
      pending: false,
    });
    router.refresh();
  }

  return (
    <div className="p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Join requests
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Review pending requests created from invite links.
          </p>
        </div>
        <button
          type="button"
          onClick={reviewRequests}
          disabled={reviewState.pending || selectedDecisions.length === 0}
          className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 disabled:cursor-not-allowed"
          style={{
            color: "var(--text-on-accent)",
            background:
              reviewState.pending || selectedDecisions.length === 0
                ? "var(--accent-disabled)"
                : "var(--accent-color)",
            boxShadow:
              reviewState.pending || selectedDecisions.length === 0
                ? "none"
                : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
          }}
        >
          {reviewState.pending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Check size={16} />
          )}
          Confirm
        </button>
      </div>

      {(joinRequestError || reviewState.error) && (
        <ErrorBanner message={reviewState.error ?? joinRequestError ?? ""} />
      )}

      {reviewState.success && (
        <p
          className="anim-fade-in mb-4 text-[0.8125rem] font-medium"
          style={{ color: "var(--accent-strong)" }}
        >
          {reviewState.success}
        </p>
      )}

      <div className="space-y-3">
        {visibleJoinRequests.length === 0 ? (
          <EmptyState
            title="No pending join requests"
            description="New requests will appear here after someone uses an invite link."
          />
        ) : (
          visibleJoinRequests.map((request) => (
            <div
              key={request.id}
              className="rounded-[10px] p-4"
              style={{
                border: "1px solid var(--border-default)",
                background: "var(--surface-panel)",
              }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "var(--accent-subtle)" }}
                  >
                    <UserPlus size={16} color="var(--accent-color)" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {request.name}
                    </p>
                    <div
                      className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <Mail size={12} />
                        <span className="truncate">
                          {request.email ?? "No email available"}
                        </span>
                      </span>
                      <span>Requested {formatDate(request.requestedAt)}</span>
                    </div>
                  </div>
                </div>
                <select
                  value={requestDecisions[request.id] ?? ""}
                  onChange={(event) => {
                    const value = event.target.value as "" | Decision;
                    setRequestDecisions((current) => {
                      const next = { ...current };
                      if (!value) {
                        delete next[request.id];
                      } else {
                        next[request.id] = value;
                      }
                      return next;
                    });
                  }}
                  className="h-[2.625rem] rounded-[10px] px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow]"
                  style={{
                    background: "var(--surface-panel)",
                    border: "1.5px solid var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="">Choose</option>
                  <option value="approved">Accept</option>
                  <option value="rejected">Reject</option>
                </select>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
