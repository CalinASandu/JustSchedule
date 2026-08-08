import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AppHeaderSkeleton from "@/components/skeletons/AppHeaderSkeleton";
import Skeleton from "@/components/ui/skeleton";

const TAB_WIDTHS = [88, 118, 132, 108, 122, 92];

export default function SchoolDashboardLoading() {
  return (
    <div className="min-h-dvh" style={{ background: "var(--surface-page)" }}>
      <AppHeaderSkeleton />

      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href="/dashboard"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft size={15} strokeWidth={1.8} />
          Schools
        </Link>

        <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">
            <Skeleton className="h-7 w-[min(100%,280px)] rounded-[10px]" />
            <Skeleton className="mt-2.5 h-4 w-[min(100%,340px)]" />
          </div>

          <div className="panel p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-[17px] w-[17px] rounded-[5px]" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-40" />
              </div>
            </div>
          </div>
        </div>

        <section className="panel min-w-0 overflow-hidden">
          <div style={{ borderBottom: "1px solid var(--border-default)" }}>
            <div className="flex gap-1 overflow-x-hidden px-2 py-2">
              {TAB_WIDTHS.map((width) => (
                <Skeleton
                  key={width}
                  className="h-11 shrink-0 rounded-[12px]"
                  style={{ width }}
                />
              ))}
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <Skeleton className="h-10 w-full max-w-[280px] rounded-[12px]" />
              <Skeleton className="h-10 w-28 rounded-[12px]" />
              <div className="flex-1" />
              <Skeleton className="h-10 w-36 rounded-[12px]" />
            </div>

            <div className="grid gap-3">
              {[0, 1, 2, 3, 4].map((row) => (
                <div
                  key={row}
                  className="rounded-[14px] p-4"
                  style={{ border: "1px solid var(--border-default)" }}
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-4 w-[min(100%,180px)]" />
                      <Skeleton className="mt-2 h-3 w-[min(100%,120px)]" />
                    </div>
                    <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
                    <Skeleton className="h-8 w-8 shrink-0 rounded-[10px]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
