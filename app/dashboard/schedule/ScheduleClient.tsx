"use client";

import { Fragment, useMemo, useState } from "react";
import { Ban, CalendarDays, ClipboardList, Loader2, UserRound } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  ExamType,
  Reservation,
  ScheduleRequest,
  SlotDef,
  TeacherOption,
  UserNotification,
} from "@/components/schedule/types";
import { createClient } from "@/lib/supabase/client";
import {
  getUserFacingErrorMessage,
  getUserFacingFunctionErrorMessage,
} from "@/lib/user-facing-errors";
import Navbar from "@/components/schedule/Navbar";
import CalendarPanel from "@/components/schedule/CalendarPanel";
import SlotPicker from "@/components/schedule/SlotPicker";
import BookingSummaryCard from "@/components/schedule/BookingSummaryCard";
import SeatAvailabilityOverview from "@/components/schedule/SeatAvailabilityOverview";
import BookingsPanel from "@/components/schedule/BookingsPanel";
import LeaveSchoolButton from "@/components/dashboard/LeaveSchoolButton";
import SubjectCommandPalette from "@/components/schedule/SubjectCommandPalette";
import ScheduleRequestsPanel from "@/components/schedule/ScheduleRequestsPanel";
import TeacherRequestSelector from "@/components/schedule/TeacherRequestSelector";

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
  initialScheduleRequests: ScheduleRequest[];
  requestTeachers: TeacherOption[];
  notifications: UserNotification[];
  schoolSubjects: { id: string; name: string }[];
  reservationError: string | null;
}

function isMissingRefreshTokenError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const authError = error as { code?: unknown; message?: unknown };
  const message = typeof authError.message === "string" ? authError.message : "";

  return (
    authError.code === "refresh_token_not_found" ||
    message.includes("Invalid Refresh Token") ||
    message.includes("Refresh Token Not Found")
  );
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
  initialScheduleRequests,
  requestTeachers,
  notifications,
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
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    requestTeachers[0]?.userId ?? "",
  );
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [scheduleRequests, setScheduleRequests] =
    useState<ScheduleRequest[]>(initialScheduleRequests);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [reserveError, setReserveError] = useState<string | null>(reservationError);
  const [cancelingReservationId, setCancelingReservationId] = useState<string | null>(null);
  const [cancelReservationError, setCancelReservationError] = useState<string | null>(null);
  const [cancelDialogReservation, setCancelDialogReservation] = useState<Reservation | null>(null);
  const [cancelingRequestId, setCancelingRequestId] = useState<string | null>(null);
  const [cancelRequestError, setCancelRequestError] = useState<string | null>(null);
  const [markingSeenRequestId, setMarkingSeenRequestId] = useState<string | null>(null);
  const [markSeenRequestError, setMarkSeenRequestError] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3>(1);
  const canDirectBook = canSelfBook === true;

  function handleDateSelect(date: string) {
    setSelectedDate(date);
    setSelectedSlotId(null);
    setShowConfirmation(false);
    setReserveError(reservationError);
    setBookingStep(2);
  }

  function handleSlotSelect(slotId: string) {
    setSelectedSlotId(slotId);
    setShowConfirmation(false);
    setReserveError(reservationError);
    setBookingStep(3);
  }

  function handleReserve() {
    if (!selectedDate || !selectedSlotId) return;
    const slot = examSlots.find((item) => item.id === selectedSlotId);
    if (!slot) return;

    if (!canDirectBook) {
      void handleCreateRequest(slot);
      return;
    }

    setReserveError(null);
    setIsReserving(true);
    void (async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          if (isMissingRefreshTokenError(sessionError)) {
            await supabase.auth.signOut({ scope: "local" });
          }

          setReserveError("Your session expired. Sign in again to reserve a seat.");
          return;
        }

        const session = sessionData.session;

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

  async function handleCreateRequest(slot: SlotDef) {
    if (!selectedDate || !selectedSlotId) return;

    if (!selectedTeacherId) {
      setReserveError("Choose a professor for this request.");
      return;
    }

    setReserveError(null);
    setIsReserving(true);

    try {
      const { data, error } = await supabase.rpc("create_schedule_request", {
        target_school_id: schoolId,
        target_teacher_user_id: selectedTeacherId,
        target_slot_id: selectedSlotId,
        target_reservation_date: selectedDate,
        target_exam_name: selectedExam.trim(),
        target_exam_type: examType,
      });

      if (error) {
        console.error("Create schedule request failed", error);
        setReserveError(getUserFacingErrorMessage("scheduleRequest", error));
        return;
      }

      const row = Array.isArray(data) ? data[0] : data;
      const teacher = requestTeachers.find((item) => item.userId === selectedTeacherId);

      setScheduleRequests((current) => [
        {
          id: String(row?.request_id ?? crypto.randomUUID()),
          schoolId,
          studentUserId: currentUserId,
          teacherUserId: selectedTeacherId,
          teacherName: teacher?.name ?? "Professor",
          slotId: selectedSlotId,
          slotGroupId: selectedSlotId,
          slotName: slot.label,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          capacity: slot.capacity,
          overflowSlotId: null,
          overflowCapacity: null,
          reservationDate: selectedDate,
          examName: selectedExam.trim(),
          examType,
          status: "pending",
          reviewerMessage: null,
          reviewedAt: null,
          reservationId: null,
          expiresAt: String(row?.expires_at ?? new Date().toISOString()),
          createdAt: new Date().toISOString(),
          studentSeenAt: null,
        },
        ...current,
      ]);
      setShowConfirmation(true);
      router.refresh();
    } catch (error) {
      console.error("Create schedule request failed", error);
      setReserveError("Could not send this request. Try again in a moment.");
    } finally {
      setIsReserving(false);
    }
  }

  function handleReset() {
    setSelectedDate(null);
    setSelectedSlotId(null);
    setShowConfirmation(false);
    setReserveError(reservationError);
    setSelectedExam("");
    setExamType("midterm");
    setSelectedTeacherId(requestTeachers[0]?.userId ?? "");
    setBookingStep(1);
  }

  async function handleCancelReservation(reservation: Reservation) {
    if (cancelingReservationId || reservation.userId !== currentUserId) {
      return;
    }

    setCancelingReservationId(reservation.id);
    setCancelReservationError(null);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        if (isMissingRefreshTokenError(sessionError)) {
          await supabase.auth.signOut({ scope: "local" });
        }

        setCancelReservationError("Your session expired. Sign in again to cancel this reservation.");
        return;
      }

      const session = sessionData.session;

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

  async function handleCancelRequest(request: ScheduleRequest) {
    if (cancelingRequestId || request.status !== "pending") {
      return;
    }

    setCancelingRequestId(request.id);
    setCancelRequestError(null);

    try {
      const { data, error } = await supabase.rpc("cancel_schedule_request", {
        target_request_id: request.id,
      });

      if (error) {
        console.error("Cancel schedule request failed", error);
        setCancelRequestError(getUserFacingErrorMessage("scheduleRequest", error));
        return;
      }

      const row = Array.isArray(data) ? data[0] : data;
      const nextStatus =
        row && typeof row === "object" && "status" in row ? String(row.status) : "cancelled";

      setScheduleRequests((current) =>
        current.map((item) =>
          item.id === request.id
            ? { ...item, status: nextStatus as ScheduleRequest["status"] }
            : item,
        ),
      );
      router.refresh();
    } catch (error) {
      console.error("Cancel schedule request failed", error);
      setCancelRequestError("Could not cancel this request. Try again in a moment.");
    } finally {
      setCancelingRequestId(null);
    }
  }

  async function handleMarkRequestSeen(request: ScheduleRequest) {
    if (
      markingSeenRequestId ||
      (request.status !== "approved" && request.status !== "declined")
    ) {
      return;
    }

    setMarkingSeenRequestId(request.id);
    setMarkSeenRequestError(null);

    try {
      const { error } = await supabase.rpc("mark_schedule_request_seen", {
        target_request_id: request.id,
      });

      if (error) {
        console.error("Mark schedule request seen failed", error);
        setMarkSeenRequestError(getUserFacingErrorMessage("scheduleRequest", error));
        return;
      }

      setScheduleRequests((current) => current.filter((item) => item.id !== request.id));
      router.refresh();
    } catch (error) {
      console.error("Mark schedule request seen failed", error);
      setMarkSeenRequestError("Could not mark this request as seen. Try again in a moment.");
    } finally {
      setMarkingSeenRequestId(null);
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
    (canDirectBook || !!selectedTeacherId) &&
    !showConfirmation &&
    !isReserving;
  const reserveDisabledMessage = canDirectBook
    ? null
    : !selectedTeacherId
      ? "Choose a professor from this school to send the request."
      : "This sends a request only. Seats are not held until a professor approves it.";
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
      <Navbar userName={studentName} userEmail={userEmail} notifications={notifications} />

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
            {/* ── Booking wizard ─────────────────────────── */}
            <div className="max-w-[640px] mx-auto">
              <StepBar step={bookingStep} confirmed={showConfirmation} />

              {/* Step 1 — Pick a date */}
              {bookingStep === 1 && (
                <div className="flex flex-col gap-4 anim-slide-up">
                  <CalendarPanel
                    calendarOnly
                    studentName={studentName}
                    selectedExam={selectedExam}
                    onExamChange={setSelectedExam}
                    examType={examType}
                    onExamTypeChange={setExamType}
                    selectedDate={selectedDate}
                    onSelectDate={handleDateSelect}
                    subjects={schoolSubjects}
                    slots={examSlots}
                    reservations={reservations}
                  />
                  {selectedDate && (
                    <button
                      type="button"
                      onClick={() => setBookingStep(2)}
                      className="w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      style={{ background: "#2563EB", color: "#ffffff", cursor: "pointer" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#1D4ED8"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#2563EB"; }}
                    >
                      Continue to time
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M3 7h8M8 4l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* Step 2 — Pick a time slot */}
              {bookingStep === 2 && (
                <div className="flex flex-col gap-3 anim-slide-up">
                  <BackButton label="Back to date" onClick={() => setBookingStep(1)} />
                  <SlotPicker
                    selectedDate={selectedDate}
                    selectedSlotId={selectedSlotId}
                    onSelectSlot={handleSlotSelect}
                    slots={examSlots}
                    reservations={reservations}
                  />
                  {selectedSlotId && (
                    <button
                      type="button"
                      onClick={() => setBookingStep(3)}
                      className="w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      style={{ background: "#2563EB", color: "#ffffff", cursor: "pointer" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#1D4ED8"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#2563EB"; }}
                    >
                      Continue to exam details
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M3 7h8M8 4l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* Step 3 — Exam details + confirm */}
              {bookingStep === 3 && (
                <div className="flex flex-col gap-3 anim-slide-up">
                  {!showConfirmation && (
                    <>
                      <BackButton label="Back to time" onClick={() => setBookingStep(2)} />
                      <div className="panel p-5 flex flex-col gap-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: "#EFF6FF" }}
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                              <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="#2563EB" strokeWidth="1.3" />
                              <path d="M4.5 7h5M4.5 4.5h3M4.5 9.5h4" stroke="#2563EB" strokeWidth="1.3" strokeLinecap="round" />
                            </svg>
                          </div>
                          <div>
                            <h2 className="text-sm font-semibold" style={{ color: "#111827" }}>
                              Exam details
                            </h2>
                            <p className="text-xs" style={{ color: "#9CA3AF" }}>
                              Choose your subject and exam type
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label
                            className="text-[11px] font-semibold uppercase tracking-wider"
                            style={{ color: "#9CA3AF" }}
                          >
                            Subject
                          </label>
                          <SubjectCommandPalette
                            subjects={schoolSubjects}
                            value={selectedExam}
                            onChange={setSelectedExam}
                            placeholder="Search subject…"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label
                            className="text-[11px] font-semibold uppercase tracking-wider"
                            style={{ color: "#9CA3AF" }}
                          >
                            Exam type
                          </label>
                          <div
                            className="flex rounded-xl p-0.5 gap-0.5 w-fit"
                            style={{ border: "1px solid #E4E8EF", background: "#F7F8FA" }}
                            role="group"
                            aria-label="Exam type"
                          >
                            {(["midterm", "final"] as ExamType[]).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setExamType(t)}
                                aria-pressed={examType === t}
                                className="px-4 py-2 text-sm font-medium rounded-[10px] transition-all duration-150 cursor-pointer capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                style={
                                  examType === t
                                    ? {
                                        background: "#ffffff",
                                        color: "#1D4ED8",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                                        border: "1px solid #BFDBFE",
                                      }
                                    : {
                                        background: "transparent",
                                        color: "#6B7280",
                                        border: "1px solid transparent",
                                      }
                                }
                              >
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {!canDirectBook && (
                          <TeacherRequestSelector
                            teachers={requestTeachers}
                            selectedTeacherId={selectedTeacherId}
                            onTeacherChange={setSelectedTeacherId}
                          />
                        )}
                      </div>
                    </>
                  )}

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
                    actionLabel={canDirectBook ? "Reserve seat" : "Send request"}
                    submittingLabel={canDirectBook ? "Reserving..." : "Sending request..."}
                    confirmedTitle={canDirectBook ? "Booking confirmed!" : "Request sent"}
                    confirmedDescription={
                      canDirectBook
                        ? undefined
                        : "A professor must approve before a seat is booked."
                    }
                    resetLabel={canDirectBook ? "Schedule another exam" : "Request another exam"}
                    securityText={
                      canDirectBook
                        ? "Your booking is secure and confidential."
                        : "This request does not reserve a seat until approved."
                    }
                    onReserve={handleReserve}
                    onReset={handleReset}
                  />
                </div>
              )}
            </div>

            {/* ── Bottom info panels ──────────────────────── */}
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
          <div className="grid gap-4">
            <div className="anim-slide-up anim-d1">
              <ScheduleRequestsPanel
                requests={scheduleRequests}
                cancelingRequestId={cancelingRequestId}
                markingSeenRequestId={markingSeenRequestId}
                cancelError={cancelRequestError}
                markSeenError={markSeenRequestError}
                onCancelRequest={handleCancelRequest}
                onMarkSeen={handleMarkRequestSeen}
              />
            </div>
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

function StepBar({ step, confirmed }: { step: 1 | 2 | 3; confirmed: boolean }) {
  const steps = [
    { n: 1 as const, label: "Date" },
    { n: 2 as const, label: "Time" },
    { n: 3 as const, label: "Exam" },
  ];
  return (
    <div className="flex items-center mb-6">
      {steps.map((s, i) => {
        const isCompleted = confirmed || s.n < step;
        const isCurrent = s.n === step && !confirmed;
        return (
          <Fragment key={s.n}>
            {i > 0 && (
              <div
                className="flex-1 h-px mx-3 transition-colors duration-300"
                style={{ background: s.n <= step || confirmed ? "#2563EB" : "#E4E8EF" }}
              />
            )}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200"
                style={
                  isCompleted
                    ? { background: "#2563EB", color: "#fff" }
                    : isCurrent
                    ? { background: "#EFF6FF", color: "#2563EB", border: "2px solid #2563EB" }
                    : { background: "#F3F4F6", color: "#9CA3AF", border: "1px solid #E4E8EF" }
                }
              >
                {isCompleted ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path
                      d="M2.5 6l2.5 2.5L9.5 3.5"
                      stroke="white"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  s.n
                )}
              </div>
              <span
                className="text-sm font-medium hidden sm:block"
                style={{
                  color: isCompleted ? "#2563EB" : isCurrent ? "#111827" : "#9CA3AF",
                }}
              >
                {s.label}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity duration-150 hover:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      style={{ color: "#6B7280" }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M10 12L6 8l4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </button>
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
