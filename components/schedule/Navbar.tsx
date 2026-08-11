"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays, LogOut } from "lucide-react";
import NotificationBell, {
  type NotificationBellItem,
} from "@/components/dashboard/NotificationBell";
import ThemeToggle from "@/components/theme/ThemeToggle";

interface NavbarProps {
  userName: string;
  userEmail: string;
  notifications?: NotificationBellItem[];
}

export default function Navbar({ userName, userEmail, notifications = [] }: NavbarProps) {
  const router = useRouter();
  const initials =
    userName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "JS";

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/");
    router.refresh();
  }

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center px-4 sm:px-6"
      style={{ background: "var(--surface-panel)", borderBottom: "1px solid var(--border-default)" }}
    >
      {/* Brand */}
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: "var(--accent-color)" }}
        >
          <CalendarDays size={17} color="var(--text-on-accent)" strokeWidth={2} />
        </div>
        <span
          className="truncate text-[15px] font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          JustSchedule
        </span>
      </div>

      <div className="flex-1" />

      {/* Right utilities */}
      <div className="flex items-center gap-2">
        <NotificationBell notifications={notifications} />

        <ThemeToggle />

        <button
          type="button"
          onClick={handleSignOut}
          className="hidden items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors duration-150 hover:bg-[var(--surface-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] sm:flex"
          style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
        >
          Sign out
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sign out"
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-[var(--surface-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] sm:hidden"
          style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
        >
          <LogOut size={17} aria-hidden="true" />
        </button>

        {/* Avatar */}
        <div
          className="hidden h-8 w-8 select-none items-center justify-center rounded-full text-[11px] font-semibold sm:flex"
          style={{ background: "var(--accent-color)", color: "var(--text-on-accent)" }}
          aria-label={userEmail}
          title={userEmail}
          role="img"
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
