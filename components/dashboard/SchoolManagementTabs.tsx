"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Link2,
  Loader2,
  Mail,
  Trash2,
  UserMinus,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getUserFacingErrorMessage,
  getUserFacingFunctionErrorMessage,
} from "@/lib/user-facing-errors";

type SchoolMember = {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  role: SchoolRole;
  joinedAt: string;
  canSelfBook: boolean;
  selfBookingDisabledAt: string | null;
  selfBookingDisabledBy: string | null;
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

type ExamSlot = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
};

type Reservation = {
  id: string;
  userId: string;
  slotId: string;
  reservationDate: string;
  examName: string;
  examType: "midterm" | "final";
  status: string;
  createdAt: string;
};

type Decision = "approved" | "rejected";
type SchoolRole = "admin" | "professor" | "student";
type SchoolDashboardTab = "members" | "reservations" | "requests" | "invites" | "settings";

const roleOptions: SchoolRole[] = ["student", "professor", "admin"];

type Props = {
  schoolId: string;
  schoolName: string;
  members: SchoolMember[];
  invites: SchoolInvite[];
  joinRequests: JoinRequest[];
  examSlots: ExamSlot[];
  reservations: Reservation[];
  memberError: string | null;
  inviteError: string | null;
  joinRequestError: string | null;
  reservationError: string | null;
  canManageMembers: boolean;
  canManageSelfBooking: boolean;
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

function getTodayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatReservationDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatSlotTime(value: string) {
  const [hour = "0", minute = "0"] = value.split(":");
  const date = new Date(2026, 0, 1, Number(hour), Number(minute));

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatExamType(type: Reservation["examType"]) {
  return type[0].toUpperCase() + type.slice(1);
}

export default function SchoolManagementTabs({
  schoolId,
  schoolName,
  members,
  invites,
  joinRequests,
  examSlots,
  reservations,
  memberError,
  inviteError,
  joinRequestError,
  reservationError,
  canManageMembers,
  canManageSelfBooking,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SchoolDashboardTab>("members");
  const [reservationDate, setReservationDate] = useState(getTodayKey);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [expiresOn, setExpiresOn] = useState(getDefaultExpiryDate);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [generatedInvites, setGeneratedInvites] = useState<SchoolInvite[]>([]);
  const [reviewedRequestIds, setReviewedRequestIds] = useState<Set<string>>(new Set());
  const [requestDecisions, setRequestDecisions] = useState<Record<string, Decision>>({});
  const [removedMemberIds, setRemovedMemberIds] = useState<Set<string>>(new Set());
  const [roleOverrides, setRoleOverrides] = useState<Record<string, SchoolRole>>({});
  const [selectedRoles, setSelectedRoles] = useState<Record<string, SchoolRole>>({});
  const [selfBookingOverrides, setSelfBookingOverrides] = useState<Record<string, boolean>>({});
  const [selfBookingState, setSelfBookingState] = useState<{
    error: string | null;
    success: string | null;
    pendingMemberId: string | null;
  }>({
    error: null,
    success: null,
    pendingMemberId: null,
  });
  const [roleState, setRoleState] = useState<{
    error: string | null;
    success: string | null;
    pending: boolean;
  }>({
    error: null,
    success: null,
    pending: false,
  });
  const [kickDialogMemberId, setKickDialogMemberId] = useState<string | null>(null);
  const [kickSecondsRemaining, setKickSecondsRemaining] = useState(5);
  const [kickState, setKickState] = useState<{ error: string | null; pending: boolean }>({
    error: null,
    pending: false,
  });
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
  const visibleMembers = useMemo(
    () =>
      members
        .filter((member) => !removedMemberIds.has(member.id))
        .map((member) => ({
          ...member,
          role: roleOverrides[member.id] ?? member.role,
          canSelfBook: selfBookingOverrides[member.id] ?? member.canSelfBook,
        })),
    [members, removedMemberIds, roleOverrides, selfBookingOverrides],
  );
  const selectedDecisions = Object.entries(requestDecisions).filter(([requestId]) =>
    visibleJoinRequests.some((request) => request.id === requestId),
  );
  const pendingRoleChanges = visibleMembers.flatMap((member) => {
    const selectedRole = selectedRoles[member.id];

    if (!selectedRole || selectedRole === member.role) {
      return [];
    }

    return [{ member, nextRole: selectedRole }];
  });
  const kickDialogMember = kickDialogMemberId
    ? visibleMembers.find((member) => member.id === kickDialogMemberId) ?? null
    : null;
  const memberNamesByUserId = useMemo(
    () => new Map(visibleMembers.map((member) => [member.userId, member.name])),
    [visibleMembers],
  );
  const reservationsBySlotId = useMemo(() => {
    const grouped = new Map<string, Reservation[]>();

    for (const reservation of reservations) {
      if (reservation.reservationDate !== reservationDate) {
        continue;
      }

      const slotReservations = grouped.get(reservation.slotId) ?? [];
      slotReservations.push(reservation);
      grouped.set(reservation.slotId, slotReservations);
    }

    for (const slotReservations of grouped.values()) {
      slotReservations.sort((first, second) => first.createdAt.localeCompare(second.createdAt));
    }

    return grouped;
  }, [reservationDate, reservations]);
  const reservationRowCount = Math.max(8, ...examSlots.map((slot) => slot.capacity));

  useEffect(() => {
    if (!copiedUrl) {
      return;
    }

    const timeout = window.setTimeout(() => setCopiedUrl(null), 1600);
    return () => window.clearTimeout(timeout);
  }, [copiedUrl]);

  useEffect(() => {
    if (!kickDialogMemberId || kickSecondsRemaining === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setKickSecondsRemaining((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [kickDialogMemberId, kickSecondsRemaining]);

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
      console.error("Create school invite failed", error);
      setInviteState({
        error: await getUserFacingFunctionErrorMessage("createInvite", error),
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
      console.error("Review join requests failed", error);
      setReviewState({
        error: await getUserFacingFunctionErrorMessage("reviewJoinRequests", error),
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
    router.refresh();
  }

  async function confirmRoleChanges() {
    if (pendingRoleChanges.length === 0) {
      setRoleState({
        error: "Choose a different role before confirming.",
        success: null,
        pending: false,
      });
      return;
    }

    setRoleState({ error: null, success: null, pending: true });

    const supabase = createClient();
    const results = await Promise.all(
      pendingRoleChanges.map(({ member, nextRole }) =>
        supabase
          .from("SchoolMembers")
          .update({ role: nextRole }, { count: "exact" })
          .eq("id", member.id)
          .eq("school_id", schoolId),
      ),
    );
    const failedResult = results.find((result) => result.error);
    const unchangedResult = results.find((result) => result.count !== 1);

    if (failedResult?.error) {
      console.error("Update member role failed", failedResult.error);
      setRoleState({
        error: getUserFacingErrorMessage("schoolRoleUpdate", failedResult.error),
        success: null,
        pending: false,
      });
      return;
    }

    if (unchangedResult) {
      setRoleState({
        error: "No role changes were applied. Your admin permissions may need to be refreshed.",
        success: null,
        pending: false,
      });
      return;
    }

    setRoleOverrides((current) => {
      const next = { ...current };
      for (const change of pendingRoleChanges) {
        next[change.member.id] = change.nextRole;
      }
      return next;
    });
    setSelectedRoles((current) => {
      const next = { ...current };
      for (const change of pendingRoleChanges) {
        delete next[change.member.id];
      }
      return next;
    });
    setRoleState({
      error: null,
      success: `Updated ${pendingRoleChanges.length} role${pendingRoleChanges.length === 1 ? "" : "s"}.`,
      pending: false,
    });
    router.refresh();
  }

  async function toggleSelfBooking(member: SchoolMember) {
    if (member.role !== "student" || selfBookingState.pendingMemberId) {
      return;
    }

    const nextCanSelfBook = !member.canSelfBook;
    setSelfBookingState({ error: null, success: null, pendingMemberId: member.id });

    const supabase = createClient();
    const { data, error } = await supabase.rpc("set_student_self_booking_permission", {
      target_school_id: schoolId,
      target_member_id: member.id,
      target_can_self_book: nextCanSelfBook,
    });

    if (error) {
      console.error("Update student self-booking permission failed", error);
      setSelfBookingState({
        error: getUserFacingErrorMessage("selfBookingUpdate", error),
        success: null,
        pendingMemberId: null,
      });
      return;
    }

    const [updatedMember] = (data ?? []) as { can_self_book: boolean }[];
    setSelfBookingOverrides((current) => ({
      ...current,
      [member.id]: updatedMember?.can_self_book ?? nextCanSelfBook,
    }));
    setSelfBookingState({
      error: null,
      success: `${member.name} is now ${
        nextCanSelfBook ? "allowed to self-book exams" : "teacher scheduled only"
      }.`,
      pendingMemberId: null,
    });
    router.refresh();
  }

  function openKickDialog(member: SchoolMember) {
    setKickDialogMemberId(member.id);
    setKickSecondsRemaining(5);
    setKickState({ error: null, pending: false });
  }

  function closeKickDialog() {
    if (kickState.pending) {
      return;
    }

    setKickDialogMemberId(null);
    setKickSecondsRemaining(5);
    setKickState({ error: null, pending: false });
  }

  async function kickMember() {
    if (!kickDialogMember || kickSecondsRemaining > 0) {
      return;
    }

    setKickState({ error: null, pending: true });

    const supabase = createClient();
    const { count, error } = await supabase
      .from("SchoolMembers")
      .delete({ count: "exact" })
      .eq("id", kickDialogMember.id)
      .eq("school_id", schoolId)
      .neq("role", "admin");

    if (error) {
      console.error("Kick school member failed", error);
      setKickState({
        error: getUserFacingErrorMessage("schoolMemberKick", error),
        pending: false,
      });
      return;
    }

    if (count !== 1) {
      setKickState({
        error: "No member was kicked. Your admin permissions may need to be refreshed.",
        pending: false,
      });
      return;
    }

    setRemovedMemberIds((current) => new Set([...current, kickDialogMember.id]));
    setKickDialogMemberId(null);
    setKickSecondsRemaining(5);
    setKickState({ error: null, pending: false });
    router.refresh();
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
      console.error("Delete school failed", error);
      setDeleteState({
        error: getUserFacingErrorMessage("schoolDelete", error),
        pending: false,
      });
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  function renderTabButton(tab: SchoolDashboardTab, label: string) {
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
        {renderTabButton("reservations", "Reservations")}
        {canManageMembers && renderTabButton("requests", "Join Requests")}
        {canManageMembers && renderTabButton("invites", "Invites")}
        {canManageMembers && renderTabButton("settings", "Settings")}
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
              {visibleMembers.length} total
            </span>
          </div>

          {(memberError || roleState.error || selfBookingState.error) && (
            <ErrorBanner
              message={selfBookingState.error ?? roleState.error ?? memberError ?? ""}
            />
          )}

          {(roleState.success || selfBookingState.success) && (
            <p className="anim-fade-in mb-4 text-[0.8125rem] font-medium" style={{ color: "#1D4ED8" }}>
              {selfBookingState.success ?? roleState.success}
            </p>
          )}

          {canManageMembers && pendingRoleChanges.length > 0 && (
            <div
              className="anim-fade-in mb-4 rounded-[10px] border border-[#E4E8EF] bg-white p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#111827" }}>
                    Pending role changes
                  </p>
                  <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
                    {pendingRoleChanges.length} member{pendingRoleChanges.length === 1 ? "" : "s"} will be updated.
                  </p>
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoles({});
                      setRoleState({ error: null, success: null, pending: false });
                    }}
                    disabled={roleState.pending}
                    className="inline-flex h-[2.625rem] items-center justify-center rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed"
                    style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmRoleChanges}
                    disabled={roleState.pending}
                    className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold text-white transition-colors duration-150 disabled:cursor-not-allowed"
                    style={{
                      background: roleState.pending ? "#93C5FD" : "#2563EB",
                      boxShadow: roleState.pending
                        ? "none"
                        : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
                    }}
                  >
                    {roleState.pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Confirm changes
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {visibleMembers.map((member) => {
              const selectedRole = selectedRoles[member.id] ?? member.role;
              const canManage = canManageMembers && !member.isCurrentUser && !member.id.startsWith("created-");
              const canKick = canManage && member.role !== "admin";
              const canToggleSelfBooking =
                canManageSelfBooking &&
                member.role === "student" &&
                !member.isCurrentUser &&
                !member.id.startsWith("created-");
              const selfBookingPending = selfBookingState.pendingMemberId === member.id;

              return (
              <div
                key={member.id}
                className="rounded-[10px] border border-[#E4E8EF] p-4"
                style={{ background: "#FFFFFF" }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                    {member.role === "student" && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full px-3 py-1 text-xs font-semibold"
                          style={
                            member.canSelfBook
                              ? { background: "#DBEAFE", color: "#1D4ED8" }
                              : { background: "#E2E8F0", color: "#64748B" }
                          }
                        >
                          {member.canSelfBook ? "Self booking on" : "Teacher scheduled only"}
                        </span>
                        {!member.canSelfBook && member.selfBookingDisabledAt && (
                          <span className="text-xs" style={{ color: "#9CA3AF" }}>
                            Since {formatDate(member.selfBookingDisabledAt)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  {canToggleSelfBooking && (
                    <button
                      type="button"
                      onClick={() => toggleSelfBooking(member)}
                      disabled={!!selfBookingState.pendingMemberId}
                      className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed"
                      style={{ border: "1px solid #E4E8EF", color: "#374151" }}
                    >
                      {selfBookingPending && <Loader2 size={16} className="animate-spin" />}
                      {member.canSelfBook ? "Restrict booking" : "Allow booking"}
                    </button>
                  )}
                  <select
                    value={selectedRole}
                    onChange={(event) => {
                      const value = event.target.value as SchoolRole;
                      setSelectedRoles((current) => ({
                        ...current,
                        [member.id]: value,
                      }));
                      setRoleState((current) => ({ ...current, error: null, success: null }));
                    }}
                    disabled={!canManage || roleState.pending}
                    className="h-[2.625rem] rounded-[10px] bg-white px-3 text-[0.9375rem] capitalize outline-none transition-[border-color,box-shadow] disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]"
                    style={{ border: "1.5px solid #E4E8EF", color: canManage ? "#111827" : "#94A3B8" }}
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  {canKick && (
                    <button
                      type="button"
                      onClick={() => openKickDialog(member)}
                      disabled={kickState.pending}
                      className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed"
                      style={{ border: "1px solid #E4E8EF", color: "#DC2626" }}
                    >
                      <UserMinus size={16} />
                      Kick
                    </button>
                  )}
                </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "reservations" && (
        <div className="p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "#111827" }}>
                Reservations
              </h2>
              <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
                Confirmed student exams for {formatReservationDate(reservationDate)}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReservationDate((current) => addDays(current, -1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-slate-50"
                style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
                aria-label="Previous day"
              >
                <ChevronLeft size={16} />
              </button>
              <span
                className="min-w-[150px] rounded-xl px-3 py-2 text-center text-sm font-semibold"
                style={{ border: "1px solid #E4E8EF", color: "#111827" }}
              >
                {formatReservationDate(reservationDate)}
              </span>
              <button
                type="button"
                onClick={() => setReservationDate((current) => addDays(current, 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-slate-50"
                style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
                aria-label="Next day"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {reservationError && <ErrorBanner message={reservationError} />}

          {examSlots.length === 0 ? (
            <EmptyState
              title="No exam slots configured"
              description="Reservations will appear here after this school has reusable exam slots."
            />
          ) : (
            <div className="overflow-x-auto">
              <div
                className="grid min-w-[760px] gap-3"
                style={{ gridTemplateColumns: `repeat(${examSlots.length}, minmax(0, 1fr))` }}
              >
                {examSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="rounded-[10px] border border-[#E4E8EF] bg-white p-3"
                  >
                    <p className="text-sm font-semibold" style={{ color: "#111827" }}>
                      {slot.name}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "#9CA3AF" }}>
                      {formatSlotTime(slot.startsAt)} - {formatSlotTime(slot.endsAt)}
                    </p>
                  </div>
                ))}

                {Array.from({ length: reservationRowCount }, (_, seatIndex) =>
                  examSlots.map((slot) => {
                    const reservation = reservationsBySlotId.get(slot.id)?.[seatIndex] ?? null;
                    const isBeyondCapacity = seatIndex >= slot.capacity;

                    return (
                      <div
                        key={`${slot.id}-${seatIndex}`}
                        className="min-h-[92px] rounded-[10px] border p-3"
                        style={{
                          background: reservation ? "#FFFFFF" : "#F8FAFC",
                          borderColor: reservation ? "#BFDBFE" : "#E4E8EF",
                        }}
                      >
                        {reservation ? (
                          <div>
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold" style={{ color: "#111827" }}>
                                {memberNamesByUserId.get(reservation.userId) ?? "Unnamed student"}
                              </p>
                              <span
                                className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                                style={{ background: "#DBEAFE", color: "#1D4ED8" }}
                              >
                                Seat {seatIndex + 1}
                              </span>
                            </div>
                            <p className="truncate text-sm" style={{ color: "#374151" }}>
                              {reservation.examName}
                            </p>
                            <p className="mt-1 text-xs font-medium" style={{ color: "#9CA3AF" }}>
                              {formatExamType(reservation.examType)}
                            </p>
                          </div>
                        ) : (
                          <div className="flex h-full min-h-[66px] items-center justify-center text-xs">
                            <span style={{ color: isBeyondCapacity ? "#CBD5E1" : "#94A3B8" }}>
                              {isBeyondCapacity ? "Unavailable" : `Seat ${seatIndex + 1}`}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }),
                )}
              </div>
            </div>
          )}
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

      {kickDialogMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kick-student-title"
        >
          <div className="panel w-full max-w-[420px] p-5 shadow-[0_18px_60px_rgba(15,23,42,0.18)]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="kick-student-title"
                  className="text-sm font-semibold"
                  style={{ color: "#111827" }}
                >
                  Kick {kickDialogMember.name}
                </h2>
                <p className="mt-1 text-sm" style={{ color: "#6B7280", lineHeight: 1.5 }}>
                  This removes the member from {schoolName}. They will need a new approved join request to return.
                </p>
              </div>
              <button
                type="button"
                onClick={closeKickDialog}
                disabled={kickState.pending}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed"
                style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
                aria-label="Close dialog"
              >
                <X size={15} />
              </button>
            </div>

            {kickState.error && <ErrorBanner message={kickState.error} />}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeKickDialog}
                disabled={kickState.pending}
                className="inline-flex h-[2.625rem] items-center justify-center rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed"
                style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={kickMember}
                disabled={kickState.pending || kickSecondsRemaining > 0}
                className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold text-white transition-colors duration-150 disabled:cursor-not-allowed"
                style={{
                  background: kickState.pending || kickSecondsRemaining > 0 ? "#93C5FD" : "#2563EB",
                  boxShadow:
                    kickState.pending || kickSecondsRemaining > 0
                      ? "none"
                      : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
                }}
              >
                {kickState.pending && <Loader2 size={16} className="animate-spin" />}
                {kickSecondsRemaining > 0 ? `Confirm in ${kickSecondsRemaining}s` : "Confirm Kick"}
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
