"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays } from "lucide-react";

interface NavbarProps {
  userName: string;
  userEmail: string;
}

export default function Navbar({ userName, userEmail }: NavbarProps) {
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
        {/* University selector */}
        <button
          className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-colors duration-150 hover:bg-slate-50"
          style={{ border: "1px solid #E4E8EF" }}
          aria-label="Switch institution"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 13.5V7.5l6-4.5 6 4.5v6M6 13.5V10h4v3.5"
              stroke="#6B7280"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-left">
            <p
              className="text-[12px] font-semibold leading-tight"
              style={{ color: "#1F2937" }}
            >
              State University
            </p>
            <p
              className="text-[11px] leading-tight"
              style={{ color: "#9CA3AF" }}
            >
              Computer Science
            </p>
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3.5 5.5l3.5 3 3.5-3"
              stroke="#9CA3AF"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Notifications */}
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-150 hover:bg-slate-100"
          aria-label="Notifications"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M8 1.5A4 4 0 0 0 4 5.5v3L2.5 10H13.5L12 8.5v-3A4 4 0 0 0 8 1.5z"
              stroke="#6B7280"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="M6.5 10.5a1.5 1.5 0 0 0 3 0"
              stroke="#6B7280"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>

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
