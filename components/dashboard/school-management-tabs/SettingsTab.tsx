import { useState } from "react";
import { InvitesTab } from "./InvitesTab";
import { SettingsDangerZonePanel } from "./SettingsDangerZonePanel";
import { SettingsExamRoomsPanel } from "./SettingsExamRoomsPanel";
import { SettingsGoogleSheetPanel } from "./SettingsGoogleSheetPanel";
import { SettingsSubjectsPanel } from "./SettingsSubjectsPanel";
import type { ExamSlot, Reservation, SchoolInvite, SchoolSubject } from "./types";

export type SettingsSection = "subjects" | "examRooms" | "invites" | "googleSheet" | "danger";

type SettingsTabProps = {
  schoolId: string;
  schoolName: string;
  canManageAdminSettings: boolean;
  initialExamSlots: ExamSlot[];
  reservations: Reservation[];
  initialSubjects: SchoolSubject[];
  invites: SchoolInvite[];
  inviteError: string | null;
  initialSection?: SettingsSection;
};

const settingsSections: { id: SettingsSection; label: string; adminOnly: boolean }[] = [
  { id: "subjects", label: "Subjects", adminOnly: false },
  { id: "examRooms", label: "Exam rooms", adminOnly: false },
  { id: "invites", label: "Invites", adminOnly: true },
  { id: "googleSheet", label: "Google Sheet", adminOnly: true },
  { id: "danger", label: "Danger zone", adminOnly: true },
];

export function SettingsTab({
  schoolId,
  schoolName,
  canManageAdminSettings,
  initialExamSlots,
  reservations,
  initialSubjects,
  invites,
  inviteError,
  initialSection = "examRooms",
}: SettingsTabProps) {
  const visibleSections = settingsSections.filter(
    (section) => canManageAdminSettings || !section.adminOnly,
  );
  const [selectedSection, setSelectedSection] = useState<SettingsSection>(initialSection);
  const activeSection = visibleSections.some((section) => section.id === selectedSection)
    ? selectedSection
    : "examRooms";

  return (
    <div className="p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          School settings
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Configure school-level scheduling details.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="School settings">
        {visibleSections.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={activeSection === section.id}
            onClick={() => setSelectedSection(section.id)}
            className="h-9 rounded-[10px] px-4 text-sm font-semibold transition-colors duration-150"
            style={
              activeSection === section.id
                ? {
                    background: "var(--accent-subtle)",
                    border: "1px solid var(--accent-border)",
                    color: "var(--accent-strong)",
                  }
                : {
                    background: "var(--surface-panel)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-secondary)",
                  }
            }
          >
            {section.label}
          </button>
        ))}
      </div>

      {activeSection === "subjects" && (
        <SettingsSubjectsPanel schoolId={schoolId} initialSubjects={initialSubjects} />
      )}

      {activeSection === "examRooms" && (
        <SettingsExamRoomsPanel
          schoolId={schoolId}
          initialExamSlots={initialExamSlots}
          reservations={reservations}
        />
      )}

      {activeSection === "invites" && (
        <InvitesTab
          schoolId={schoolId}
          invites={invites}
          inviteError={inviteError}
          embedded
        />
      )}

      {activeSection === "googleSheet" && <SettingsGoogleSheetPanel schoolId={schoolId} />}

      {activeSection === "danger" && (
        <SettingsDangerZonePanel schoolId={schoolId} schoolName={schoolName} />
      )}
    </div>
  );
}
