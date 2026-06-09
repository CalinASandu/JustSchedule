"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AttendanceTab } from "./school-management-tabs/AttendanceTab";
import { ExamRequestsTab } from "./school-management-tabs/ExamRequestsTab";
import { JoinRequestsTab } from "./school-management-tabs/JoinRequestsTab";
import { MembersTab } from "./school-management-tabs/MembersTab";
import { ReservationsTab } from "./school-management-tabs/ReservationsTab";
import { SettingsTab, type SettingsSection } from "./school-management-tabs/SettingsTab";
import type {
  AttendanceSession,
  ExamSlot,
  JoinRequest,
  Reservation,
  ScheduleRequest,
  SchoolDashboardTab,
  SchoolInvite,
  SchoolMember,
  SchoolRole,
  SchoolSubject,
} from "./school-management-tabs/types";

type Props = {
  schoolId: string;
  schoolName: string;
  members: SchoolMember[];
  invites: SchoolInvite[];
  joinRequests: JoinRequest[];
  scheduleRequests: ScheduleRequest[];
  examSlots: ExamSlot[];
  reservations: Reservation[];
  attendanceSessions: AttendanceSession[];
  schoolSubjects: SchoolSubject[];
  currentUserRole: Exclude<SchoolRole, "student">;
  memberError: string | null;
  inviteError: string | null;
  joinRequestError: string | null;
  scheduleRequestError: string | null;
  reservationError: string | null;
  canManageMembers: boolean;
  canManageSelfBooking: boolean;
  canViewAttendance: boolean;
  canMarkAttendance: boolean;
};

export default function SchoolManagementTabs({
  schoolId,
  schoolName,
  members,
  invites,
  joinRequests,
  scheduleRequests,
  examSlots,
  reservations,
  attendanceSessions,
  schoolSubjects,
  currentUserRole,
  memberError,
  inviteError,
  joinRequestError,
  scheduleRequestError,
  reservationError,
  canManageMembers,
  canManageSelfBooking,
  canViewAttendance,
  canMarkAttendance,
}: Props) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab =
    requestedTab === "examRequests" && currentUserRole !== "exam_supervisor"
      ? "examRequests"
      : requestedTab === "invites" && canManageMembers
        ? "settings"
      : currentUserRole === "exam_supervisor"
        ? "reservations"
        : "members";
  const initialSettingsSection: SettingsSection =
    requestedTab === "invites" ? "invites" : "examRooms";
  const [activeTab, setActiveTab] = useState<SchoolDashboardTab>(
    initialTab,
  );
  const activeExamSlots = examSlots.filter((slot) => slot.isActive);
  const canViewExamRequests = currentUserRole === "admin" || currentUserRole === "professor";

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
    <section className="panel anim-slide-up anim-d1">
      <div className="flex border-b border-[#E4E8EF] px-2 pt-2">
        {currentUserRole !== "exam_supervisor" && renderTabButton("members", "Members")}
        {renderTabButton("reservations", "Reservations")}
        {canViewExamRequests && renderTabButton("examRequests", "Exam Requests")}
        {canViewAttendance && renderTabButton("attendance", "Attendance")}
        {canManageMembers && renderTabButton("requests", "Join Requests")}
        {canManageMembers && renderTabButton("settings", "Settings")}
      </div>

      {activeTab === "members" && currentUserRole !== "exam_supervisor" && (
        <MembersTab
          schoolId={schoolId}
          schoolName={schoolName}
          members={members}
          memberError={memberError}
          examSlots={activeExamSlots}
          reservations={reservations}
          subjects={schoolSubjects}
          canManageMembers={canManageMembers}
          canManageSelfBooking={canManageSelfBooking}
        />
      )}

      {activeTab === "reservations" && (
        <ReservationsTab
          reservationError={reservationError}
          examSlots={activeExamSlots}
          reservations={reservations}
          members={members}
          currentUserRole={currentUserRole}
        />
      )}

      {activeTab === "attendance" && canViewAttendance && (
        <AttendanceTab
          examSlots={activeExamSlots}
          reservations={reservations}
          attendanceSessions={attendanceSessions}
          members={members}
          canMarkAttendance={canMarkAttendance}
        />
      )}

      {activeTab === "examRequests" && canViewExamRequests && (
        <ExamRequestsTab
          requests={scheduleRequests}
          requestError={scheduleRequestError}
          examSlots={activeExamSlots}
          currentUserRole={currentUserRole}
        />
      )}

      {activeTab === "requests" && canManageMembers && (
        <JoinRequestsTab
          schoolId={schoolId}
          joinRequests={joinRequests}
          joinRequestError={joinRequestError}
        />
      )}

      {activeTab === "settings" && canManageMembers && (
        <SettingsTab
          schoolId={schoolId}
          schoolName={schoolName}
          initialExamSlots={examSlots}
          initialSubjects={schoolSubjects}
          invites={invites}
          inviteError={inviteError}
          initialSection={initialSettingsSection}
        />
      )}
    </section>
  );
}
