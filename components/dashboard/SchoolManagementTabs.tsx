"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Ban,
  Check,
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Link2,
  Loader2,
  Mail,
  Play,
  Plus,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import SubjectCommandPalette from "@/components/schedule/SubjectCommandPalette";
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
  createdBy: string;
  createdByRole: SchoolRole;
  attendanceStatus: AttendanceStatus;
  attendanceMarkedBy: string | null;
  attendanceMarkedAt: string | null;
};

type AttendanceSession = {
  id: string;
  schoolId: string;
  slotId: string;
  reservationDate: string;
  startedBy: string;
  startedAt: string;
  expiresAt: string;
};

type Decision = "approved" | "rejected";
type AttendanceStatus = "present" | "absent";
type SchoolRole = "admin" | "professor" | "exam_supervisor" | "student";
type ExamType = "midterm" | "final";
type SchoolDashboardTab =
  | "members"
  | "reservations"
  | "attendance"
  | "requests"
  | "invites"
  | "settings";
type ReservationViewMode = "day" | "week";

const roleOptions: SchoolRole[] = ["student", "exam_supervisor", "professor", "admin"];

type SchoolSubject = {
  id: string;
  name: string;
};

type Props = {
  schoolId: string;
  schoolName: string;
  members: SchoolMember[];
  invites: SchoolInvite[];
  joinRequests: JoinRequest[];
  examSlots: ExamSlot[];
  reservations: Reservation[];
  attendanceSessions: AttendanceSession[];
  schoolSubjects: SchoolSubject[];
  currentUserRole: Exclude<SchoolRole, "student">;
  memberError: string | null;
  inviteError: string | null;
  joinRequestError: string | null;
  reservationError: string | null;
  canManageMembers: boolean;
  canManageSelfBooking: boolean;
  canViewAttendance: boolean;
  canMarkAttendance: boolean;
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

function getMaxBookingDate() {
  return addDays(getTodayKey(), 14);
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

function getWeekDates(dateKey: string) {
  const anchor = new Date(`${dateKey}T00:00:00`);
  const day = anchor.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  return Array.from({ length: 7 }, (_, index) => addDays(dateKey, mondayOffset + index));
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

function formatRole(role: SchoolRole) {
  return role === "exam_supervisor" ? "Exam supervisor" : role;
}

function getSlotDateTime(dateKey: string, timeValue: string) {
  return new Date(`${dateKey}T${timeValue}`);
}

const ATTENDANCE_OPEN_BEFORE_MS = 5 * 60 * 1000;
const ATTENDANCE_CLOSE_AFTER_MS = 25 * 60 * 1000;

function isAttendanceMarkingOpen(
  dateKey: string,
  slot: ExamSlot | null,
  session: AttendanceSession | null,
) {
  if (!slot) {
    return false;
  }

  const now = new Date();

  if (session && new Date(session.expiresAt) > now) {
    return true;
  }

  const startsAt = getSlotDateTime(dateKey, slot.startsAt);
  const opensAt = new Date(startsAt.getTime() - ATTENDANCE_OPEN_BEFORE_MS);
  const closesAt = new Date(startsAt.getTime() + ATTENDANCE_CLOSE_AFTER_MS);

  return now >= opensAt && now <= closesAt;
}

function getAttendanceWindowLabel(
  dateKey: string,
  slot: ExamSlot | null,
  session: AttendanceSession | null,
) {
  if (!slot) {
    return "Choose a slot";
  }

  if (session && new Date(session.expiresAt) > new Date()) {
    return "Started for testing";
  }

  const now = new Date();
  const startsAt = getSlotDateTime(dateKey, slot.startsAt);
  const opensAt = new Date(startsAt.getTime() - ATTENDANCE_OPEN_BEFORE_MS);
  const closesAt = new Date(startsAt.getTime() + ATTENDANCE_CLOSE_AFTER_MS);

  if (now < opensAt) {
    return `Opens at ${opensAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  if (now > closesAt) {
    return "Closed";
  }

  return `Open until ${closesAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export default function SchoolManagementTabs({
  schoolId,
  schoolName,
  members,
  invites,
  joinRequests,
  examSlots,
  reservations,
  attendanceSessions,
  schoolSubjects: initialSchoolSubjects,
  currentUserRole,
  memberError,
  inviteError,
  joinRequestError,
  reservationError,
  canManageMembers,
  canManageSelfBooking,
  canViewAttendance,
  canMarkAttendance,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SchoolDashboardTab>(
    currentUserRole === "exam_supervisor" ? "reservations" : "members",
  );
  const [reservationDate, setReservationDate] = useState(getTodayKey);
  const [reservationViewMode, setReservationViewMode] = useState<ReservationViewMode>("day");
  const [attendanceDate, setAttendanceDate] = useState(getTodayKey);
  const [attendanceSlotId, setAttendanceSlotId] = useState(() => examSlots[0]?.id ?? "");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
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
  const [subjects, setSubjects] = useState<SchoolSubject[]>(initialSchoolSubjects);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [subjectState, setSubjectState] = useState<{
    error: string | null;
    success: string | null;
    pending: boolean;
  }>({ error: null, success: null, pending: false });
  const [kickDialogMemberId, setKickDialogMemberId] = useState<string | null>(null);
  const [kickSecondsRemaining, setKickSecondsRemaining] = useState(5);
  const [scheduleDialogMemberId, setScheduleDialogMemberId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState(getTodayKey);
  const [scheduleSlotId, setScheduleSlotId] = useState("");
  const [scheduleExamName, setScheduleExamName] = useState("");
  const [scheduleExamType, setScheduleExamType] = useState<ExamType>("midterm");
  const [scheduleState, setScheduleState] = useState<{
    error: string | null;
    success: string | null;
    pending: boolean;
  }>({
    error: null,
    success: null,
    pending: false,
  });
  const [cancelledReservationIds, setCancelledReservationIds] = useState<Set<string>>(new Set());
  const [cancelReservationState, setCancelReservationState] = useState<{
    error: string | null;
    success: string | null;
    pendingReservationId: string | null;
  }>({
    error: null,
    success: null,
    pendingReservationId: null,
  });
  const [cancelDialogReservationId, setCancelDialogReservationId] = useState<string | null>(null);
  const [attendanceOverrides, setAttendanceOverrides] = useState<Record<string, AttendanceStatus>>({});
  const [startedAttendanceSessions, setStartedAttendanceSessions] =
    useState<AttendanceSession[]>(attendanceSessions);
  const [attendanceState, setAttendanceState] = useState<{
    error: string | null;
    success: string | null;
    pendingReservationId: string | null;
    starting: boolean;
  }>({
    error: null,
    success: null,
    pendingReservationId: null,
    starting: false,
  });
  const [selectedWeekReservationId, setSelectedWeekReservationId] = useState<string | null>(null);
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
  const currentUserId = visibleMembers.find((member) => member.isCurrentUser)?.userId ?? null;
  const filteredMembers = useMemo(() => {
    const query = memberSearchQuery.trim().toLowerCase();

    if (!query) {
      return visibleMembers;
    }

    return visibleMembers.filter((member) =>
      [member.name, member.email ?? "", member.role]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [memberSearchQuery, visibleMembers]);
  const visibleReservations = useMemo(
    () =>
      reservations
        .filter((reservation) => !cancelledReservationIds.has(reservation.id))
        .map((reservation) => ({
          ...reservation,
          attendanceStatus: attendanceOverrides[reservation.id] ?? reservation.attendanceStatus,
        })),
    [attendanceOverrides, cancelledReservationIds, reservations],
  );
  const reservationWeekDates = useMemo(() => getWeekDates(reservationDate), [reservationDate]);
  const reservationsByDate = useMemo(() => {
    const grouped = new Map<string, Reservation[]>();

    for (const reservation of visibleReservations) {
      if (!reservationWeekDates.includes(reservation.reservationDate)) {
        continue;
      }

      const dateReservations = grouped.get(reservation.reservationDate) ?? [];
      dateReservations.push(reservation);
      grouped.set(reservation.reservationDate, dateReservations);
    }

    for (const dateReservations of grouped.values()) {
      dateReservations.sort((first, second) => {
        const firstSlot = examSlots.find((slot) => slot.id === first.slotId);
        const secondSlot = examSlots.find((slot) => slot.id === second.slotId);
        const timeCompare = (firstSlot?.startsAt ?? "").localeCompare(secondSlot?.startsAt ?? "");
        if (timeCompare !== 0) return timeCompare;
        return first.createdAt.localeCompare(second.createdAt);
      });
    }

    return grouped;
  }, [examSlots, reservationWeekDates, visibleReservations]);
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
  const scheduleDialogMember = scheduleDialogMemberId
    ? visibleMembers.find((member) => member.id === scheduleDialogMemberId) ?? null
    : null;
  const selectedScheduleSlot =
    examSlots.find((slot) => slot.id === scheduleSlotId) ?? examSlots[0] ?? null;
  const memberNamesByUserId = useMemo(
    () => new Map(visibleMembers.map((member) => [member.userId, member.name])),
    [visibleMembers],
  );
  const reservationsBySlotId = useMemo(() => {
    const grouped = new Map<string, Reservation[]>();

    for (const reservation of visibleReservations) {
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
  }, [reservationDate, visibleReservations]);
  const reservationRowCount = Math.max(8, ...examSlots.map((slot) => slot.capacity));
  const selectedWeekReservation = selectedWeekReservationId
    ? visibleReservations.find((r) => r.id === selectedWeekReservationId) ?? null
    : null;
  const selectedWeekSlot = selectedWeekReservation
    ? examSlots.find((s) => s.id === selectedWeekReservation.slotId) ?? null
    : null;
  const canCancelWeekReservation =
    !!selectedWeekReservation &&
    !!currentUserId &&
    (selectedWeekReservation.userId === currentUserId ||
      currentUserRole === "admin" ||
      currentUserRole === "professor");
  const cancelWeekReservationPending =
    !!selectedWeekReservation &&
    cancelReservationState.pendingReservationId === selectedWeekReservation.id;
  const selectedAttendanceSlot =
    examSlots.find((slot) => slot.id === attendanceSlotId) ?? examSlots[0] ?? null;
  const selectedAttendanceSession =
    selectedAttendanceSlot
      ? startedAttendanceSessions.find(
          (session) =>
            session.reservationDate === attendanceDate &&
            session.slotId === selectedAttendanceSlot.id,
        ) ?? null
      : null;
  const attendanceReservations = useMemo(
    () =>
      visibleReservations
        .filter(
          (reservation) =>
            reservation.reservationDate === attendanceDate &&
            reservation.slotId === selectedAttendanceSlot?.id,
        )
        .sort((first, second) => first.createdAt.localeCompare(second.createdAt)),
    [attendanceDate, selectedAttendanceSlot?.id, visibleReservations],
  );
  const attendanceMarkingOpen = isAttendanceMarkingOpen(
    attendanceDate,
    selectedAttendanceSlot,
    selectedAttendanceSession,
  );
  const cancelDialogReservation = cancelDialogReservationId
    ? visibleReservations.find((reservation) => reservation.id === cancelDialogReservationId) ?? null
    : null;

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

  async function addSubject() {
    const name = newSubjectName.trim();
    if (!name) return;
    setSubjectState({ error: null, success: null, pending: true });
    const supabase = createClient();
    const { data, error } = await supabase.rpc("upsert_school_subject", {
      target_school_id: schoolId,
      subject_name: name,
    });
    if (error) {
      setSubjectState({ error: "Could not add subject. Try again.", success: null, pending: false });
      return;
    }
    const added = data as SchoolSubject;
    setSubjects((prev) =>
      [...prev.filter((s) => s.id !== added.id), added].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
    setNewSubjectName("");
    setSubjectState({ error: null, success: null, pending: false });
  }

  async function removeSubject(id: string) {
    setSubjectState({ error: null, success: null, pending: true });
    const supabase = createClient();
    const { error } = await supabase
      .from("SchoolSubjects")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("school_id", schoolId);
    if (error) {
      setSubjectState({ error: "Could not remove subject. Try again.", success: null, pending: false });
      return;
    }
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setSubjectState({ error: null, success: null, pending: false });
  }

  function openScheduleDialog(member: SchoolMember) {
    setScheduleDialogMemberId(member.id);
    setScheduleDate(getTodayKey());
    setScheduleSlotId(examSlots[0]?.id ?? "");
    setScheduleExamName("");
    setScheduleExamType("midterm");
    setScheduleState({ error: null, success: null, pending: false });
  }

  function closeScheduleDialog() {
    if (scheduleState.pending) {
      return;
    }

    setScheduleDialogMemberId(null);
    setScheduleState({ error: null, success: null, pending: false });
  }

  async function scheduleForStudent() {
    if (!scheduleDialogMember || !scheduleSlotId || !scheduleExamName.trim()) {
      setScheduleState({
        error: "Choose a student, date, slot, and exam name before scheduling.",
        success: null,
        pending: false,
      });
      return;
    }

    setScheduleState({ error: null, success: null, pending: true });

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setScheduleState({
        error: "You need to sign in again.",
        success: null,
        pending: false,
      });
      return;
    }

    const { error } = await supabase.functions.invoke("schedule-exam-for-student", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        schoolId,
        studentUserId: scheduleDialogMember.userId,
        slotId: scheduleSlotId,
        reservationDate: scheduleDate,
        examName: scheduleExamName.trim(),
        examType: scheduleExamType,
      },
    });

    if (error) {
      console.error("Schedule exam for student failed", error);
      setScheduleState({
        error: await getUserFacingFunctionErrorMessage("scheduleForStudent", error),
        success: null,
        pending: false,
      });
      return;
    }

    setScheduleState({
      error: null,
      success: `Scheduled ${scheduleExamName.trim()} for ${scheduleDialogMember.name}.`,
      pending: false,
    });
    setScheduleDialogMemberId(null);
    router.refresh();
  }

  async function cancelReservation(reservation: Reservation) {
    if (cancelReservationState.pendingReservationId) {
      return;
    }

    setCancelReservationState({
      error: null,
      success: null,
      pendingReservationId: reservation.id,
    });

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setCancelReservationState({
        error: "Your session expired. Sign in again to cancel this reservation.",
        success: null,
        pendingReservationId: null,
      });
      return;
    }

    const { error } = await supabase.functions.invoke("cancel-reservation", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        reservationId: reservation.id,
      },
    });

    if (error) {
      console.error("Cancel reservation failed", error);
      setCancelReservationState({
        error: await getUserFacingFunctionErrorMessage("cancelReservation", error),
        success: null,
        pendingReservationId: null,
      });
      return;
    }

    setCancelledReservationIds((current) => new Set(current).add(reservation.id));
    setCancelDialogReservationId(null);
    setCancelReservationState({
      error: null,
      success: `Cancelled ${reservation.examName}.`,
      pendingReservationId: null,
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
    const { error } = await supabase.rpc("soft_delete_school", {
      target_school_id: schoolId,
    });

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

  async function startAttendanceSession() {
    if (!selectedAttendanceSlot || attendanceState.starting) {
      return;
    }

    setAttendanceState({
      error: null,
      success: null,
      pendingReservationId: null,
      starting: true,
    });

    const supabase = createClient();
    const { data, error } = await supabase.rpc("start_attendance_session", {
      target_school_id: schoolId,
      target_slot_id: selectedAttendanceSlot.id,
      target_reservation_date: attendanceDate,
    });

    if (error) {
      console.error("Start attendance session failed", error);
      setAttendanceState({
        error: getUserFacingErrorMessage("attendanceStart", error),
        success: null,
        pendingReservationId: null,
        starting: false,
      });
      return;
    }

    const [session] = (data ?? []) as { session_id: string; expires_at: string }[];
    setStartedAttendanceSessions((current) => [
      ...current.filter(
        (item) =>
          item.reservationDate !== attendanceDate || item.slotId !== selectedAttendanceSlot.id,
      ),
      {
        id: session?.session_id ?? `local-${selectedAttendanceSlot.id}-${attendanceDate}`,
        schoolId,
        slotId: selectedAttendanceSlot.id,
        reservationDate: attendanceDate,
        startedBy: currentUserId ?? "",
        startedAt: new Date().toISOString(),
        expiresAt: session?.expires_at ?? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      },
    ]);
    setAttendanceState({
      error: null,
      success: `Attendance started for ${selectedAttendanceSlot.name}.`,
      pendingReservationId: null,
      starting: false,
    });
  }

  async function updateAttendance(reservation: Reservation, status: AttendanceStatus) {
    if (!canMarkAttendance || attendanceState.pendingReservationId) {
      return;
    }

    setAttendanceState({
      error: null,
      success: null,
      pendingReservationId: reservation.id,
      starting: false,
    });

    const supabase = createClient();
    const { error } = await supabase.rpc("set_reservation_attendance", {
      target_reservation_id: reservation.id,
      target_attendance_status: status,
    });

    if (error) {
      console.error("Update attendance failed", error);
      setAttendanceState({
        error: getUserFacingErrorMessage("attendanceUpdate", error),
        success: null,
        pendingReservationId: null,
        starting: false,
      });
      return;
    }

    setAttendanceOverrides((current) => ({ ...current, [reservation.id]: status }));
    setAttendanceState({
      error: null,
      success: `${memberNamesByUserId.get(reservation.userId) ?? "Student"} marked ${status}.`,
      pendingReservationId: null,
      starting: false,
    });
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
        {currentUserRole !== "exam_supervisor" && renderTabButton("members", "Members")}
        {renderTabButton("reservations", "Reservations")}
        {canViewAttendance && renderTabButton("attendance", "Attendance")}
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
              {memberSearchQuery.trim()
                ? `${filteredMembers.length} of ${visibleMembers.length}`
                : `${visibleMembers.length} total`}
            </span>
          </div>

          <div className="relative mb-4">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              color="#94A3B8"
              aria-hidden="true"
            />
            <input
              type="search"
              value={memberSearchQuery}
              onChange={(event) => setMemberSearchQuery(event.target.value)}
              placeholder="Search members by name, email, or role"
              className="h-[2.625rem] w-full rounded-[10px] bg-white pl-10 pr-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow]"
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

          {scheduleState.success && (
            <p className="anim-fade-in mb-4 text-[0.8125rem] font-medium" style={{ color: "#1D4ED8" }}>
              {scheduleState.success}
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
            {filteredMembers.map((member) => {
              const selectedRole = selectedRoles[member.id] ?? member.role;
              const canManage = canManageMembers && !member.isCurrentUser && !member.id.startsWith("created-");
              const canKick = canManage && member.role !== "admin";
              const canToggleSelfBooking =
                canManageSelfBooking &&
                member.role === "student" &&
                !member.isCurrentUser &&
                !member.id.startsWith("created-");
              const canScheduleForStudent =
                canManageSelfBooking &&
                member.role === "student" &&
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
                  {canScheduleForStudent && (
                    <button
                      type="button"
                      onClick={() => openScheduleDialog(member)}
                      disabled={scheduleState.pending}
                      className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed"
                      style={{ border: "1px solid #E4E8EF", color: "#2563EB" }}
                    >
                      <CalendarPlus size={16} />
                      Schedule
                    </button>
                  )}
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
                        {formatRole(role)}
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

            {filteredMembers.length === 0 && (
              <EmptyState
                title="No members found"
                description="Try a different name, email, or role."
              />
            )}
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
                {reservationViewMode === "day"
                  ? `Confirmed student exams for ${formatReservationDate(reservationDate)}.`
                  : `Confirmed student exams for ${formatReservationDate(
                      reservationWeekDates[0],
                    )} through ${formatReservationDate(reservationWeekDates[6])}.`}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <div
                className="flex w-fit rounded-xl p-1"
                style={{ border: "1px solid #E4E8EF", background: "#F8FAFC" }}
                role="group"
                aria-label="Reservation view"
              >
                {(["day", "week"] as ReservationViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setReservationViewMode(mode)}
                    className="h-8 rounded-[10px] px-3 text-sm font-semibold capitalize transition-colors duration-150"
                    style={
                      reservationViewMode === mode
                        ? { background: "#FFFFFF", color: "#1D4ED8", border: "1px solid #BFDBFE" }
                        : { background: "transparent", color: "#6B7280", border: "1px solid transparent" }
                    }
                  >
                    {mode}
                  </button>
                ))}
              </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setReservationDate((current) =>
                    addDays(current, reservationViewMode === "day" ? -1 : -7),
                  )
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-slate-50"
                style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
                aria-label={reservationViewMode === "day" ? "Previous day" : "Previous week"}
              >
                <ChevronLeft size={16} />
              </button>
              <span
                className="min-w-[150px] rounded-xl px-3 py-2 text-center text-sm font-semibold"
                style={{ border: "1px solid #E4E8EF", color: "#111827" }}
              >
                {reservationViewMode === "day"
                  ? formatReservationDate(reservationDate)
                  : `${formatReservationDate(reservationWeekDates[0])} - ${formatReservationDate(
                      reservationWeekDates[6],
                    )}`}
              </span>
              <button
                type="button"
                onClick={() =>
                  setReservationDate((current) =>
                    addDays(current, reservationViewMode === "day" ? 1 : 7),
                  )
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-slate-50"
                style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
                aria-label={reservationViewMode === "day" ? "Next day" : "Next week"}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            </div>
          </div>

          {reservationError && <ErrorBanner message={reservationError} />}

          {cancelReservationState.error && (
            <ErrorBanner message={cancelReservationState.error} />
          )}

          {cancelReservationState.success && (
            <p className="anim-fade-in mb-4 text-[0.8125rem] font-medium" style={{ color: "#1D4ED8" }}>
              {cancelReservationState.success}
            </p>
          )}

          {examSlots.length === 0 ? (
            <EmptyState
              title="No exam slots configured"
              description="Reservations will appear here after this school has reusable exam slots."
            />
          ) : (
            reservationViewMode === "week" ? (
              <div className="overflow-x-auto">
                <div
                  className="grid min-w-[500px] gap-2"
                  style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}
                >
                  {reservationWeekDates.filter((dateKey) => {
                    const dow = new Date(`${dateKey}T00:00:00`).getDay();
                    return dow !== 0 && dow !== 6;
                  }).map((dateKey) => {
                    const dayReservations = reservationsByDate.get(dateKey) ?? [];
                    const isToday = dateKey === getTodayKey();
                    const dayDate = new Date(`${dateKey}T00:00:00`);
                    const dayLabel = dayDate.toLocaleDateString("en-US", { weekday: "short" });
                    const dayNum = dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

                    return (
                      <div
                        key={dateKey}
                        className="flex flex-col overflow-hidden rounded-[10px] border"
                        style={{
                          background: "#FFFFFF",
                          borderColor: isToday ? "#93C5FD" : "#E4E8EF",
                        }}
                      >
                        <div
                          className="flex items-center justify-between px-2.5 py-2"
                          style={{
                            background: isToday ? "#EFF6FF" : "#FAFAFA",
                            borderBottom: `1px solid ${isToday ? "#BFDBFE" : "#F3F4F6"}`,
                          }}
                        >
                          <div>
                            <p
                              className="text-[10px] font-bold uppercase tracking-wide"
                              style={{ color: isToday ? "#2563EB" : "#94A3B8" }}
                            >
                              {dayLabel}
                            </p>
                            <p
                              className="text-[13px] font-semibold"
                              style={{ color: isToday ? "#1D4ED8" : "#111827" }}
                            >
                              {dayNum}
                            </p>
                          </div>
                          {dayReservations.length > 0 && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                              style={{ background: "#DBEAFE", color: "#1D4ED8" }}
                            >
                              {dayReservations.length}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col gap-1 p-1.5">
                          {dayReservations.length === 0 ? (
                            <div
                              className="flex flex-1 items-center justify-center rounded-[8px] border border-dashed py-5"
                              style={{ borderColor: "#E4E8EF" }}
                            >
                              <p className="text-[10px]" style={{ color: "#94A3B8" }}>
                                No bookings
                              </p>
                            </div>
                          ) : (
                            dayReservations.map((reservation) => {
                              const chipSlot = examSlots.find((s) => s.id === reservation.slotId);
                              return (
                                <button
                                  key={reservation.id}
                                  type="button"
                                  onClick={() => setSelectedWeekReservationId(reservation.id)}
                                  className="w-full rounded-[8px] px-2 py-1.5 text-left transition-colors duration-150 hover:bg-[#DBEAFE]"
                                  style={{
                                    background: "#EFF6FF",
                                    border: "1px solid #BFDBFE",
                                  }}
                                >
                                  <p
                                    className="truncate text-[12px] font-semibold leading-tight"
                                    style={{ color: "#111827" }}
                                  >
                                    {memberNamesByUserId.get(reservation.userId) ?? "Unnamed"}
                                  </p>
                                  {chipSlot && (
                                    <p
                                      className="mt-0.5 text-[10px] leading-tight"
                                      style={{ color: "#6B7280" }}
                                    >
                                      {formatSlotTime(chipSlot.startsAt)}
                                    </p>
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
                    const canCancelReservation =
                      !!reservation &&
                      !!currentUserId &&
                      (reservation.userId === currentUserId ||
                        currentUserRole === "admin" ||
                        currentUserRole === "professor");
                    const cancelPending =
                      !!reservation &&
                      cancelReservationState.pendingReservationId === reservation.id;

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
                          <div className="flex h-full min-h-[66px] flex-col">
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
                            {canCancelReservation && (
                              <button
                                type="button"
                                onClick={() => setCancelDialogReservationId(reservation.id)}
                                disabled={!!cancelReservationState.pendingReservationId}
                                className="mt-3 inline-flex h-8 w-fit items-center justify-center gap-1.5 rounded-[10px] px-3 text-xs font-semibold transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed"
                                style={{ border: "1px solid #E4E8EF", color: "#DC2626" }}
                              >
                                {cancelPending ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Ban size={13} />
                                )}
                                Cancel
                              </button>
                            )}
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
            )
          )}
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="p-5">
          {/* Header row: title left, date navigator right */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "#111827" }}>
                Attendance
              </h2>
              <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
                Track attendance by exam slot. Only the selected slot is shown.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAttendanceDate((current) => addDays(current, -1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-slate-50"
                style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
                aria-label="Previous attendance day"
              >
                <ChevronLeft size={16} />
              </button>
              <span
                className="min-w-[148px] rounded-xl px-3 py-2 text-center text-sm font-semibold"
                style={{ border: "1px solid #E4E8EF", color: "#111827" }}
              >
                {formatReservationDate(attendanceDate)}
              </span>
              <button
                type="button"
                onClick={() => setAttendanceDate((current) => addDays(current, 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-slate-50"
                style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
                aria-label="Next attendance day"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Slot pills */}
          {examSlots.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {examSlots.map((slot) => {
                const isSelected = slot.id === (selectedAttendanceSlot?.id ?? examSlots[0]?.id);
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setAttendanceSlotId(slot.id)}
                    className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors duration-150"
                    style={
                      isSelected
                        ? { background: "#EFF6FF", color: "#2563EB", border: "1.5px solid #BFDBFE" }
                        : { background: "#FFFFFF", color: "#6B7280", border: "1.5px solid #E4E8EF" }
                    }
                  >
                    <span>{slot.name}</span>
                    <span
                      className="text-xs font-medium"
                      style={{ color: isSelected ? "#93C5FD" : "#9CA3AF" }}
                    >
                      {formatSlotTime(slot.startsAt)}–{formatSlotTime(slot.endsAt)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {attendanceState.error && <ErrorBanner message={attendanceState.error} />}
          {attendanceState.success && (
            <p className="anim-fade-in mb-4 text-[0.8125rem] font-medium" style={{ color: "#1D4ED8" }}>
              {attendanceState.success}
            </p>
          )}

          {/* Session status bar */}
          <div
            className="mb-4 flex items-center justify-between gap-3 rounded-[10px] px-4 py-3"
            style={{ border: "1px solid #E4E8EF", background: "#FAFAFA" }}
          >
            <div className="flex items-center gap-3">
              <span
                className="rounded-full px-2.5 py-1 text-xs font-semibold"
                style={
                  selectedAttendanceSession
                    ? { background: "#DBEAFE", color: "#1D4ED8" }
                    : { background: "#E2E8F0", color: "#64748B" }
                }
              >
                {getAttendanceWindowLabel(attendanceDate, selectedAttendanceSlot, selectedAttendanceSession)}
              </span>
              <span className="text-sm" style={{ color: "#6B7280" }}>
                {selectedAttendanceSlot
                  ? `${formatSlotTime(selectedAttendanceSlot.startsAt)} – ${formatSlotTime(selectedAttendanceSlot.endsAt)}`
                  : "No slot selected"}
              </span>
            </div>
            {canMarkAttendance && (
              <button
                type="button"
                onClick={startAttendanceSession}
                disabled={!selectedAttendanceSlot || attendanceState.starting}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] px-4 text-sm font-semibold text-white transition-colors duration-150 disabled:cursor-not-allowed"
                style={{
                  background: attendanceState.starting ? "#93C5FD" : "#2563EB",
                  boxShadow: attendanceState.starting
                    ? "none"
                    : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
                }}
              >
                {attendanceState.starting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Play size={14} />
                )}
                Start
              </button>
            )}
          </div>

          {attendanceReservations.length === 0 ? (
            <EmptyState
              title="No students in this slot"
              description="Choose another date or time slot to review attendance."
            />
          ) : (
            <div className="overflow-x-auto rounded-[10px]" style={{ border: "1px solid #E4E8EF" }}>
              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #E4E8EF" }}>
                    {["Student", "Exam", "Type", "Status"].map((column) => (
                      <th
                        key={column}
                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: "#9CA3AF", background: "#FAFAFA", whiteSpace: "nowrap" }}
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {attendanceReservations.map((reservation, index) => {
                    const pending = attendanceState.pendingReservationId === reservation.id;
                    const isLast = index === attendanceReservations.length - 1;

                    return (
                      <tr
                        key={reservation.id}
                        className="anim-slide-up bg-white"
                        style={isLast ? undefined : { borderBottom: "1px solid #F3F4F6" }}
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold" style={{ color: "#111827" }}>
                            {memberNamesByUserId.get(reservation.userId) ?? "Unnamed student"}
                          </p>
                        </td>
                        <td className="px-4 py-3" style={{ color: "#374151" }}>
                          {reservation.examName}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="rounded-full px-2.5 py-1 text-xs font-semibold"
                            style={{ background: "#EFF6FF", color: "#2563EB" }}
                          >
                            {formatExamType(reservation.examType)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {canMarkAttendance ? (
                            <div
                              className="inline-flex rounded-xl p-1"
                              style={{ border: "1px solid #E4E8EF", background: "#F8FAFC" }}
                              role="group"
                              aria-label={`Attendance for ${
                                memberNamesByUserId.get(reservation.userId) ?? "student"
                              }`}
                            >
                              {(["present", "absent"] as AttendanceStatus[]).map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => updateAttendance(reservation, status)}
                                  disabled={pending || !attendanceMarkingOpen}
                                  title={
                                    attendanceMarkingOpen
                                      ? undefined
                                      : "Attendance marking is closed for this slot."
                                  }
                                  className="inline-flex h-8 min-w-[80px] items-center justify-center gap-1.5 rounded-[10px] px-3 text-xs font-semibold capitalize transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60"
                                  style={
                                    reservation.attendanceStatus === status
                                      ? {
                                          background: "#FFFFFF",
                                          color: status === "absent" ? "#DC2626" : "#1D4ED8",
                                          border: `1px solid ${status === "absent" ? "#FECACA" : "#BFDBFE"}`,
                                        }
                                      : {
                                          background: "transparent",
                                          color: "#9CA3AF",
                                          border: "1px solid transparent",
                                        }
                                  }
                                >
                                  {pending && reservation.attendanceStatus !== status ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : status === "present" ? (
                                    <Check size={13} />
                                  ) : (
                                    <X size={13} />
                                  )}
                                  {status}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span
                              className="rounded-full px-3 py-1 text-xs font-semibold capitalize"
                              style={
                                reservation.attendanceStatus === "absent"
                                  ? { background: "#FEF2F2", color: "#DC2626" }
                                  : { background: "#DBEAFE", color: "#1D4ED8" }
                              }
                            >
                              {reservation.attendanceStatus}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
              Manage subjects and school configuration.
            </p>
          </div>

          {/* Manage subjects */}
          <div
            className="mb-5 rounded-[10px] border p-4"
            style={{ background: "#FFFFFF", borderColor: "#E4E8EF" }}
          >
            <p className="mb-1 text-sm font-semibold" style={{ color: "#111827" }}>
              Subjects
            </p>
            <p className="mb-4 text-sm" style={{ color: "#6B7280", lineHeight: 1.5 }}>
              Students select from these subjects when scheduling an exam.
            </p>

            {/* Subject chips */}
            {subjects.length > 0 ? (
              <div className="mb-4 flex flex-wrap gap-2">
                {subjects.map((subject) => (
                  <span
                    key={subject.id}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
                    style={{ background: "#F0F5FF", color: "#1D4ED8", border: "1px solid #DBEAFE" }}
                  >
                    {subject.name}
                    <button
                      type="button"
                      onClick={() => removeSubject(subject.id)}
                      disabled={subjectState.pending}
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-blue-200 disabled:cursor-not-allowed"
                      aria-label={`Remove ${subject.name}`}
                    >
                      <X size={10} strokeWidth={2.5} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mb-4 text-sm" style={{ color: "#9CA3AF" }}>
                No subjects yet. Add one below.
              </p>
            )}

            {/* Add subject */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubject(); } }}
                placeholder="Add a subject…"
                disabled={subjectState.pending}
                className="h-[2.625rem] flex-1 rounded-[10px] bg-white px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow] disabled:cursor-not-allowed"
                style={{ border: "1.5px solid #E4E8EF", color: "#111827" }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#3B82F6";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#E4E8EF";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <button
                type="button"
                onClick={addSubject}
                disabled={subjectState.pending || !newSubjectName.trim()}
                className="inline-flex h-[2.625rem] items-center gap-1.5 rounded-[10px] px-4 text-[0.9375rem] font-semibold text-white transition-colors duration-150 disabled:cursor-not-allowed"
                style={{
                  background: subjectState.pending || !newSubjectName.trim() ? "#93C5FD" : "#2563EB",
                  boxShadow: "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
                }}
                onMouseEnter={(e) => {
                  if (!subjectState.pending && newSubjectName.trim()) {
                    e.currentTarget.style.background = "#1D4ED8";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!subjectState.pending && newSubjectName.trim()) {
                    e.currentTarget.style.background = "#2563EB";
                  }
                }}
              >
                {subjectState.pending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Plus size={15} strokeWidth={2.2} />
                )}
                Add
              </button>
            </div>

            {subjectState.error && (
              <p
                className="mt-3 rounded-lg px-3 py-2 text-[0.8125rem] anim-fade-in"
                style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}
              >
                {subjectState.error}
              </p>
            )}
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

      {selectedWeekReservation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="week-reservation-detail-title"
          onClick={() => setSelectedWeekReservationId(null)}
        >
          <div
            className="panel anim-scale-in w-full max-w-[400px] overflow-hidden shadow-[0_18px_60px_rgba(15,23,42,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "#EFF6FF" }}
                >
                  <CalendarDays size={18} color="#2563EB" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="week-reservation-detail-title"
                    className="truncate text-[0.9375rem] font-semibold"
                    style={{ color: "#111827", letterSpacing: "-0.01em" }}
                  >
                    {memberNamesByUserId.get(selectedWeekReservation.userId) ?? "Unnamed student"}
                  </h2>
                  <p className="mt-0.5 text-sm" style={{ color: "#6B7280" }}>
                    {formatReservationDate(selectedWeekReservation.reservationDate)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWeekReservationId(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-slate-50"
                style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ borderTop: "1px solid #E4E8EF" }}>
              <div className="grid grid-cols-2">
                <div
                  className="px-4 py-3"
                  style={{ borderRight: "1px solid #E4E8EF", borderBottom: "1px solid #E4E8EF" }}
                >
                  <p className="text-[11px] font-medium uppercase" style={{ color: "#94A3B8" }}>
                    Exam
                  </p>
                  <p className="mt-0.5 text-sm font-semibold" style={{ color: "#111827" }}>
                    {selectedWeekReservation.examName}
                  </p>
                </div>
                <div className="px-4 py-3" style={{ borderBottom: "1px solid #E4E8EF" }}>
                  <p className="text-[11px] font-medium uppercase" style={{ color: "#94A3B8" }}>
                    Type
                  </p>
                  <span
                    className="mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ background: "#DBEAFE", color: "#1D4ED8" }}
                  >
                    {formatExamType(selectedWeekReservation.examType)}
                  </span>
                </div>
              </div>
              {selectedWeekSlot && (
                <div className="grid grid-cols-2">
                  <div className="px-4 py-3" style={{ borderRight: "1px solid #E4E8EF" }}>
                    <p className="text-[11px] font-medium uppercase" style={{ color: "#94A3B8" }}>
                      Slot
                    </p>
                    <p className="mt-0.5 text-sm font-semibold" style={{ color: "#111827" }}>
                      {selectedWeekSlot.name}
                    </p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[11px] font-medium uppercase" style={{ color: "#94A3B8" }}>
                      Time
                    </p>
                    <p className="mt-0.5 text-sm font-semibold" style={{ color: "#111827" }}>
                      {formatSlotTime(selectedWeekSlot.startsAt)} – {formatSlotTime(selectedWeekSlot.endsAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {canCancelWeekReservation && (
              <div
                className="flex justify-end px-5 py-4"
                style={{ borderTop: "1px solid #F3F4F6" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setCancelDialogReservationId(selectedWeekReservation.id);
                    setSelectedWeekReservationId(null);
                  }}
                  disabled={!!cancelReservationState.pendingReservationId}
                  className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed"
                  style={{ border: "1px solid #E4E8EF", color: "#DC2626" }}
                >
                  {cancelWeekReservationPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Ban size={16} />
                  )}
                  Cancel reservation
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {cancelDialogReservation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-reservation-title"
        >
          <div className="panel w-full max-w-[420px] p-5 shadow-[0_18px_60px_rgba(15,23,42,0.18)]">
            <div className="mb-4 flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "#FEF2F2" }}
              >
                <Ban size={18} color="#DC2626" strokeWidth={1.9} />
              </div>
              <div>
                <h3 id="cancel-reservation-title" className="text-sm font-semibold" style={{ color: "#111827" }}>
                  Cancel reservation
                </h3>
                <p className="mt-1 text-sm" style={{ color: "#6B7280", lineHeight: 1.5 }}>
                  This will cancel {cancelDialogReservation.examName} for{" "}
                  {memberNamesByUserId.get(cancelDialogReservation.userId) ?? "this student"}.
                </p>
              </div>
            </div>

            {cancelReservationState.error && <ErrorBanner message={cancelReservationState.error} />}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelDialogReservationId(null)}
                disabled={!!cancelReservationState.pendingReservationId}
                className="inline-flex h-10 items-center justify-center rounded-[10px] px-4 text-sm font-semibold transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed"
                style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
              >
                Keep
              </button>
              <button
                type="button"
                onClick={() => cancelReservation(cancelDialogReservation)}
                disabled={!!cancelReservationState.pendingReservationId}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-semibold transition-colors duration-150 hover:bg-red-50 disabled:cursor-not-allowed"
                style={{ border: "1px solid #FECACA", color: "#DC2626" }}
              >
                {cancelReservationState.pendingReservationId === cancelDialogReservation.id ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Ban size={15} />
                )}
                Cancel reservation
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

      {scheduleDialogMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="schedule-student-title"
        >
          <div className="panel w-full max-w-[620px] overflow-hidden shadow-[0_18px_60px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "#EFF6FF", color: "#2563EB" }}
                  aria-hidden="true"
                >
                  <CalendarPlus size={18} />
                </div>
                <div className="min-w-0">
                  <h2
                    id="schedule-student-title"
                    className="text-[0.9375rem] font-semibold"
                    style={{ color: "#111827", letterSpacing: "-0.01em" }}
                  >
                    Schedule exam
                  </h2>
                  <p className="mt-1 text-sm" style={{ color: "#6B7280", lineHeight: 1.5 }}>
                    Create a confirmed booking for this student.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeScheduleDialog}
                disabled={scheduleState.pending}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed"
                style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
                aria-label="Close dialog"
              >
                <X size={15} />
              </button>
            </div>

            <div className="px-5 pb-5 sm:px-6">
              {scheduleState.error && <ErrorBanner message={scheduleState.error} />}

              <div
                className="mb-4 grid gap-0 overflow-hidden rounded-2xl sm:grid-cols-3"
                style={{ border: "1px solid #E4E8EF", background: "#F8FAFC" }}
              >
                <div className="flex items-center gap-3 px-4 py-3 sm:border-r sm:border-[#E4E8EF]">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "#FFFFFF", color: "#2563EB", border: "1px solid #E4E8EF" }}
                  >
                    <UserRound size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase" style={{ color: "#94A3B8" }}>
                      Student
                    </p>
                    <p className="truncate text-sm font-semibold" style={{ color: "#111827" }}>
                      {scheduleDialogMember.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 border-t border-[#E4E8EF] px-4 py-3 sm:border-r sm:border-t-0">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "#FFFFFF", color: "#2563EB", border: "1px solid #E4E8EF" }}
                  >
                    <CalendarDays size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase" style={{ color: "#94A3B8" }}>
                      Date
                    </p>
                    <p className="truncate text-sm font-semibold" style={{ color: "#111827" }}>
                      {formatReservationDate(scheduleDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 border-t border-[#E4E8EF] px-4 py-3 sm:border-t-0">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "#FFFFFF", color: "#2563EB", border: "1px solid #E4E8EF" }}
                  >
                    <Clock size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase" style={{ color: "#94A3B8" }}>
                      Slot
                    </p>
                    <p className="truncate text-sm font-semibold" style={{ color: "#111827" }}>
                      {selectedScheduleSlot
                        ? `${formatSlotTime(selectedScheduleSlot.startsAt)} - ${formatSlotTime(
                            selectedScheduleSlot.endsAt,
                          )}`
                        : "No active slots"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="schedule-student-date"
                    className="mb-1.5 block text-[0.8125rem] font-medium"
                    style={{ color: "#374151" }}
                  >
                    Date
                  </label>
                  <input
                    id="schedule-student-date"
                    type="date"
                    value={scheduleDate}
                    min={getTodayKey()}
                    max={getMaxBookingDate()}
                    onChange={(event) => setScheduleDate(event.target.value)}
                    className="h-[2.625rem] w-full rounded-[10px] bg-white px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow]"
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

                <div>
                  <label
                    htmlFor="schedule-student-slot"
                    className="mb-1.5 block text-[0.8125rem] font-medium"
                    style={{ color: "#374151" }}
                  >
                    Slot
                  </label>
                  <select
                    id="schedule-student-slot"
                    value={scheduleSlotId}
                    onChange={(event) => setScheduleSlotId(event.target.value)}
                    className="h-[2.625rem] w-full rounded-[10px] bg-white px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow]"
                    style={{ border: "1.5px solid #E4E8EF", color: "#111827" }}
                    onFocus={(event) => {
                      event.currentTarget.style.borderColor = "#3B82F6";
                      event.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)";
                    }}
                    onBlur={(event) => {
                      event.currentTarget.style.borderColor = "#E4E8EF";
                      event.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {examSlots.length === 0 ? (
                      <option value="">No active slots</option>
                    ) : (
                      examSlots.map((slot) => (
                        <option key={slot.id} value={slot.id}>
                          {slot.name} - {formatSlotTime(slot.startsAt)}
                        </option>
                      ))
                    )}
                  </select>
                  {(() => {
                    const slot = examSlots.find((s) => s.id === scheduleSlotId);
                    if (!slot) return null;
                    const booked = visibleReservations.filter(
                      (r) => r.slotId === scheduleSlotId && r.reservationDate === scheduleDate,
                    ).length;
                    const remaining = slot.capacity - booked;
                    const bg = remaining <= 0 ? "#FEF2F2" : remaining <= 2 ? "#FEF3C7" : "#DBEAFE";
                    const color = remaining <= 0 ? "#DC2626" : remaining <= 2 ? "#B45309" : "#1D4ED8";
                    const label =
                      remaining <= 0
                        ? "No spots left"
                        : `${remaining} of ${slot.capacity} spot${slot.capacity !== 1 ? "s" : ""} left`;
                    return (
                      <p
                        className="mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold anim-fade-in"
                        style={{ background: bg, color }}
                      >
                        {label}
                      </p>
                    );
                  })()}
                </div>

                <div>
                  <label
                    htmlFor="schedule-student-exam-type"
                    className="mb-1.5 block text-[0.8125rem] font-medium"
                    style={{ color: "#374151" }}
                  >
                    Exam type
                  </label>
                  <select
                    id="schedule-student-exam-type"
                    value={scheduleExamType}
                    onChange={(event) => setScheduleExamType(event.target.value as ExamType)}
                    className="h-[2.625rem] w-full rounded-[10px] bg-white px-3 text-[0.9375rem] capitalize outline-none transition-[border-color,box-shadow]"
                    style={{ border: "1.5px solid #E4E8EF", color: "#111827" }}
                    onFocus={(event) => {
                      event.currentTarget.style.borderColor = "#3B82F6";
                      event.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)";
                    }}
                    onBlur={(event) => {
                      event.currentTarget.style.borderColor = "#E4E8EF";
                      event.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <option value="midterm">Midterm</option>
                    <option value="final">Final</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="schedule-student-exam-name"
                    className="mb-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium"
                    style={{ color: "#374151" }}
                  >
                    <FileText size={14} />
                    Exam name
                  </label>
                  <SubjectCommandPalette
                    subjects={subjects}
                    value={scheduleExamName}
                    onChange={setScheduleExamName}
                    placeholder="Search subject…"
                    disabled={scheduleState.pending}
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[#F3F4F6] pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeScheduleDialog}
                  disabled={scheduleState.pending}
                  className="inline-flex h-[2.625rem] items-center justify-center rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed"
                  style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={scheduleForStudent}
                  disabled={
                    scheduleState.pending ||
                    !scheduleSlotId ||
                    !scheduleExamName.trim() ||
                    examSlots.length === 0
                  }
                  className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold text-white transition-colors duration-150 disabled:cursor-not-allowed"
                  style={{
                    background:
                      scheduleState.pending ||
                      !scheduleSlotId ||
                      !scheduleExamName.trim() ||
                      examSlots.length === 0
                        ? "#93C5FD"
                        : "#2563EB",
                    boxShadow:
                      scheduleState.pending ||
                      !scheduleSlotId ||
                      !scheduleExamName.trim() ||
                      examSlots.length === 0
                        ? "none"
                        : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
                  }}
                >
                  {scheduleState.pending ? <Loader2 size={16} className="animate-spin" /> : <CalendarPlus size={16} />}
                  Schedule exam
                </button>
              </div>
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
