"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DashboardSignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleSignOut}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:hidden"
        style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
        aria-label="Sign out"
      >
        <LogOut size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={handleSignOut}
        className="hidden items-center gap-2 rounded-xl px-3 py-1.5 transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:flex"
        style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
      >
        Sign out
      </button>
    </>
  );
}
