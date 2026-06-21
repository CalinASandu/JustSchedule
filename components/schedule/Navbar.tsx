"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays, LogOut } from "lucide-react";
import NotificationBell, {
  type NotificationBellItem,
} from "@/components/dashboard/NotificationBell";

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
      className="sticky top-0 z-30 flex h-14 items-center bg-white px-4 sm:px-6"
      style={{ borderBottom: "1px solid #E4E8EF" }}
    >
      {/* Brand */}
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: "#2563EB" }}
        >
          <CalendarDays size={17} color="white" strokeWidth={2} />
        </div>
        <span
          className="truncate text-[15px] font-semibold"
          style={{ color: "#111827" }}
        >
          JustSchedule
        </span>
      </div>

      <div className="flex-1" />

      {/* Right utilities */}
      <div className="flex items-center gap-2">
        <NotificationBell notifications={notifications} />

        <button
          type="button"
          onClick={handleSignOut}
          className="hidden items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:flex"
          style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
        >
          Sign out
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sign out"
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:hidden"
          style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
        >
          <LogOut size={17} aria-hidden="true" />
        </button>

        {/* Avatar */}
        <div
          className="hidden h-8 w-8 select-none items-center justify-center rounded-full text-[11px] font-semibold text-white sm:flex"
          style={{ background: "#2563EB" }}
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
