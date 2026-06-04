import type { CSSProperties } from "react";
import type { SchoolRole } from "./types";

export const roleOptions: SchoolRole[] = ["student", "exam_supervisor", "professor", "admin"];

export function getRolePillStyle(role: SchoolRole): CSSProperties {
  switch (role) {
    case "admin":
      return { background: "#D1FAE5", color: "#065F46" };
    case "professor":
      return { background: "#EDE9FE", color: "#5B21B6" };
    case "exam_supervisor":
      return { background: "#FEF3C7", color: "#92400E" };
    case "student":
      return { background: "#DBEAFE", color: "#1D4ED8" };
  }
}
