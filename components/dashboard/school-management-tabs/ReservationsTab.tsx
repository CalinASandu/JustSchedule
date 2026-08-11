import { useMemo, useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { cancelSchoolReservation, updateSchoolReservation } from "./api";
import { addDays, getTodayKey, getWeekDates } from "./date-utils";
import { formatExamType, formatReservationDate, formatSlotTime } from "./formatters";
import { EmptyState, ErrorBanner } from "./shared";
import { ReservationActionMenu } from "./ReservationActionMenu";
import { ReservationCancelDialog } from "./ReservationCancelDialog";
import { ReservationDayView } from "./ReservationDayView";
import { ReservationSummaryStrip } from "./ReservationSummaryStrip";
import { ReservationToolbar } from "./ReservationToolbar";
import { ReservationUpdateDialog } from "./ReservationUpdateDialog";
import { ReservationWeekView } from "./ReservationWeekView";
import type {
  ExamType,
  ExamSlot,
  Reservation,
  ReservationViewMode,
  SchoolMember,
  SchoolRole,
  SchoolSubject,
} from "./types";

type ReservationsTabProps = {
  reservationError: string | null;
  examSlots: ExamSlot[];
  reservations: Reservation[];
  members: SchoolMember[];
  subjects: SchoolSubject[];
  currentUserRole: Exclude<SchoolRole, "student">;
};

export function ReservationsTab({
  reservationError,
  examSlots,
  reservations,
  members,
  subjects,
  currentUserRole,
}: ReservationsTabProps) {
  const router = useRouter();
  const [reservationDate, setReservationDate] = useState(getTodayKey);
  const [reservationViewMode, setReservationViewMode] = useState<ReservationViewMode>("day");
  const [cancelledReservationIds, setCancelledReservationIds] = useState<Set<string>>(new Set());
  const [updatedReservationOverrides, setUpdatedReservationOverrides] = useState<
    Record<string, Partial<Reservation>>
  >({});
  const [cancelReservationState, setCancelReservationState] = useState<{
    error: string | null;
    success: string | null;
    pendingReservationId: string | null;
  }>({
    error: null,
    success: null,
    pendingReservationId: null,
  });
  const [updateReservationState, setUpdateReservationState] = useState<{
    error: string | null;
    success: string | null;
    pendingReservationId: string | null;
  }>({
    error: null,
    success: null,
    pendingReservationId: null,
  });
  const [cancelDialogReservationId, setCancelDialogReservationId] = useState<string | null>(null);
  const [updateDialogReservationId, setUpdateDialogReservationId] = useState<string | null>(null);
  const [selectedWeekReservationId, setSelectedWeekReservationId] = useState<string | null>(null);
  const visibleReservations = useMemo(
    () =>
      reservations
        .filter((reservation) => !cancelledReservationIds.has(reservation.id))
        .map((reservation) => ({
          ...reservation,
          ...updatedReservationOverrides[reservation.id],
        })),
    [cancelledReservationIds, reservations, updatedReservationOverrides],
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
  const memberNamesByUserId = useMemo(
    () => new Map(members.map((member) => [member.userId, member.name])),
    [members],
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
  const dayReservations = useMemo(
    () => visibleReservations.filter((reservation) => reservation.reservationDate === reservationDate),
    [reservationDate, visibleReservations],
  );
  const weekReservations = useMemo(
    () =>
      visibleReservations.filter((reservation) =>
        reservationWeekDates.includes(reservation.reservationDate),
      ),
    [reservationWeekDates, visibleReservations],
  );
  const currentUserId = members.find((member) => member.isCurrentUser)?.userId ?? null;
  const selectedWeekReservation = selectedWeekReservationId
    ? visibleReservations.find((reservation) => reservation.id === selectedWeekReservationId) ?? null
    : null;
  const selectedWeekSlot = selectedWeekReservation
    ? examSlots.find((slot) => slot.id === selectedWeekReservation.slotId) ?? null
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
  const cancelDialogReservation = cancelDialogReservationId
    ? visibleReservations.find((reservation) => reservation.id === cancelDialogReservationId) ?? null
    : null;
  const updateDialogReservation = updateDialogReservationId
    ? visibleReservations.find((reservation) => reservation.id === updateDialogReservationId) ?? null
    : null;

  async function cancelReservation(reservation: Reservation) {
    if (cancelReservationState.pendingReservationId) {
      return;
    }

    setCancelReservationState({
      error: null,
      success: null,
      pendingReservationId: reservation.id,
    });

    const result = await cancelSchoolReservation(reservation.id);

    if (result.error) {
      setCancelReservationState({
        error: result.error,
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

  async function updateReservation(values: {
    reservation: Reservation;
    slotId: string;
    reservationDate: string;
    examName: string;
    examType: ExamType;
  }) {
    if (updateReservationState.pendingReservationId) {
      return;
    }

    setUpdateReservationState({
      error: null,
      success: null,
      pendingReservationId: values.reservation.id,
    });

    const result = await updateSchoolReservation({
      reservationId: values.reservation.id,
      slotId: values.slotId,
      reservationDate: values.reservationDate,
      examName: values.examName,
      examType: values.examType,
    });

    if (result.error) {
      setUpdateReservationState({
        error: result.error,
        success: null,
        pendingReservationId: null,
      });
      return;
    }

    const bookedSlotId = result.data?.bookedSlotId ?? values.slotId;
    const routedMessage = result.data?.routedToOverflow ? " Routed to overflow." : "";

    setUpdatedReservationOverrides((current) => ({
      ...current,
      [values.reservation.id]: {
        slotId: bookedSlotId,
        reservationDate: values.reservationDate,
        examName: values.examName,
        examType: values.examType,
      },
    }));
    setReservationDate(values.reservationDate);
    setUpdateDialogReservationId(null);
    setSelectedWeekReservationId(null);
    setUpdateReservationState({
      error: null,
      success: `Updated ${values.examName}.${routedMessage}`,
      pendingReservationId: null,
    });
    router.refresh();
  }

  return (
    <div className="p-4 sm:p-5">
      <ReservationToolbar
        reservationDate={reservationDate}
        reservationViewMode={reservationViewMode}
        reservationWeekDates={reservationWeekDates}
        setReservationDate={setReservationDate}
        setReservationViewMode={setReservationViewMode}
        addDays={addDays}
        formatReservationDate={formatReservationDate}
      />

      {reservationError && <ErrorBanner message={reservationError} />}

      {cancelReservationState.error && (
        <ErrorBanner message={cancelReservationState.error} />
      )}

      {updateReservationState.error && (
        <ErrorBanner message={updateReservationState.error} />
      )}

      {(cancelReservationState.success || updateReservationState.success) && (
        <p
          className="anim-fade-in mb-4 text-[0.8125rem] font-medium"
          style={{ color: "var(--accent-strong)" }}
        >
          {updateReservationState.success ?? cancelReservationState.success}
        </p>
      )}

      <ReservationSummaryStrip
        viewMode={reservationViewMode}
        dayReservations={dayReservations}
        weekReservations={weekReservations}
        examSlots={examSlots}
      />

      {examSlots.length === 0 ? (
        <EmptyState
          title="No exam slots configured"
          description="Reservations will appear here after this school has reusable exam slots."
        />
      ) : reservationViewMode === "week" ? (
        <ReservationWeekView
          reservationWeekDates={reservationWeekDates}
          reservationsByDate={reservationsByDate}
          examSlots={examSlots}
          memberNamesByUserId={memberNamesByUserId}
          setSelectedWeekReservationId={setSelectedWeekReservationId}
          getTodayKey={getTodayKey}
          formatSlotTime={formatSlotTime}
        />
      ) : (
        <ReservationDayView
          examSlots={examSlots}
          reservationsBySlotId={reservationsBySlotId}
          memberNamesByUserId={memberNamesByUserId}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          cancelReservationState={cancelReservationState}
          updatePendingReservationId={updateReservationState.pendingReservationId}
          onCancelReservationRequest={setCancelDialogReservationId}
          onUpdateReservationRequest={setUpdateDialogReservationId}
          formatSlotTime={formatSlotTime}
          formatExamType={formatExamType}
        />
      )}

      {selectedWeekReservation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "var(--overlay-scrim)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="week-reservation-detail-title"
          onClick={() => setSelectedWeekReservationId(null)}
        >
          <div
            className="panel anim-scale-in w-full max-w-[400px]"
            style={{ boxShadow: "var(--shadow-dialog)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "var(--accent-subtle)" }}
                >
                  <CalendarDays size={18} color="var(--accent-color)" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="week-reservation-detail-title"
                    className="truncate text-[0.9375rem] font-semibold"
                    style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
                  >
                    {memberNamesByUserId.get(selectedWeekReservation.userId) ?? "Unnamed student"}
                  </h2>
                  <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {formatReservationDate(selectedWeekReservation.reservationDate)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWeekReservationId(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-[var(--surface-subtle)]"
                style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ borderTop: "1px solid var(--border-default)" }}>
              <div className="grid grid-cols-2">
                <div
                  className="px-4 py-3"
                  style={{
                    borderRight: "1px solid var(--border-default)",
                    borderBottom: "1px solid var(--border-default)",
                  }}
                >
                  <p className="text-[11px] font-medium uppercase" style={{ color: "var(--text-faint)" }}>
                    Exam
                  </p>
                  <p className="mt-0.5 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {selectedWeekReservation.examName}
                  </p>
                </div>
                <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-default)" }}>
                  <p className="text-[11px] font-medium uppercase" style={{ color: "var(--text-faint)" }}>
                    Type
                  </p>
                  <span
                    className="mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ background: "var(--accent-muted)", color: "var(--accent-strong)" }}
                  >
                    {formatExamType(selectedWeekReservation.examType)}
                  </span>
                </div>
              </div>
              {selectedWeekSlot && (
                <div className="grid grid-cols-2">
                  <div className="px-4 py-3" style={{ borderRight: "1px solid var(--border-default)" }}>
                    <p className="text-[11px] font-medium uppercase" style={{ color: "var(--text-faint)" }}>
                      Slot
                    </p>
                    <p className="mt-0.5 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {selectedWeekSlot.name}
                    </p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[11px] font-medium uppercase" style={{ color: "var(--text-faint)" }}>
                      Time
                    </p>
                    <p className="mt-0.5 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {formatSlotTime(selectedWeekSlot.startsAt)} - {formatSlotTime(selectedWeekSlot.endsAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {canCancelWeekReservation && (
              <div
                className="flex justify-end px-5 py-4"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                <ReservationActionMenu
                  disabled={
                    !!cancelReservationState.pendingReservationId ||
                    !!updateReservationState.pendingReservationId ||
                    cancelWeekReservationPending
                  }
                  onCancel={() => {
                    setCancelDialogReservationId(selectedWeekReservation.id);
                    setSelectedWeekReservationId(null);
                  }}
                  onUpdate={() => {
                    setUpdateDialogReservationId(selectedWeekReservation.id);
                    setSelectedWeekReservationId(null);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {updateDialogReservation && (
        <ReservationUpdateDialog
          key={updateDialogReservation.id}
          reservation={updateDialogReservation}
          studentName={memberNamesByUserId.get(updateDialogReservation.userId) ?? "Unnamed student"}
          examSlots={examSlots}
          subjects={subjects}
          pending={updateReservationState.pendingReservationId === updateDialogReservation.id}
          error={updateReservationState.error}
          onClose={() => {
            if (!updateReservationState.pendingReservationId) {
              setUpdateDialogReservationId(null);
              setUpdateReservationState((current) => ({ ...current, error: null }));
            }
          }}
          onSubmit={(values) =>
            updateReservation({
              reservation: updateDialogReservation,
              ...values,
            })
          }
        />
      )}

      {cancelDialogReservation && (
        <ReservationCancelDialog
          reservation={cancelDialogReservation}
          studentName={memberNamesByUserId.get(cancelDialogReservation.userId) ?? "this student"}
          error={cancelReservationState.error}
          pending={cancelReservationState.pendingReservationId === cancelDialogReservation.id}
          onClose={() => setCancelDialogReservationId(null)}
          onConfirm={() => cancelReservation(cancelDialogReservation)}
        />
      )}
    </div>
  );
}
