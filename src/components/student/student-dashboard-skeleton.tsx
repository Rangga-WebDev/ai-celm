/** @format */

function PulseBox({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded-3xl bg-slate-200 ${className}`} />
  );
}

export default function StudentDashboardSkeleton() {
  return (
    <div className="space-y-8">
      <PulseBox className="h-32 w-full" />
      <div className="grid gap-4 sm:grid-cols-3">
        <PulseBox className="h-28 w-full" />
        <PulseBox className="h-28 w-full" />
        <PulseBox className="h-28 w-full" />
      </div>
      <div className="space-y-4">
        <PulseBox className="h-44 w-full" />
        <PulseBox className="h-44 w-full" />
      </div>
    </div>
  );
}
