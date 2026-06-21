import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  kickSchoolMember,
  scheduleExamForStudent,
  setStudentSelfBookingPermission,
  updateMemberRoles,
} from "./api";
import { getTodayKey } from "./date-utils";
import { MemberCard } from "./MemberCard";
import { MemberKickDialog } from "./MemberKickDialog";
import { MemberRoleChangesPanel } from "./MemberRoleChangesPanel";
import { MemberScheduleDialog } from "./MemberScheduleDialog";
import { EmptyState, ErrorBanner } from "./shared";
import type { ExamSlot, ExamType, Reservation, SchoolMember, SchoolRole, SchoolSubject } from "./types";

type MembersTabProps = {
  schoolId: string;
  schoolName: string;
  members: SchoolMember[];
  memberError: string | null;
  examSlots: ExamSlot[];
  reservations: Reservation[];
  subjects: SchoolSubject[];
  canManageMembers: boolean;
  canManageSelfBooking: boolean;
};

export function MembersTab({
  schoolId,
  schoolName,
  members,
  memberError,
  examSlots,
  reservations,
  subjects,
  canManageMembers,
  canManageSelfBooking,
}: MembersTabProps) {
  const router = useRouter();
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
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
  const [kickState, setKickState] = useState<{ error: string | null; pending: boolean }>({
    error: null,
    pending: false,
  });
  const [openMenuMemberId, setOpenMenuMemberId] = useState<string | null>(null);
  const [roleSubmenuMemberId, setRoleSubmenuMemberId] = useState<string | null>(null);
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
  const filteredMembers = useMemo(() => {
    const query = memberSearchQuery.trim().toLowerCase();

    if (!query) {
      return visibleMembers;
    }

    return visibleMembers.filter((member) =>
      [member.name, member.email ?? "", member.role].join(" ").toLowerCase().includes(query),
    );
  }, [memberSearchQuery, visibleMembers]);
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

  useEffect(() => {
    if (!kickDialogMemberId || kickSecondsRemaining === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setKickSecondsRemaining((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [kickDialogMemberId, kickSecondsRemaining]);

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

    const result = await updateMemberRoles({
      schoolId,
      changes: pendingRoleChanges.map(({ member, nextRole }) => ({
        memberId: member.id,
        nextRole,
      })),
    });

    if (result.error) {
      setRoleState({
        error: result.error,
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

    const result = await setStudentSelfBookingPermission({
      schoolId,
      memberId: member.id,
      canSelfBook: nextCanSelfBook,
    });

    if (result.error) {
      setSelfBookingState({
        error: result.error,
        success: null,
        pendingMemberId: null,
      });
      return;
    }

    const updatedCanSelfBook = result.data ?? nextCanSelfBook;

    setSelfBookingOverrides((current) => ({
      ...current,
      [member.id]: updatedCanSelfBook,
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

    const result = await scheduleExamForStudent({
      schoolId,
      studentUserId: scheduleDialogMember.userId,
      slotId: scheduleSlotId,
      reservationDate: scheduleDate,
      examName: scheduleExamName.trim(),
      examType: scheduleExamType,
    });

    if (result.error) {
      setScheduleState({
        error: result.error,
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
    const result = await kickSchoolMember({ schoolId, memberId: kickDialogMember.id });

    if (result.error) {
      setKickState({ error: result.error, pending: false });
      return;
    }

    setRemovedMemberIds((current) => new Set([...current, kickDialogMember.id]));
    setKickDialogMemberId(null);
    setKickSecondsRemaining(5);
    setKickState({ error: null, pending: false });
    router.refresh();
  }

  return (
    <>
      <div className="p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
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
            event.currentTarget.style.boxShadow =
              "0 0 0 3px rgba(59,130,246,0.12)";
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
        <p
          className="anim-fade-in mb-4 text-[0.8125rem] font-medium"
          style={{ color: "#1D4ED8" }}
        >
          {selfBookingState.success ?? roleState.success}
        </p>
      )}

      {scheduleState.success && (
        <p
          className="anim-fade-in mb-4 text-[0.8125rem] font-medium"
          style={{ color: "#1D4ED8" }}
        >
          {scheduleState.success}
        </p>
      )}

      {canManageMembers && pendingRoleChanges.length > 0 && (
        <MemberRoleChangesPanel
          pendingRoleChanges={pendingRoleChanges}
          pending={roleState.pending}
          onClear={() => {
            setSelectedRoles({});
            setRoleState({ error: null, success: null, pending: false });
          }}
          onConfirm={confirmRoleChanges}
        />
      )}

      <div className="grid gap-3">
        {filteredMembers.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            selectedRole={selectedRoles[member.id] ?? member.role}
            canManageMembers={canManageMembers}
            canManageSelfBooking={canManageSelfBooking}
            selfBookingPending={selfBookingState.pendingMemberId === member.id}
            anySelfBookingPending={!!selfBookingState.pendingMemberId}
            schedulePending={scheduleState.pending}
            roleState={roleState}
            kickPending={kickState.pending}
            openMenuMemberId={openMenuMemberId}
            roleSubmenuMemberId={roleSubmenuMemberId}
            setOpenMenuMemberId={setOpenMenuMemberId}
            setRoleSubmenuMemberId={setRoleSubmenuMemberId}
            setSelectedRoles={setSelectedRoles}
            setRoleState={setRoleState}
            onSchedule={openScheduleDialog}
            onToggleSelfBooking={toggleSelfBooking}
            onKick={openKickDialog}
          />
        ))}

        {filteredMembers.length === 0 && (
          <EmptyState
            title="No members found"
            description="Try a different name, email, or role."
          />
        )}
      </div>
      </div>

      {kickDialogMember && (
        <MemberKickDialog
          schoolName={schoolName}
          member={kickDialogMember}
          secondsRemaining={kickSecondsRemaining}
          state={kickState}
          onClose={closeKickDialog}
          onConfirm={kickMember}
        />
      )}

      {scheduleDialogMember && (
        <MemberScheduleDialog
          member={scheduleDialogMember}
          subjects={subjects}
          examSlots={examSlots}
          reservations={reservations}
          scheduleDate={scheduleDate}
          scheduleSlotId={scheduleSlotId}
          scheduleExamName={scheduleExamName}
          scheduleExamType={scheduleExamType}
          state={scheduleState}
          setScheduleDate={setScheduleDate}
          setScheduleSlotId={setScheduleSlotId}
          setScheduleExamName={setScheduleExamName}
          setScheduleExamType={setScheduleExamType}
          onClose={closeScheduleDialog}
          onSubmit={scheduleForStudent}
        />
      )}
    </>
  );
}
