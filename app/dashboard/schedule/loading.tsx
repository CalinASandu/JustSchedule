import AppHeaderSkeleton from "@/components/skeletons/AppHeaderSkeleton";
import Skeleton from "@/components/ui/skeleton";

export default function ScheduleLoading() {
  return (
    <div className="min-h-dvh" style={{ background: "var(--surface-page)" }}>
      <AppHeaderSkeleton />

      <main className="mx-auto w-full max-w-[1400px] px-4 pb-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 py-5 sm:py-7 lg:flex-row lg:items-end lg:justify-between lg:py-8">
          <div className="min-w-0">
            <Skeleton className="mb-2 h-3 w-36" />
            <Skeleton className="h-7 w-[min(100%,260px)] rounded-[10px]" />
            <Skeleton className="mt-2.5 h-4 w-[min(100%,180px)]" />
          </div>

          <div className="panel grid w-full grid-cols-3 gap-1 p-1 sm:w-auto">
            {[0, 1, 2].map((tab) => (
              <Skeleton
                key={tab}
                className="h-10 rounded-[12px] sm:w-[132px]"
              />
            ))}
          </div>
        </div>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,640px)_minmax(300px,1fr)] lg:items-start">
          {/* Left column: step bar + calendar */}
          <div className="min-w-0">
            <div className="mb-4 flex items-center gap-2">
              {[0, 1, 2].map((step) => (
                <Skeleton key={step} className="h-2 flex-1 rounded-full" />
              ))}
            </div>

            <div className="panel p-4 sm:p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <Skeleton className="h-5 w-40" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-[10px]" />
                  <Skeleton className="h-8 w-8 rounded-[10px]" />
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }, (_, index) => (
                  <Skeleton key={`dow-${index}`} className="mx-auto h-3 w-6" />
                ))}
                {Array.from({ length: 35 }, (_, index) => (
                  <Skeleton key={`day-${index}`} className="aspect-square rounded-[10px]" />
                ))}
              </div>
            </div>
          </div>

          {/* Right column: seat availability + summary */}
          <div className="flex min-w-0 flex-col gap-4">
            <div className="panel p-4 sm:p-5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="mt-2 h-3 w-48" />
              <div className="mt-4 flex flex-col gap-3">
                {[0, 1, 2, 3].map((slot) => (
                  <div key={slot}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3.5 w-12" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </div>

            <div className="panel p-4 sm:p-5">
              <Skeleton className="h-4 w-32" />
              <div className="mt-4 flex flex-col gap-3">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 shrink-0 rounded-[10px]" />
                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-3.5 w-[min(100%,140px)]" />
                      <Skeleton className="mt-1.5 h-3 w-[min(100%,100px)]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
