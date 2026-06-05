import { useState } from "react";
import { SettingsDangerZonePanel } from "./SettingsDangerZonePanel";
import { SettingsExamRoomsPanel } from "./SettingsExamRoomsPanel";
import { SettingsSubjectsPanel } from "./SettingsSubjectsPanel";
import type { ExamSlot, SchoolSubject } from "./types";

type SettingsSection = "subjects" | "examRooms" | "danger";

type SettingsTabProps = {
  schoolId: string;
  schoolName: string;
  initialExamSlots: ExamSlot[];
  initialSubjects: SchoolSubject[];
};

const settingsSections: { id: SettingsSection; label: string }[] = [
  { id: "subjects", label: "Subjects" },
  { id: "examRooms", label: "Exam rooms" },
  { id: "danger", label: "Danger zone" },
];

export function SettingsTab({
  schoolId,
  schoolName,
  initialExamSlots,
  initialSubjects,
}: SettingsTabProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("examRooms");

  return (
    <div className="p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold" style={{ color: "#111827" }}>
          School settings
        </h2>
        <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
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
                    background: "#EFF6FF",
                    border: "1px solid #BFDBFE",
                    color: "#1D4ED8",
                  }
                : {
                    background: "#FFFFFF",
                    border: "1px solid #E4E8EF",
                    color: "#6B7280",
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

      {activeSection === "danger" && (
        <SettingsDangerZonePanel schoolId={schoolId} schoolName={schoolName} />
      )}
    </div>
  );
}
