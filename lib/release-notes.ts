/**
 * Release notes shown in the "What's new" dialog.
 *
 * This is deliberately separate from `UserNotifications`, which is a per-user
 * event feed (one row per user per event). A release announcement is the same
 * content for everyone, shown once, on entry - so it lives in code and ships
 * in the same PR as the feature it describes.
 *
 * To announce a release: prepend an entry to `RELEASES`. Array position is the
 * only ordering authority; nothing parses the version string.
 */

import type { LucideIcon } from "lucide-react";
import { CalendarClock, Moon, Send, Smartphone, Sparkles, Zap } from "lucide-react";

/**
 * Icons available to release notes. Keeping this a closed map means an
 * unknown icon name is a type error rather than a blank space at runtime.
 */
export const RELEASE_ICONS = {
  calendar: CalendarClock,
  moon: Moon,
  send: Send,
  phone: Smartphone,
  sparkles: Sparkles,
  zap: Zap,
} as const satisfies Record<string, LucideIcon>;

export type ReleaseIconName = keyof typeof RELEASE_ICONS;

export type ReleaseNoteItem = {
  icon: ReleaseIconName;
  /** One user-facing sentence. Say what the person can now do, not what changed internally. */
  text: string;
};

export type Release = {
  /** Opaque identifier, `YYYY.MM.N`. Compared by equality only, never parsed. */
  version: string;
  title: string;
  /** ISO date, displayed only. */
  date: string;
  items: ReleaseNoteItem[];
};

/** Newest first. Index 0 is the current release. */
export const RELEASES: Release[] = [
  {
    version: "2026.08.1",
    title: "Exam requests, dark mode, and a faster app",
    date: "2026-08-11",
    items: [
      {
        icon: "send",
        text: "Can't book your own exams? Ask a professor for a slot from the schedule page.",
      },
      {
        icon: "moon",
        text: "Dark mode. Switch it in the header, or let it follow your device.",
      },
      {
        icon: "zap",
        text: "Pages open instantly instead of waiting on a blank screen.",
      },
      {
        icon: "phone",
        text: "The schedule, reservations, and attendance now work properly on a phone.",
      },
    ],
  },
];

/** The version a user is considered caught up to once they dismiss the dialog. */
export function getLatestVersion(): string | null {
  return RELEASES[0]?.version ?? null;
}
