import AppHeaderSkeleton from "@/components/skeletons/AppHeaderSkeleton";
import Skeleton from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-dvh" style={{ background: "var(--surface-page)" }}>
      <AppHeaderSkeleton />

      <main className="mx-auto w-full max-w-[1180px] px-6 py-8">
        <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <h1
              className="text-[1.35rem] font-bold"
              style={{
                color: "var(--text-primary)",
                letterSpacing: "-0.025em",
                lineHeight: 1.25,
              }}
            >
              Your schools
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              Choose a school to continue.
            </p>
          </div>

          <div className="panel p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-44" />
              </div>
            </div>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((card) => (
            <article
              key={card}
              className="panel flex min-h-[178px] flex-col justify-between p-5"
            >
              <div>
                <div className="mb-5 flex items-start justify-between gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <Skeleton className="h-4 w-4 rounded-[5px]" />
                </div>
                <Skeleton className="h-4 w-[min(100%,150px)]" />
                <Skeleton className="mt-2 h-3 w-[min(100%,110px)]" />
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
