import { CalendarDays } from "lucide-react";
import Skeleton from "@/components/ui/skeleton";

/**
 * Matches the 56px app header used by the dashboard, school management, and
 * schedule shells. The brand mark is rendered for real so the header stays
 * visually stable across the loading -> loaded transition; only the
 * user-specific controls on the right are placeholders.
 */
export default function AppHeaderSkeleton() {
  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center px-4 sm:px-6"
      style={{
        background: "var(--surface-panel)",
        borderBottom: "1px solid var(--border-default)",
      }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: "var(--accent-color)" }}
        >
          <CalendarDays size={17} color="var(--text-on-accent)" strokeWidth={2} />
        </div>
        <span
          className="text-[15px] font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          JustSchedule
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-xl sm:h-8 sm:w-20 sm:rounded-[10px]" />
        <Skeleton className="hidden h-8 w-8 rounded-full sm:block" />
      </div>
    </header>
  );
}
