import type { CSSProperties } from "react";
import type { SchoolRole } from "./types";

export const roleOptions: SchoolRole[] = ["student", "exam_supervisor", "professor", "admin"];

export function getRolePillStyle(role: SchoolRole): CSSProperties {
  switch (role) {
    case "admin":
      return { background: "var(--role-admin-bg)", color: "var(--role-admin-text)" };
    case "professor":
      return { background: "var(--role-professor-bg)", color: "var(--role-professor-text)" };
    case "exam_supervisor":
      return { background: "var(--role-supervisor-bg)", color: "var(--role-supervisor-text)" };
    case "student":
      return { background: "var(--accent-muted)", color: "var(--accent-strong)" };
  }
}
