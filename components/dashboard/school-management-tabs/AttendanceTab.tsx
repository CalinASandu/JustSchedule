import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { setReservationAttendance } from "./api";
import { getAttendanceWindowLabel, isAttendanceMarkingOpen } from "./attendance-utils";
import { addDays, getTodayKey } from "./date-utils";
import { formatExamType, formatReservationDate, formatSlotTime } from "./formatters";
import { EmptyState, ErrorBanner } from "./shared";
import type {
  AttendanceSession,
  AttendanceStatus,
  ExamSlot,
  Reservation,
  SchoolMember,
} from "./types";

type AttendanceTabProps = {
  examSlots: ExamSlot[];
  reservations: Reservation[];
  attendanceSessions: AttendanceSession[];
  members: SchoolMember[];
  canMarkAttendance: boolean;
};

export function AttendanceTab({
  examSlots,
  reservations,
  attendanceSessions,
  members,
  canMarkAttendance,
}: AttendanceTabProps) {
  const router = useRouter();
  const [attendanceDate, setAttendanceDate] = useState(getTodayKey);
  const [attendanceSlotId, setAttendanceSlotId] = useState(() => examSlots[0]?.id ?? "");
  const [attendanceOverrides, setAttendanceOverrides] = useState<Record<string, AttendanceStatus>>({});
  const [attendanceState, setAttendanceState] = useState<{
    error: string | null;
    success: string | null;
    pendingReservationId: string | null;
    pendingStatus: AttendanceStatus | null;
  }>({
    error: null,
    success: null,
    pendingReservationId: null,
    pendingStatus: null,
  });
  const visibleReservations = useMemo(
    () =>
      reservations.map((reservation) => ({
        ...reservation,
        attendanceStatus: attendanceOverrides[reservation.id] ?? reservation.attendanceStatus,
      })),
    [attendanceOverrides, reservations],
  );
  const memberNamesByUserId = useMemo(
    () => new Map(members.map((member) => [member.userId, member.name])),
    [members],
  );
  const selectedAttendanceSlot =
    examSlots.find((slot) => slot.id === attendanceSlotId) ?? examSlots[0] ?? null;
  const selectedAttendanceSession =
    selectedAttendanceSlot
      ? attendanceSessions.find(
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

  async function updateAttendance(reservation: Reservation, status: AttendanceStatus) {
    if (!canMarkAttendance || attendanceState.pendingReservationId) {
      return;
    }

    setAttendanceState({
      error: null,
      success: null,
      pendingReservationId: reservation.id,
      pendingStatus: status,
    });

    const result = await setReservationAttendance({
      reservationId: reservation.id,
      status,
    });

    if (result.error) {
      setAttendanceState({
        error: result.error,
        success: null,
        pendingReservationId: null,
        pendingStatus: null,
      });
      return;
    }

    setAttendanceOverrides((current) => ({ ...current, [reservation.id]: status }));
    setAttendanceState({
      error: null,
      success: `${memberNamesByUserId.get(reservation.userId) ?? "Student"} marked ${status}.`,
      pendingReservationId: null,
      pendingStatus: null,
    });
    router.refresh();
  }

  return (
    <div className="p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Attendance
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Track attendance by exam slot. Only the selected slot is shown.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAttendanceDate((current) => addDays(current, -1))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-[var(--surface-subtle)]"
            style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
            aria-label="Previous attendance day"
          >
            <ChevronLeft size={16} />
          </button>
          <span
            className="min-w-[148px] rounded-xl px-3 py-2 text-center text-sm font-semibold"
            style={{ border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
          >
            {formatReservationDate(attendanceDate)}
          </span>
          <button
            type="button"
            onClick={() => setAttendanceDate((current) => addDays(current, 1))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-[var(--surface-subtle)]"
            style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
            aria-label="Next attendance day"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {examSlots.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {examSlots.map((slot) => {
            const isSelected =
              slot.id === (selectedAttendanceSlot?.id ?? examSlots[0]?.id);
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => setAttendanceSlotId(slot.id)}
                className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors duration-150"
                style={
                  isSelected
                    ? {
                        background: "var(--accent-subtle)",
                        color: "var(--accent-color)",
                        border: "1.5px solid var(--accent-border)",
                      }
                    : {
                        background: "var(--surface-panel)",
                        color: "var(--text-secondary)",
                        border: "1.5px solid var(--border-default)",
                      }
                }
              >
                <span>{slot.name}</span>
                <span
                  className="text-xs font-medium"
                  style={{ color: isSelected ? "var(--accent-border-strong)" : "var(--text-muted)" }}
                >
                  {formatSlotTime(slot.startsAt)}-{formatSlotTime(slot.endsAt)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {attendanceState.error && <ErrorBanner message={attendanceState.error} />}
      {attendanceState.success && (
        <p
          className="anim-fade-in mb-4 text-[0.8125rem] font-medium"
          style={{ color: "var(--accent-strong)" }}
        >
          {attendanceState.success}
        </p>
      )}

      <div
        className="mb-4 flex items-center justify-between gap-3 rounded-[10px] px-4 py-3"
        style={{ border: "1px solid var(--border-default)", background: "var(--surface-inset)" }}
      >
        <div className="flex items-center gap-3">
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={
              selectedAttendanceSession
                ? { background: "var(--accent-muted)", color: "var(--accent-strong)" }
                : { background: "var(--surface-subtle)", color: "var(--text-slate)" }
            }
          >
            {getAttendanceWindowLabel(
              attendanceDate,
              selectedAttendanceSlot,
              selectedAttendanceSession,
            )}
          </span>
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {selectedAttendanceSlot
              ? `${formatSlotTime(selectedAttendanceSlot.startsAt)} - ${formatSlotTime(
                  selectedAttendanceSlot.endsAt,
                )}`
              : "No slot selected"}
          </span>
        </div>
      </div>

      {attendanceReservations.length === 0 ? (
        <EmptyState
          title="No students in this slot"
          description="Choose another date or time slot to review attendance."
        />
      ) : (
        <div
          className="overflow-x-auto rounded-[10px]"
          style={{ border: "1px solid var(--border-default)" }}
        >
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
                {["Student", "Exam", "Type", "Status"].map((column) => (
                  <th
                    key={column}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                    style={{
                      color: "var(--text-muted)",
                      background: "var(--surface-inset)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attendanceReservations.map((reservation, index) => {
                const pending =
                  attendanceState.pendingReservationId === reservation.id;
                const hasLocalAttendanceMark = Object.prototype.hasOwnProperty.call(
                  attendanceOverrides,
                  reservation.id,
                );
                const isAttendanceMarked =
                  Boolean(reservation.attendanceMarkedAt) || hasLocalAttendanceMark;
                const isLast = index === attendanceReservations.length - 1;
                const statusBadgeStyle = !isAttendanceMarked
                  ? { background: "var(--surface-subtle)", color: "var(--text-slate)" }
                  : reservation.attendanceStatus === "absent"
                    ? { background: "var(--danger-subtle)", color: "var(--danger)" }
                    : { background: "var(--accent-muted)", color: "var(--accent-strong)" };

                return (
                  <tr
                    key={reservation.id}
                    className="anim-slide-up"
                    style={{
                      background: "var(--surface-panel)",
                      ...(isLast ? {} : { borderBottom: "1px solid var(--border-subtle)" }),
                    }}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        {memberNamesByUserId.get(reservation.userId) ??
                          "Unnamed student"}
                      </p>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-body)" }}>
                      {reservation.examName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}
                      >
                        {formatExamType(reservation.examType)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-2">
                        <span
                          className="rounded-full px-3 py-1 text-xs font-semibold capitalize"
                          style={statusBadgeStyle}
                        >
                          {isAttendanceMarked ? reservation.attendanceStatus : "Not marked"}
                        </span>
                        {canMarkAttendance ? (
                        <div
                          className="inline-flex rounded-xl p-1"
                          style={{
                            border: "1px solid var(--border-default)",
                            background: "var(--surface-alt)",
                          }}
                          role="group"
                          aria-label={`Attendance for ${
                            memberNamesByUserId.get(reservation.userId) ??
                            "student"
                          }`}
                        >
                          {(["present", "absent"] as AttendanceStatus[]).map(
                            (status) => (
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
                                  isAttendanceMarked &&
                                  reservation.attendanceStatus === status
                                    ? {
                                        background: "var(--surface-panel)",
                                        color:
                                          status === "absent"
                                            ? "var(--danger)"
                                            : "var(--accent-strong)",
                                        border: `1px solid ${
                                          status === "absent"
                                            ? "var(--danger-border)"
                                            : "var(--accent-border)"
                                        }`,
                                      }
                                    : {
                                        background: "transparent",
                                        color: "var(--text-muted)",
                                        border: "1px solid transparent",
                                  }
                                }
                              >
                                {pending &&
                                attendanceState.pendingStatus === status ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : status === "present" ? (
                                  <Check size={13} />
                                ) : (
                                  <X size={13} />
                                )}
                                {status}
                              </button>
                            ),
                          )}
                        </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
