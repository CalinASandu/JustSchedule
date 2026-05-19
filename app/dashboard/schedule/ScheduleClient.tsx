"use client";

import { useMemo, useState } from "react";
import { Ban, CalendarDays, ClipboardList, Loader2, UserRound } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ExamType, Reservation, SlotDef } from "@/components/schedule/types";
import { createClient } from "@/lib/supabase/client";
import { getUserFacingFunctionErrorMessage } from "@/lib/user-facing-errors";
import Navbar from "@/components/schedule/Navbar";
import CalendarPanel from "@/components/schedule/CalendarPanel";
import SlotPicker from "@/components/schedule/SlotPicker";
import BookingSummaryCard from "@/components/schedule/BookingSummaryCard";
import SeatAvailabilityOverview from "@/components/schedule/SeatAvailabilityOverview";
import BookingsPanel from "@/components/schedule/BookingsPanel";
import LeaveSchoolButton from "@/components/dashboard/LeaveSchoolButton";

interface ScheduleClientProps {
  schoolId: string;
  schoolName: string;
  membershipId: string;
  studentName: string;
  userEmail: string;
  currentUserId: string;
  canSelfBook: boolean;
  examSlots: SlotDef[];
  initialReservations: Reservation[];
  schoolSubjects: { id: string; name: string }[];
  reservationError: string | null;
}

export default function ScheduleClient({
  schoolId,
  schoolName,
  membershipId,
  studentName: initialStudentName,
  userEmail,
  currentUserId,
  canSelfBook,
  examSlots,
  initialReservations,
  schoolSubjects,
  reservationError,
}: ScheduleClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [isReserving, setIsReserving] = useState(false);
  const studentName = initialStudentName;
  const [selectedExam, setSelectedExam] = useState("");
  const [examType, setExamType] = useState<ExamType>("midterm");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [reserveError, setReserveError] = useState<string | null>(reservationError);
  const [cancelingReservationId, setCancelingReservationId] = useState<string | null>(null);
  const [cancelReservationError, setCancelReservationError] = useState<string | null>(null);
  const [cancelDialogReservation, setCancelDialogReservation] = useState<Reservation | null>(null);

  function handleDateSelect(date: string) {
    setSelectedDate(date);
    setSelectedSlotId(null);
    setShowConfirmation(false);
    setReserveError(reservationError);
  }

  function handleSlotSelect(slotId: string) {
    setSelectedSlotId(slotId);
    setShowConfirmation(false);
    setReserveError(reservationError);
  }

  function handleReserve() {
    if (!selectedDate || !selectedSlotId) return;
    const slot = examSlots.find((item) => item.id === selectedSlotId);
    if (!slot) return;

    setReserveError(null);
    setIsReserving(true);
    void (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          setReserveError("Your session expired. Sign in again to reserve a seat.");
          return;
        }

        const { data, error } = await supabase.functions.invoke("reserve-exam-slot", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: {
            schoolId,
            slotId: selectedSlotId,
            reservationDate: selectedDate,
            examName: selectedExam.trim(),
            examType,
          },
        });

        if (error) {
          console.error("Reserve exam slot failed", error);
          setReserveError(await getUserFacingFunctionErrorMessage("reserveExamSlot", error));
          return;
        }

        const reservationId =
          data && typeof data === "object" && "reservationId" in data
            ? String(data.reservationId)
            : crypto.randomUUID();

        setReservations((prev) => [
          ...prev,
          {
            id: reservationId,
            userId: currentUserId,
            studentName: studentName.trim() || initialStudentName,
            slotId: selectedSlotId,
            slotName: slot.label,
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            capacity: slot.capacity,
            reservationDate: selectedDate,
            examName: selectedExam.trim(),
            examType,
            status: "confirmed",
            createdAt: new Date().toISOString(),
            createdBy: currentUserId,
            createdByRole: "student",
            attendanceStatus: "present",
            attendanceMarkedBy: null,
            attendanceMarkedAt: null,
          },
        ]);
        setShowConfirmation(true);
      } catch (error) {
        console.error("Reserve exam slot failed", error);
        setReserveError("Could not schedule this exam. Try again in a moment.");
      } finally {
        setIsReserving(false);
      }
    })();
  }

  function handleReset() {
    setSelectedDate(null);
    setSelectedSlotId(null);
    setShowConfirmation(false);
    setReserveError(reservationError);
  }

  async function handleCancelReservation(reservation: Reservation) {
    if (cancelingReservationId || reservation.userId !== currentUserId) {
      return;
    }

    setCancelingReservationId(reservation.id);
    setCancelReservationError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setCancelReservationError("Your session expired. Sign in again to cancel this reservation.");
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
        setCancelReservationError(
          await getUserFacingFunctionErrorMessage("cancelReservation", error),
        );
        return;
      }

      setReservations((current) =>
        current.filter((item) => item.id !== reservation.id),
      );
      setCancelDialogReservation(null);
      router.refresh();
    } catch (error) {
      console.error("Cancel reservation failed", error);
      setCancelReservationError("Could not cancel this reservation. Try again in a moment.");
    } finally {
      setCancelingReservationId(null);
    }
  }

  const selectedSlotDef = selectedSlotId
    ? examSlots.find((slot) => slot.id === selectedSlotId)
    : null;

  const formattedDate = selectedDate
    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const canReserve =
    !!studentName.trim() &&
    !!selectedExam.trim() &&
    !!selectedDate &&
    !!selectedSlotId &&
    canSelfBook &&
    !showConfirmation &&
    !isReserving;
  const reserveDisabledMessage = canSelfBook
    ? null
    : "A professor must schedule this exam for you.";
  const ownReservations = useMemo(
    () => reservations.filter((reservation) => reservation.userId === currentUserId),
    [currentUserId, reservations],
  );
  const panelParam = searchParams.get("panel");
  const activePanel =
    panelParam === "profile" || panelParam === "reservations" ? panelParam : "schedule";

  function selectPanel(panel: "schedule" | "reservations" | "profile") {
    const params = new URLSearchParams(searchParams);
    params.set("schoolId", schoolId);

    if (panel === "schedule") {
      params.delete("panel");
    } else {
      params.set("panel", panel);
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="min-h-dvh" style={{ background: "#F7F8FA" }}>
      <Navbar userName={studentName} userEmail={userEmail} />

      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px 64px" }}>
        <div className="flex flex-col gap-4 py-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="anim-slide-up">
            <h1
              className="text-4xl font-bold"
              style={{
                color: "#111827",
                fontFamily: "var(--font-serif)",
                lineHeight: 1.15,
              }}
            >
              Schedule your exam
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: "#9CA3AF" }}>
              {schoolName}
            </p>
          </div>
          <div
            className="panel anim-slide-up flex w-full p-1 sm:w-auto"
            role="tablist"
            aria-label="School workspace panels"
          >
            <PanelTab
              active={activePanel === "schedule"}
              icon={<CalendarDays size={15} aria-hidden="true" />}
              label="Schedule"
              onClick={() => selectPanel("schedule")}
            />
            <PanelTab
              active={activePanel === "reservations"}
              icon={<ClipboardList size={15} aria-hidden="true" />}
              label="My Reservations"
              onClick={() => selectPanel("reservations")}
            />
            <PanelTab
              active={activePanel === "profile"}
              icon={<UserRound size={15} aria-hidden="true" />}
              label="School Profile"
              onClick={() => selectPanel("profile")}
            />
          </div>
        </div>

        {activePanel === "schedule" ? (
          <>
            <div className="schedule-main-grid">
              <div className="anim-slide-up anim-d1">
                <CalendarPanel
                  studentName={studentName}
                  selectedExam={selectedExam}
                  onExamChange={setSelectedExam}
                  examType={examType}
                  onExamTypeChange={setExamType}
                  selectedDate={selectedDate}
                  onSelectDate={handleDateSelect}
                  subjects={schoolSubjects}
                />
              </div>

              <div className="anim-slide-up anim-d2">
                <SlotPicker
                  selectedDate={selectedDate}
                  selectedSlotId={selectedSlotId}
                  onSelectSlot={handleSlotSelect}
                  slots={examSlots}
                  reservations={reservations}
                />
              </div>

              <div className="anim-slide-up anim-d3">
                <BookingSummaryCard
                  studentName={studentName}
                  exam={selectedExam}
                  examType={examType}
                  date={formattedDate}
                  time={selectedSlotDef?.label ?? null}
                  duration={selectedSlotDef?.duration ?? null}
                  canReserve={canReserve}
                  isSubmitting={isReserving}
                  isConfirmed={showConfirmation}
                  error={reserveError}
                  reserveDisabledMessage={reserveDisabledMessage}
                  onReserve={handleReserve}
                  onReset={handleReset}
                />
              </div>
            </div>

            <div className="schedule-bottom-grid mt-6">
              <div className="anim-slide-up anim-d2">
                <SeatAvailabilityOverview
                  selectedDate={selectedDate}
                  slots={examSlots}
                  reservations={reservations}
                />
              </div>

              <div className="anim-slide-up anim-d3">
                <BookingsPanel
                  reservations={reservations}
                  currentUserId={currentUserId}
                  cancelingReservationId={cancelingReservationId}
                  cancelError={cancelReservationError}
                  onCancelReservation={setCancelDialogReservation}
                />
              </div>
            </div>
          </>
        ) : activePanel === "reservations" ? (
          <div className="anim-slide-up anim-d1">
            <BookingsPanel
              reservations={ownReservations}
              currentUserId={currentUserId}
              cancelingReservationId={cancelingReservationId}
              cancelError={cancelReservationError}
              title="My Reservations"
              description="Your confirmed exams across this school."
              emptyTitle="No reservations yet"
              emptyDescription="Your scheduled exams will appear here."
              onCancelReservation={setCancelDialogReservation}
            />
          </div>
        ) : (
          <SchoolProfilePanel
            schoolName={schoolName}
            studentName={studentName}
            userEmail={userEmail}
            membershipId={membershipId}
          />
        )}
      </main>

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
                  This will cancel {cancelDialogReservation.examName} on{" "}
                  {new Date(`${cancelDialogReservation.reservationDate}T00:00:00`).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric", year: "numeric" },
                  )}
                  .
                </p>
              </div>
            </div>

            {cancelReservationError && (
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
                {cancelReservationError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelDialogReservation(null)}
                disabled={!!cancelingReservationId}
                className="inline-flex h-10 items-center justify-center rounded-[10px] px-4 text-sm font-semibold transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed"
                style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
              >
                Keep
              </button>
              <button
                type="button"
                onClick={() => handleCancelReservation(cancelDialogReservation)}
                disabled={!!cancelingReservationId}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-semibold transition-colors duration-150 hover:bg-red-50 disabled:cursor-not-allowed"
                style={{ border: "1px solid #FECACA", color: "#DC2626" }}
              >
                {cancelingReservationId === cancelDialogReservation.id ? (
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
    </div>
  );
}

function PanelTab({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-[10px] px-3 text-sm font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:flex-none"
      style={
        active
          ? { background: "#EFF6FF", color: "#1D4ED8" }
          : { background: "#FFFFFF", color: "#6B7280" }
      }
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function SchoolProfilePanel({
  schoolName,
  studentName,
  userEmail,
  membershipId,
}: {
  schoolName: string;
  studentName: string;
  userEmail: string;
  membershipId: string;
}) {
  return (
    <section className="panel anim-slide-up anim-d1 p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[0.9375rem] font-semibold" style={{ color: "#111827" }}>
            School Profile
          </h2>
          <p className="mt-1 text-sm" style={{ color: "#6B7280", lineHeight: 1.5 }}>
            Your membership details for {schoolName}.
          </p>
        </div>
        <span
          className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold"
          style={{ background: "#E2E8F0", color: "#64748B" }}
        >
          Student
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[10px] border border-[#E4E8EF] p-4">
          <p className="text-xs font-medium uppercase" style={{ color: "#94A3B8" }}>
            School
          </p>
          <p className="mt-1 truncate text-sm font-semibold" style={{ color: "#111827" }}>
            {schoolName}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase" style={{ color: "#94A3B8" }}>
                Name
              </p>
              <p className="mt-1 truncate text-sm" style={{ color: "#374151" }}>
                {studentName}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase" style={{ color: "#94A3B8" }}>
                Email
              </p>
              <p className="mt-1 truncate text-sm" style={{ color: "#374151" }}>
                {userEmail}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[10px] border border-[#E4E8EF] p-4">
          <h3 className="text-sm font-semibold" style={{ color: "#111827" }}>
            Membership
          </h3>
          <p className="mb-4 mt-1 text-sm" style={{ color: "#6B7280", lineHeight: 1.5 }}>
            Leave this school if you no longer need access.
          </p>
          <LeaveSchoolButton membershipId={membershipId} schoolName={schoolName} />
        </div>
      </div>
    </section>
  );
}
