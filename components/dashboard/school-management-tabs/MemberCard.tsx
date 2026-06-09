import type React from "react";
import { useRef } from "react";
import {
  Ban,
  CalendarPlus,
  Check,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  UserMinus,
  UserRound,
} from "lucide-react";
import { formatDate, formatRole } from "./formatters";
import { FloatingActionMenu } from "./FloatingActionMenu";
import { getRolePillStyle, roleOptions } from "./role-utils";
import type { SchoolMember, SchoolRole } from "./types";

type RoleState = {
  error: string | null;
  success: string | null;
  pending: boolean;
};

type MemberCardProps = {
  member: SchoolMember;
  selectedRole: SchoolRole;
  canManageMembers: boolean;
  canManageSelfBooking: boolean;
  selfBookingPending: boolean;
  anySelfBookingPending: boolean;
  schedulePending: boolean;
  roleState: RoleState;
  kickPending: boolean;
  openMenuMemberId: string | null;
  roleSubmenuMemberId: string | null;
  setOpenMenuMemberId: (id: string | null) => void;
  setRoleSubmenuMemberId: (id: string | null) => void;
  setSelectedRoles: React.Dispatch<React.SetStateAction<Record<string, SchoolRole>>>;
  setRoleState: React.Dispatch<React.SetStateAction<RoleState>>;
  onSchedule: (member: SchoolMember) => void;
  onToggleSelfBooking: (member: SchoolMember) => void;
  onKick: (member: SchoolMember) => void;
};

export function MemberCard({
  member,
  selectedRole,
  canManageMembers,
  canManageSelfBooking,
  selfBookingPending,
  anySelfBookingPending,
  schedulePending,
  roleState,
  kickPending,
  openMenuMemberId,
  roleSubmenuMemberId,
  setOpenMenuMemberId,
  setRoleSubmenuMemberId,
  setSelectedRoles,
  setRoleState,
  onSchedule,
  onToggleSelfBooking,
  onKick,
}: MemberCardProps) {
  const canManage =
    canManageMembers && !member.isCurrentUser && !member.id.startsWith("created-");
  const canKick = canManage && member.role !== "admin";
  const canToggleSelfBooking =
    canManageSelfBooking &&
    member.role === "student" &&
    !member.isCurrentUser &&
    !member.id.startsWith("created-");
  const canScheduleForStudent =
    canManageSelfBooking && member.role === "student" && !member.id.startsWith("created-");
  const hasAnyAction = canScheduleForStudent || canToggleSelfBooking || canManage || canKick;
  const actionButtonRef = useRef<HTMLButtonElement>(null);
  const roleButtonRef = useRef<HTMLButtonElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="rounded-[10px] border border-[#E4E8EF] p-4"
      style={{ background: "#FFFFFF" }}
    >
      <div className="flex items-center justify-between gap-3">
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
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={
                    member.canSelfBook
                      ? { background: "#DBEAFE", color: "#1D4ED8" }
                      : { background: "#E2E8F0", color: "#64748B" }
                  }
                >
                  {member.canSelfBook ? "Self-booking on" : "Teacher scheduled"}
                </span>
                {selfBookingPending && (
                  <Loader2 size={13} className="animate-spin" style={{ color: "#9CA3AF" }} />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
            style={getRolePillStyle(member.role)}
          >
            {formatRole(member.role)}
          </span>

          {hasAnyAction && (
            <div>
              <button
                ref={actionButtonRef}
                type="button"
                onClick={() => {
                  setRoleSubmenuMemberId(null);
                  setOpenMenuMemberId(openMenuMemberId === member.id ? null : member.id);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-[8px] transition-colors hover:bg-slate-100"
                style={{ color: "#6B7280" }}
                aria-label="Member actions"
              >
                <MoreHorizontal size={16} />
              </button>

              <FloatingActionMenu
                anchorRef={actionButtonRef}
                open={openMenuMemberId === member.id}
                width={208}
                ignoreRefs={[roleMenuRef]}
                onClose={() => {
                  setOpenMenuMemberId(null);
                  setRoleSubmenuMemberId(null);
                }}
              >
                  {canScheduleForStudent && (
                    <button
                      type="button"
                      onClick={() => {
                        onSchedule(member);
                        setOpenMenuMemberId(null);
                      }}
                      disabled={schedulePending}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ color: "#2563EB" }}
                    >
                      <CalendarPlus size={15} />
                      Schedule exam
                    </button>
                  )}
                  {canToggleSelfBooking && (
                    <button
                      type="button"
                      onClick={() => {
                        onToggleSelfBooking(member);
                        setOpenMenuMemberId(null);
                      }}
                      disabled={anySelfBookingPending}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ color: "#374151" }}
                    >
                      {member.canSelfBook ? <Ban size={15} /> : <Check size={15} />}
                      {member.canSelfBook ? "Restrict booking" : "Allow booking"}
                    </button>
                  )}
                  {canManage && (
                    <>
                      {(canScheduleForStudent || canToggleSelfBooking) && (
                        <div className="my-1 border-t border-[#F3F4F6]" />
                      )}
                      <div>
                        <button
                          ref={roleButtonRef}
                          type="button"
                          onClick={() =>
                            setRoleSubmenuMemberId(
                              roleSubmenuMemberId === member.id ? null : member.id,
                            )
                          }
                          disabled={roleState.pending}
                          className="flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          style={{ color: "#374151" }}
                        >
                          <span className="flex items-center gap-2.5">
                            <UserRound size={15} />
                            Change role
                          </span>
                          <ChevronRight size={13} style={{ color: "#9CA3AF" }} />
                        </button>
                      </div>
                    </>
                  )}
                  {canKick && (
                    <>
                      <div className="my-1 border-t border-[#F3F4F6]" />
                      <button
                        type="button"
                        onClick={() => {
                          onKick(member);
                          setOpenMenuMemberId(null);
                        }}
                        disabled={kickPending}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ color: "#DC2626" }}
                      >
                        <UserMinus size={15} />
                        Remove from school
                      </button>
                    </>
                  )}
              </FloatingActionMenu>

              <FloatingActionMenu
                anchorRef={roleButtonRef}
                open={openMenuMemberId === member.id && roleSubmenuMemberId === member.id}
                width={176}
                placement="right"
                menuRef={roleMenuRef}
                onClose={() => setRoleSubmenuMemberId(null)}
              >
                {roleOptions.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setSelectedRoles((current) => ({
                        ...current,
                        [member.id]: role,
                      }));
                      setRoleState((current) => ({
                        ...current,
                        error: null,
                        success: null,
                      }));
                      setRoleSubmenuMemberId(null);
                      setOpenMenuMemberId(null);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm capitalize transition-colors hover:bg-slate-50"
                    style={{
                      color: role === member.role ? "#2563EB" : "#374151",
                      fontWeight: role === member.role ? 600 : 400,
                    }}
                  >
                    <span className="flex h-3.5 w-3.5 items-center justify-center">
                      {role === selectedRole && <Check size={12} strokeWidth={2.5} />}
                    </span>
                    {formatRole(role)}
                  </button>
                ))}
              </FloatingActionMenu>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
