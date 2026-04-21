/** @format */

function PulseBox({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />
  );
}

export default function StudentDashboardSkeleton() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[92rem] space-y-6">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between">
            <PulseBox className="h-10 w-48" />
            <PulseBox className="h-10 w-40" />
          </div>
        </div>

        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <PulseBox className="h-8 w-40" />
              <PulseBox className="h-12 w-3/4" />
              <PulseBox className="h-20 w-full" />
              <div className="grid grid-cols-3 gap-4">
                <PulseBox className="h-24 w-full" />
                <PulseBox className="h-24 w-full" />
                <PulseBox className="h-24 w-full" />
              </div>
            </div>

            <PulseBox className="h-72 w-full" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PulseBox className="h-36 w-full" />
          <PulseBox className="h-36 w-full" />
          <PulseBox className="h-36 w-full" />
          <PulseBox className="h-36 w-full" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <PulseBox className="h-96 w-full" />
            <div className="grid gap-6 lg:grid-cols-2">
              <PulseBox className="h-72 w-full" />
              <PulseBox className="h-72 w-full" />
            </div>
          </div>

          <div className="space-y-6">
            <PulseBox className="h-96 w-full" />
            <PulseBox className="h-48 w-full" />
            <PulseBox className="h-64 w-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
