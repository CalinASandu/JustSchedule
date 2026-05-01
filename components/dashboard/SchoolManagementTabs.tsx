"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Link2,
  Loader2,
  Mail,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type SchoolMember = {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  role: string;
  joinedAt: string;
  isCurrentUser: boolean;
};

type SchoolInvite = {
  id: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  url: string;
};

type JoinRequest = {
  id: string;
  userId: string;
  schoolId: string;
  name: string;
  email: string | null;
  requestedAt: string;
};

type Decision = "approved" | "rejected";

type Props = {
  schoolId: string;
  schoolName: string;
  members: SchoolMember[];
  invites: SchoolInvite[];
  joinRequests: JoinRequest[];
  memberError: string | null;
  inviteError: string | null;
  joinRequestError: string | null;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDefaultExpiryDate() {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
}

function dateInputToEndOfDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();
}

export default function SchoolManagementTabs({
  schoolId,
  schoolName,
  members,
  invites,
  joinRequests,
  memberError,
  inviteError,
  joinRequestError,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"members" | "requests" | "invites" | "settings">("members");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [expiresOn, setExpiresOn] = useState(getDefaultExpiryDate);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [generatedInvites, setGeneratedInvites] = useState<SchoolInvite[]>([]);
  const [reviewedRequestIds, setReviewedRequestIds] = useState<Set<string>>(new Set());
  const [requestDecisions, setRequestDecisions] = useState<Record<string, Decision>>({});
  const [inviteState, setInviteState] = useState<{ error: string | null; pending: boolean }>({
    error: null,
    pending: false,
  });
  const [reviewState, setReviewState] = useState<{
    error: string | null;
    success: string | null;
    pending: boolean;
  }>({
    error: null,
    success: null,
    pending: false,
  });
  const [deleteState, setDeleteState] = useState<{ error: string | null; pending: boolean }>({
    error: null,
    pending: false,
  });
  const visibleInvites = useMemo(() => {
    const existingUrls = new Set(invites.map((invite) => invite.url));
    return [
      ...generatedInvites.filter((invite) => !existingUrls.has(invite.url)),
      ...invites,
    ];
  }, [generatedInvites, invites]);
  const visibleJoinRequests = useMemo(
    () => joinRequests.filter((request) => !reviewedRequestIds.has(request.id)),
    [joinRequests, reviewedRequestIds],
  );
  const selectedDecisions = Object.entries(requestDecisions).filter(([requestId]) =>
    visibleJoinRequests.some((request) => request.id === requestId),
  );

  useEffect(() => {
    if (!copiedUrl) {
      return;
    }

    const timeout = window.setTimeout(() => setCopiedUrl(null), 1600);
    return () => window.clearTimeout(timeout);
  }, [copiedUrl]);

  async function copyInvite(url: string) {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(url);
  }

  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteState({ error: null, pending: true });

    const expiresAt = dateInputToEndOfDay(expiresOn);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setInviteState({ error: "You need to sign in again.", pending: false });
      return;
    }

    const { data, error } = await supabase.functions.invoke("create-school-invite", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        schoolId,
        expiresAt,
        siteUrl: window.location.origin,
      },
    });

    if (error) {
      setInviteState({
        error: error.message || "Could not create invite link.",
        pending: false,
      });
      return;
    }

    const inviteLink =
      typeof data === "object" && data && "inviteLink" in data
        ? String(data.inviteLink)
        : "";

    if (!inviteLink) {
      setInviteState({ error: "The invite function returned an invalid response.", pending: false });
      return;
    }

    setGeneratedInvites((current) => [
      {
        id: `generated-${crypto.randomUUID()}`,
        token: inviteLink.split("/").pop() ?? "",
        createdAt: new Date().toISOString(),
        expiresAt,
        isActive: true,
        url: inviteLink,
      },
      ...current,
    ]);
    setInviteState({ error: null, pending: false });
  }

  async function reviewRequests() {
    if (selectedDecisions.length === 0) {
      setReviewState({ error: "Choose at least one request to review.", success: null, pending: false });
      return;
    }

    setReviewState({ error: null, success: null, pending: true });

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setReviewState({ error: "You need to sign in again.", success: null, pending: false });
      return;
    }

    const { data, error } = await supabase.functions.invoke("review-school-join-requests", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        schoolId,
        decisions: selectedDecisions.map(([requestId, decision]) => ({ requestId, decision })),
      },
    });

    if (error) {
      setReviewState({
        error: error.message || "Could not review join requests.",
        success: null,
        pending: false,
      });
      return;
    }

    const approved =
      typeof data === "object" && data && "approved" in data ? Number(data.approved) : 0;
    const rejected =
      typeof data === "object" && data && "rejected" in data ? Number(data.rejected) : 0;
    const processedIds = selectedDecisions.map(([requestId]) => requestId);

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
      success: `Reviewed ${approved + rejected} request${approved + rejected === 1 ? "" : "s"}.`,
      pending: false,
    });
  }

  async function deleteSchool() {
    if (deleteConfirmation !== schoolName) {
      setDeleteState({ error: "Type the school name exactly before deleting.", pending: false });
      return;
    }

    setDeleteState({ error: null, pending: true });

    const supabase = createClient();
    const { error } = await supabase.from("Schools").delete().eq("id", schoolId);

    if (error) {
      setDeleteState({
        error: error.message || "Could not delete this school.",
        pending: false,
      });
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  function renderTabButton(tab: "members" | "requests" | "invites" | "settings", label: string) {
    return (
      <button
        type="button"
        onClick={() => setActiveTab(tab)}
        className="h-10 rounded-t-[10px] px-4 text-sm font-semibold transition-colors duration-150"
        style={
          activeTab === tab
            ? { background: "#EFF6FF", color: "#1D4ED8" }
            : { color: "#6B7280" }
        }
      >
        {label}
      </button>
    );
  }

  return (
    <section className="panel anim-slide-up anim-d1 overflow-hidden">
      <div className="flex border-b border-[#E4E8EF] px-2 pt-2">
        {renderTabButton("members", "Members")}
        {renderTabButton("requests", "Join Requests")}
        {renderTabButton("invites", "Invites")}
        {renderTabButton("settings", "Settings")}
      </div>

      {activeTab === "members" && (
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "#111827" }}>
                School members
              </h2>
              <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
                Current users and their roles in this school.
              </p>
            </div>
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: "#DBEAFE", color: "#1D4ED8" }}
            >
              {members.length} total
            </span>
          </div>

          {memberError && <ErrorBanner message={memberError} />}

          <div className="divide-y divide-[#E4E8EF]">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "#EFF6FF" }}
                  >
                    <UserRound size={16} color="#2563EB" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold" style={{ color: "#111827" }}>
                        {member.name}
                      </p>
                      {member.isCurrentUser && (
                        <span className="text-xs font-medium" style={{ color: "#9CA3AF" }}>
                          You
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs" style={{ color: "#9CA3AF" }}>
                      {member.email ?? `Joined ${formatDate(member.joinedAt)}`}
                    </p>
                  </div>
                </div>
                <span
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize"
                  style={
                    member.role === "admin"
                      ? { background: "#DBEAFE", color: "#1D4ED8" }
                      : { background: "#E2E8F0", color: "#64748B" }
                  }
                >
                  {member.role === "admin" && <ShieldCheck size={13} strokeWidth={1.8} />}
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "requests" && (
        <div className="p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "#111827" }}>
                Join requests
              </h2>
              <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
                Review pending requests created from invite links.
              </p>
            </div>
            <button
              type="button"
              onClick={reviewRequests}
              disabled={reviewState.pending || selectedDecisions.length === 0}
              className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold text-white transition-colors duration-150 disabled:cursor-not-allowed"
              style={{
                background: reviewState.pending || selectedDecisions.length === 0 ? "#93C5FD" : "#2563EB",
                boxShadow:
                  reviewState.pending || selectedDecisions.length === 0
                    ? "none"
                    : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
              }}
            >
              {reviewState.pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Confirm
            </button>
          </div>

          {(joinRequestError || reviewState.error) && (
            <ErrorBanner message={reviewState.error ?? joinRequestError ?? ""} />
          )}

          {reviewState.success && (
            <p className="anim-fade-in mb-4 text-[0.8125rem] font-medium" style={{ color: "#1D4ED8" }}>
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
                  className="rounded-[10px] border border-[#E4E8EF] p-4"
                  style={{ background: "#FFFFFF" }}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ background: "#EFF6FF" }}
                      >
                        <UserPlus size={16} color="#2563EB" strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold" style={{ color: "#111827" }}>
                          {request.name}
                        </p>
                        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "#9CA3AF" }}>
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <Mail size={12} />
                            <span className="truncate">{request.email ?? "No email available"}</span>
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
                      className="h-[2.625rem] rounded-[10px] bg-white px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow]"
                      style={{ border: "1.5px solid #E4E8EF", color: "#111827" }}
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
      )}

      {activeTab === "invites" && (
        <div className="p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "#111827" }}>
                Invite links
              </h2>
              <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
                Generate links like /invite/invitetoken.
              </p>
            </div>
            <form onSubmit={createInvite} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div>
                <label
                  htmlFor="invite-expires-on"
                  className="mb-1.5 block text-[0.8125rem] font-medium"
                  style={{ color: "#374151" }}
                >
                  Expires on
                </label>
                <input
                  id="invite-expires-on"
                  type="date"
                  required
                  min={new Date().toISOString().slice(0, 10)}
                  value={expiresOn}
                  onChange={(event) => setExpiresOn(event.target.value)}
                  className="h-[2.625rem] rounded-[10px] bg-white px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow]"
                  style={{ border: "1.5px solid #E4E8EF", color: "#111827" }}
                  onFocus={(event) => {
                    event.currentTarget.style.borderColor = "#3B82F6";
                    event.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)";
                  }}
                  onBlur={(event) => {
                    event.currentTarget.style.borderColor = "#E4E8EF";
                    event.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={inviteState.pending}
                className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold text-white transition-colors duration-150 disabled:cursor-not-allowed"
                style={{
                  background: inviteState.pending ? "#93C5FD" : "#2563EB",
                  boxShadow: inviteState.pending
                    ? "none"
                    : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
                }}
              >
                {inviteState.pending ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                Generate link
              </button>
            </form>
          </div>

          {(inviteState.error || inviteError) && (
            <ErrorBanner message={inviteState.error ?? inviteError ?? ""} />
          )}

          <div className="space-y-3">
            {visibleInvites.length === 0 ? (
              <EmptyState
                title="No invite links yet"
                description="Generate one when you are ready to invite students or professors."
              />
            ) : (
              visibleInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="rounded-[10px] border border-[#E4E8EF] p-4"
                  style={{ background: "#FFFFFF" }}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold" style={{ color: "#111827" }}>
                        {invite.url}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: "#9CA3AF" }}>
                        Expires {formatDate(invite.expiresAt)} ·{" "}
                        {invite.isActive ? "Active" : "Inactive"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyInvite(invite.url)}
                      className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors duration-150 hover:bg-slate-50"
                      style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
                    >
                      {copiedUrl === invite.url ? <Check size={15} /> : <Copy size={15} />}
                      {copiedUrl === invite.url ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold" style={{ color: "#111827" }}>
              School settings
            </h2>
            <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
              Delete this school and all related memberships, invites, and join requests.
            </p>
          </div>

          <div
            className="rounded-[10px] border p-4"
            style={{ background: "#FFFFFF", borderColor: "#FECACA" }}
          >
            <div className="mb-4 flex items-start gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: "#FEF2F2" }}
              >
                <Trash2 size={16} color="#DC2626" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#111827" }}>
                  Delete school
                </p>
                <p className="mt-1 text-sm" style={{ color: "#6B7280", lineHeight: 1.5 }}>
                  This permanently deletes {schoolName}. Type the school name exactly to confirm.
                </p>
              </div>
            </div>

            {deleteState.error && <ErrorBanner message={deleteState.error} />}

            <label
              htmlFor="delete-school-confirmation"
              className="mb-1.5 block text-[0.8125rem] font-medium"
              style={{ color: "#374151" }}
            >
              School name
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="delete-school-confirmation"
                type="text"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                placeholder={schoolName}
                className="h-[2.625rem] min-w-0 flex-1 rounded-[10px] bg-white px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow]"
                style={{ border: "1.5px solid #E4E8EF", color: "#111827" }}
                onFocus={(event) => {
                  event.currentTarget.style.borderColor = "#3B82F6";
                  event.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)";
                }}
                onBlur={(event) => {
                  event.currentTarget.style.borderColor = "#E4E8EF";
                  event.currentTarget.style.boxShadow = "none";
                }}
              />
              <button
                type="button"
                onClick={deleteSchool}
                disabled={deleteState.pending || deleteConfirmation !== schoolName}
                className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold text-white transition-colors duration-150 disabled:cursor-not-allowed"
                style={{
                  background:
                    deleteState.pending || deleteConfirmation !== schoolName
                      ? "#93C5FD"
                      : "#2563EB",
                  boxShadow:
                    deleteState.pending || deleteConfirmation !== schoolName
                      ? "none"
                      : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
                }}
              >
                {deleteState.pending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete school
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p
      className="anim-fade-in mb-4 text-[0.8125rem]"
      style={{
        color: "#DC2626",
        background: "#FEF2F2",
        border: "1px solid #FECACA",
        borderRadius: 8,
        padding: "0.5rem 0.75rem",
      }}
    >
      {message}
    </p>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[10px] border border-dashed border-[#C7D2FE] p-4">
      <p className="text-sm font-medium" style={{ color: "#111827" }}>
        {title}
      </p>
      <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
        {description}
      </p>
    </div>
  );
}
