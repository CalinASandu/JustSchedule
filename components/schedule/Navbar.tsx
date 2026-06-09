"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays } from "lucide-react";
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
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <header
      className="h-14 bg-white flex items-center px-6 sticky top-0 z-30"
      style={{ borderBottom: "1px solid #E4E8EF" }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "#2563EB" }}
        >
          <CalendarDays size={17} color="white" strokeWidth={2} />
        </div>
        <span
          className="text-[15px] font-semibold"
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
          onClick={handleSignOut}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors duration-150 hover:bg-slate-50"
          style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
        >
          Sign out
        </button>

        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-semibold select-none"
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
