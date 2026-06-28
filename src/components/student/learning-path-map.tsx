/** @format */

"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  Lock,
  PlayCircle,
  RotateCcw,
} from "lucide-react";

type PathModule = {
  id: string;
  title: string;
  slug: string;
  order: number;
  status: string;
  progressPercent: number;
  totalUnits: number;
  completedUnits: number;
};

type Props = {
  courseSlug: string;
  modules: PathModule[];
};

function nodeStyle(status: string) {
  switch (status) {
    case "COMPLETED":
      return {
        ring: "border-emerald-300 bg-emerald-50",
        dot: "bg-emerald-600 text-white",
        line: "bg-emerald-300",
        label: "Selesai",
        labelClass: "text-emerald-700",
      };
    case "IN_PROGRESS":
      return {
        ring: "border-amber-300 bg-amber-50",
        dot: "bg-amber-500 text-white",
        line: "bg-amber-200",
        label: "Sedang berjalan",
        labelClass: "text-amber-700",
      };
    case "REMEDIAL":
      return {
        ring: "border-orange-300 bg-orange-50",
        dot: "bg-orange-500 text-white",
        line: "bg-orange-200",
        label: "Perlu diulang",
        labelClass: "text-orange-700",
      };
    case "LOCKED":
      return {
        ring: "border-slate-200 bg-slate-50",
        dot: "bg-slate-300 text-white",
        line: "bg-slate-200",
        label: "Terkunci",
        labelClass: "text-slate-500",
      };
    default:
      return {
        ring: "border-slate-200 bg-white",
        dot: "bg-slate-400 text-white",
        line: "bg-slate-200",
        label: "Belum mulai",
        labelClass: "text-slate-500",
      };
  }
}

function StatusIcon({ status }: { status: string }) {
  if (status === "COMPLETED")
    return <CheckCircle2 size={18} aria-hidden="true" />;
  if (status === "IN_PROGRESS")
    return <PlayCircle size={18} aria-hidden="true" />;
  if (status === "REMEDIAL") return <RotateCcw size={18} aria-hidden="true" />;
  if (status === "LOCKED") return <Lock size={18} aria-hidden="true" />;
  return <Circle size={18} aria-hidden="true" />;
}

/**
 * Peta belajar visual (branching learning path).
 * Menampilkan urutan modul sebagai alur bertahap dengan status tiap modul,
 * sehingga mahasiswa mudah melihat posisi dan langkah berikutnya.
 */
export default function LearningPathMap({ courseSlug, modules }: Props) {
  if (modules.length === 0) return null;

  const sorted = [...modules].sort((a, b) => a.order - b.order);
  const nextModule =
    sorted.find((m) => m.status === "IN_PROGRESS" || m.status === "REMEDIAL") ??
    sorted.find((m) => m.status === "NOT_STARTED" || m.status === "LOCKED") ??
    null;

  return (
    <section
      className="rounded-3xl border border-slate-200 bg-white p-6"
      aria-label="Peta belajar"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Peta Belajar</h2>
          <p className="mt-1 text-sm text-slate-600">
            Ikuti alur modul secara bertahap. Posisi Anda ditandai jelas di
            bawah ini.
          </p>
        </div>
        {nextModule && nextModule.status !== "LOCKED" ? (
          <Link
            href={`/student/courses/${courseSlug}/learn`}
            className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            <PlayCircle size={18} aria-hidden="true" />
            Lanjut: {nextModule.title}
          </Link>
        ) : null}
      </div>

      <ol className="mt-6 space-y-0">
        {sorted.map((module, index) => {
          const style = nodeStyle(module.status);
          const isLast = index === sorted.length - 1;
          const isNext = nextModule?.id === module.id;

          return (
            <li key={module.id} className="flex gap-4">
              {/* Garis & simpul */}
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${style.dot}`}
                >
                  <StatusIcon status={module.status} />
                </span>
                {!isLast ? (
                  <span
                    className={`my-1 w-1 flex-1 rounded-full ${style.line}`}
                    aria-hidden="true"
                  />
                ) : null}
              </div>

              {/* Kartu modul */}
              <div
                className={`mb-4 flex-1 rounded-2xl border p-4 ${style.ring} ${
                  isNext ? "ring-2 ring-teal-400" : ""
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-500">
                      Modul {module.order}
                      {isNext ? (
                        <span className="ml-2 rounded-full bg-teal-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                          Posisi Anda
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-0.5 truncate text-base font-bold text-slate-900">
                      {module.title}
                    </h3>
                  </div>
                  <span className={`text-sm font-semibold ${style.labelClass}`}>
                    {style.label}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                    <span>
                      {module.completedUnits} / {module.totalUnits} bagian
                    </span>
                    <span className="font-semibold text-slate-800">
                      {module.progressPercent}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/70">
                    <div
                      className="h-full rounded-full bg-teal-600"
                      style={{
                        width: `${Math.max(0, Math.min(100, module.progressPercent))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
