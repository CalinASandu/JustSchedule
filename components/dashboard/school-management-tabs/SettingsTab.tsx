import { useState } from "react";
import { InvitesTab } from "./InvitesTab";
import { SettingsDangerZonePanel } from "./SettingsDangerZonePanel";
import { SettingsExamRoomsPanel } from "./SettingsExamRoomsPanel";
import { SettingsSubjectsPanel } from "./SettingsSubjectsPanel";
import type { ExamSlot, SchoolInvite, SchoolSubject } from "./types";

export type SettingsSection = "subjects" | "examRooms" | "invites" | "danger";

type SettingsTabProps = {
  schoolId: string;
  schoolName: string;
  initialExamSlots: ExamSlot[];
  initialSubjects: SchoolSubject[];
  invites: SchoolInvite[];
  inviteError: string | null;
  initialSection?: SettingsSection;
};

const settingsSections: { id: SettingsSection; label: string }[] = [
  { id: "subjects", label: "Subjects" },
  { id: "examRooms", label: "Exam rooms" },
  { id: "invites", label: "Invites" },
  { id: "danger", label: "Danger zone" },
];

export function SettingsTab({
  schoolId,
  schoolName,
  initialExamSlots,
  initialSubjects,
  invites,
  inviteError,
  initialSection = "examRooms",
}: SettingsTabProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);

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
        {settingsSections.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={activeSection === section.id}
            onClick={() => setActiveSection(section.id)}
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
        <SettingsExamRoomsPanel schoolId={schoolId} initialExamSlots={initialExamSlots} />
      )}

      {activeSection === "invites" && (
        <InvitesTab
          schoolId={schoolId}
          invites={invites}
          inviteError={inviteError}
          embedded
        />
      )}

      {activeSection === "danger" && (
        <SettingsDangerZonePanel schoolId={schoolId} schoolName={schoolName} />
      )}
    </div>
  );
}
