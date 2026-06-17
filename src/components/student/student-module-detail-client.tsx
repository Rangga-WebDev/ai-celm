/** @format */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Layers3,
  PlayCircle,
} from "lucide-react";

type StudentModuleDetailClientProps = {
  user: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    email: string;
    role: string;
  };
  courseSlug: string;
  moduleSlug: string;
};

type CourseModulesResponse = {
  success: boolean;
  message: string;
  data: {
    courseId: string;
    courseTitle: string;
    courseSlug: string;
    modules: Array<{
      id: string;
      title: string;
      slug: string;
      description: string | null;
      order: number;
      estimatedMinutes: number | null;
      status: string;
      isLocked: boolean;
      masteryThreshold: number;
      totalUnits: number;
      createdAt: string;
      updatedAt: string;
    }>;
  };
};

type ModuleUnitsResponse = {
  success: boolean;
  message: string;
  data: {
    moduleId: string;
    moduleTitle: string;
    moduleSlug: string;
    units: Array<{
      id: string;
      title: string;
      slug: string;
      description: string | null;
      content: string | null;
      order: number;
      unitType: string;
      estimatedMinutes: number | null;
      isRequired: boolean;
      isLocked: boolean;
      masteryThreshold: number | null;
      subCpmks: Array<{
        id: string;
        code: string;
        statement: string;
        order: number;
      }>;
      resources: Array<{
        id: string;
        title: string;
        description: string | null;
        type: string;
        url: string;
      }>;
      createdAt: string;
      updatedAt: string;
    }>;
  };
};

type CourseProgressResponse = {
  success: boolean;
  message: string;
  data: {
    userId: string;
    course: {
      id: string;
      title: string;
      slug: string;
      code: string | null;
    };
    enrollment: {
      id: string;
      status: string;
      enrolledAt: string;
      completedAt: string | null;
    };
    summary: {
      totalModules: number;
      completedModules: number;
      overallProgress: number;
    };
    modules: Array<{
      id: string;
      title: string;
      slug: string;
      order: number;
      estimatedMinutes: number | null;
      masteryThreshold: number;
      progress: {
        status: string;
        progressPercent: number;
        masteryScore: number | null;
        isPassed: boolean;
        remedialRequired: boolean;
        startedAt: string | null;
        completedAt: string | null;
        lastAccessedAt: string | null;
      };
      units: Array<{
        id: string;
        title: string;
        slug: string;
        order: number;
        unitType: string;
        estimatedMinutes: number | null;
        progress: {
          status: string;
          progressPercent: number;
          score: number | null;
          attempts: number;
          isPassed: boolean;
          remedialRequired: boolean;
          startedAt: string | null;
          completedAt: string | null;
          lastAccessedAt: string | null;
        };
      }>;
    }>;
  };
};

function getStatusBadge(status?: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "REMEDIAL":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "LOCKED":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function getReadableStatus(status?: string) {
  switch (status) {
    case "COMPLETED":
      return "Selesai";
    case "IN_PROGRESS":
      return "Berjalan";
    case "REMEDIAL":
      return "Perlu diulang";
    case "LOCKED":
      return "Terkunci";
    default:
      return "Belum mulai";
  }
}

export default function StudentModuleDetailClient({
  user,
  courseSlug,
  moduleSlug,
}: StudentModuleDetailClientProps) {
  void user;

  const [moduleMeta, setModuleMeta] = useState<
    CourseModulesResponse["data"]["modules"][number] | null
  >(null);
  const [units, setUnits] = useState<ModuleUnitsResponse["data"]["units"]>([]);
  const [courseTitle, setCourseTitle] = useState("");
  const [progressModule, setProgressModule] = useState<
    CourseProgressResponse["data"]["modules"][number] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchModuleDetail() {
      try {
        setLoading(true);
        setError(null);

        const modulesRes = await fetch(`/api/courses/${courseSlug}/modules`, {
          cache: "no-store",
        });

        const modulesJson = (await modulesRes.json()) as CourseModulesResponse;

        if (!modulesRes.ok || !modulesJson.success) {
          throw new Error(
            modulesJson.message || "Gagal mengambil daftar modul",
          );
        }

        const currentModule = modulesJson.data.modules.find(
          (item) => item.slug === moduleSlug,
        );

        if (!currentModule) {
          throw new Error("Modul tidak ditemukan");
        }

        const [unitsRes, progressRes] = await Promise.all([
          fetch(`/api/modules/${currentModule.id}/units`, {
            cache: "no-store",
          }),
          fetch(`/api/courses/${courseSlug}/progress`, {
            cache: "no-store",
          }),
        ]);

        const unitsJson = (await unitsRes.json()) as ModuleUnitsResponse;
        const progressJson =
          (await progressRes.json()) as CourseProgressResponse;

        if (!unitsRes.ok || !unitsJson.success) {
          throw new Error(unitsJson.message || "Gagal mengambil bagian modul");
        }

        if (!progressRes.ok || !progressJson.success) {
          throw new Error(
            progressJson.message || "Gagal mengambil progres modul",
          );
        }

        const currentModuleProgress = progressJson.data.modules.find(
          (item) => item.slug === moduleSlug,
        );

        setCourseTitle(modulesJson.data.courseTitle);
        setModuleMeta(currentModule);
        setUnits(unitsJson.data.units);
        setProgressModule(currentModuleProgress ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    }

    fetchModuleDetail();
  }, [courseSlug, moduleSlug]);

  const derived = useMemo(() => {
    if (!moduleMeta || !progressModule) return null;

    const totalUnits = progressModule.units.length;
    const completedUnits = progressModule.units.filter(
      (unit) => unit.progress.status === "COMPLETED",
    ).length;

    const inProgressUnits = progressModule.units.filter(
      (unit) => unit.progress.status === "IN_PROGRESS",
    ).length;

    const nextUnit =
      progressModule.units.find(
        (unit) => unit.progress.status !== "COMPLETED",
      ) ?? null;

    return {
      totalUnits,
      completedUnits,
      inProgressUnits,
      nextUnit,
    };
  }, [moduleMeta, progressModule]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-44 animate-pulse rounded-3xl bg-slate-200" />
        <div className="h-72 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
        <p className="text-base text-rose-700">{error}</p>
        <Link
          href={`/student/courses/${courseSlug}`}
          className="mt-4 inline-flex rounded-2xl bg-rose-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-rose-700"
        >
          Kembali ke Kelas
        </Link>
      </div>
    );
  }

  if (!moduleMeta || !progressModule || !derived) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
        Data modul belum tersedia.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Kepala */}
      <section className="rounded-3xl bg-teal-600 px-6 py-7 text-white sm:px-8">
        <Link
          href={`/student/courses/${courseSlug}`}
          className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-base font-medium transition hover:bg-white/25"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Kembali ke Kelas
        </Link>

        <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-base">
          <Layers3 size={18} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{courseTitle}</span>
        </div>

        <h1 className="mt-4 wrap-break-word text-2xl font-bold sm:text-3xl">
          {moduleMeta.title}
        </h1>
        <p className="mt-2 max-w-3xl wrap-break-word text-lg leading-relaxed text-teal-50">
          {moduleMeta.description ?? "Belum ada deskripsi modul."}
        </p>

        <div className="mt-5 max-w-2xl">
          <div className="mb-1.5 flex items-center justify-between text-base text-teal-50">
            <span>Progres modul</span>
            <span className="font-semibold text-white">
              {progressModule.progress.progressPercent}%
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{
                width: `${progressModule.progress.progressPercent}%`,
              }}
            />
          </div>
        </div>
      </section>

      {/* Ringkasan singkat */}
      <section className="grid gap-4 sm:grid-cols-3">
        <MiniStat
          icon={CheckCircle2}
          label="Bagian Selesai"
          value={`${derived.completedUnits}`}
          subtitle={`dari ${derived.totalUnits} bagian`}
        />
        <MiniStat
          icon={PlayCircle}
          label="Sedang Berjalan"
          value={`${derived.inProgressUnits}`}
          subtitle="bagian"
        />
        <MiniStat
          icon={Clock3}
          label="Perkiraan Waktu"
          value={`${moduleMeta.estimatedMinutes ?? 0}`}
          subtitle="menit"
        />
      </section>

      {/* Daftar bagian */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-2">
          <BookOpen size={20} className="text-teal-600" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-900">Daftar Bagian</h2>
        </div>

        <div className="space-y-4">
          {units.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base text-slate-600">
              Belum ada bagian pada modul ini.
            </div>
          ) : (
            units.map((unit) => {
              const unitProgress = progressModule.units.find(
                (item) => item.slug === unit.slug,
              );

              return (
                <div
                  key={unit.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-500">
                        Bagian {unit.order}
                      </div>
                      <h3 className="mt-1 wrap-break-word text-lg font-bold text-slate-900">
                        {unit.title}
                      </h3>
                      {unit.description ? (
                        <p className="mt-2 wrap-break-word text-base leading-7 text-slate-600">
                          {unit.description}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-500">
                        <span className="rounded-full bg-slate-100 px-3 py-1">
                          {unit.estimatedMinutes ?? 0} menit
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">
                          {unit.isRequired ? "Wajib" : "Opsional"}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`rounded-full border px-3 py-1 text-sm font-semibold ${getStatusBadge(
                        unitProgress?.progress.status,
                      )}`}
                    >
                      {getReadableStatus(unitProgress?.progress.status)}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-sm text-slate-500">
                      <span>Progres bagian</span>
                      <span>
                        {unitProgress?.progress.progressPercent ?? 0}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-teal-600"
                        style={{
                          width: `${
                            unitProgress?.progress.progressPercent ?? 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-5">
                    <Link
                      href={`/student/courses/${courseSlug}/modules/${moduleSlug}/units/${unit.slug}`}
                      className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700"
                    >
                      Buka Bagian
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  subtitle,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
          <Icon size={24} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="text-2xl font-bold text-slate-900">{value}</div>
          <div className="text-base text-slate-600">{label}</div>
          <div className="text-sm text-slate-500">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}
