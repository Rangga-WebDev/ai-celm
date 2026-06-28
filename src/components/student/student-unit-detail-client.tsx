/** @format */

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileText,
  Layers3,
  PlayCircle,
  RefreshCw,
} from "lucide-react";
import Markdown from "@/components/ui/markdown";
import LearningResourceView from "@/components/student/learning-resource-view";

type StudentUnitDetailClientProps = {
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
  unitSlug: string;
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
        url: string | null;
        content: string | null;
        aiGenerated: boolean | null;
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

type PatchProgressPayload = {
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "LOCKED" | "REMEDIAL";
  progressPercent: number;
  score?: number | null;
  attempts?: number;
};

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

function getStatusBadge(status?: string) {
  switch (status) {
    case "COMPLETED":
      return "border-emerald-200 bg-emerald-100 text-emerald-700";
    case "IN_PROGRESS":
      return "border-amber-200 bg-amber-100 text-amber-700";
    case "REMEDIAL":
      return "border-orange-200 bg-orange-100 text-orange-700";
    case "LOCKED":
      return "border-slate-200 bg-slate-100 text-slate-600";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

export default function StudentUnitDetailClient({
  user,
  courseSlug,
  moduleSlug,
  unitSlug,
}: StudentUnitDetailClientProps) {
  void user;

  const [courseTitle, setCourseTitle] = useState("");
  const [moduleMeta, setModuleMeta] = useState<
    CourseModulesResponse["data"]["modules"][number] | null
  >(null);
  const [allUnits, setAllUnits] = useState<
    ModuleUnitsResponse["data"]["units"]
  >([]);
  const [currentUnit, setCurrentUnit] = useState<
    ModuleUnitsResponse["data"]["units"][number] | null
  >(null);
  const [moduleProgress, setModuleProgress] = useState<
    CourseProgressResponse["data"]["modules"][number] | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUnitDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const modulesRes = await fetch(`/api/courses/${courseSlug}/modules`, {
        cache: "no-store",
      });

      const modulesJson = (await modulesRes.json()) as CourseModulesResponse;

      if (!modulesRes.ok || !modulesJson.success) {
        throw new Error(modulesJson.message || "Gagal mengambil daftar modul");
      }

      const selectedModule = modulesJson.data.modules.find(
        (item) => item.slug === moduleSlug,
      );

      if (!selectedModule) {
        throw new Error("Modul tidak ditemukan");
      }

      const [unitsRes, progressRes] = await Promise.all([
        fetch(`/api/modules/${selectedModule.id}/units`, {
          cache: "no-store",
        }),
        fetch(`/api/courses/${courseSlug}/progress`, {
          cache: "no-store",
        }),
      ]);

      const unitsJson = (await unitsRes.json()) as ModuleUnitsResponse;
      const progressJson = (await progressRes.json()) as CourseProgressResponse;

      if (!unitsRes.ok || !unitsJson.success) {
        throw new Error(unitsJson.message || "Gagal mengambil data bagian");
      }

      if (!progressRes.ok || !progressJson.success) {
        throw new Error(progressJson.message || "Gagal mengambil progres");
      }

      const selectedUnit = unitsJson.data.units.find(
        (item) => item.slug === unitSlug,
      );

      if (!selectedUnit) {
        throw new Error("Bagian tidak ditemukan");
      }

      const selectedModuleProgress = progressJson.data.modules.find(
        (item) => item.slug === moduleSlug,
      );

      if (!selectedModuleProgress) {
        throw new Error("Progres modul tidak ditemukan");
      }

      setCourseTitle(modulesJson.data.courseTitle);
      setModuleMeta(selectedModule);
      setAllUnits(unitsJson.data.units);
      setCurrentUnit(selectedUnit);
      setModuleProgress(selectedModuleProgress);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, [courseSlug, moduleSlug, unitSlug]);

  useEffect(() => {
    fetchUnitDetail();
  }, [fetchUnitDetail]);

  const currentUnitProgress = useMemo(() => {
    if (!moduleProgress || !currentUnit) return null;
    return (
      moduleProgress.units.find((item) => item.slug === currentUnit.slug)
        ?.progress ?? null
    );
  }, [moduleProgress, currentUnit]);

  const derived = useMemo(() => {
    if (!moduleProgress || !currentUnit) return null;

    const currentIndex = moduleProgress.units.findIndex(
      (u) => u.slug === currentUnit.slug,
    );

    const nextUnit =
      currentIndex >= 0
        ? (moduleProgress.units[currentIndex + 1] ?? null)
        : null;

    const previousUnit =
      currentIndex > 0
        ? (moduleProgress.units[currentIndex - 1] ?? null)
        : null;

    const completedUnits = moduleProgress.units.filter(
      (u) => u.progress.status === "COMPLETED",
    ).length;

    return {
      nextUnit,
      previousUnit,
      completedUnits,
      totalUnits: moduleProgress.units.length,
    };
  }, [moduleProgress, currentUnit]);

  async function patchProgress(payload: PatchProgressPayload) {
    if (!currentUnit) return;

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`/api/units/${currentUnit.id}/progress`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memperbarui progres bagian");
      }

      await fetchUnitDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStartUnit() {
    if (!currentUnitProgress) return;

    const nextAttempts = (currentUnitProgress.attempts ?? 0) + 1;

    await patchProgress({
      status: "IN_PROGRESS",
      progressPercent:
        currentUnitProgress.progressPercent > 0
          ? currentUnitProgress.progressPercent
          : 10,
      attempts: nextAttempts,
      score: currentUnitProgress.score ?? undefined,
    });
  }

  async function handleCompleteUnit() {
    const nextAttempts = ((currentUnitProgress?.attempts ?? 0) || 0) + 1;

    await patchProgress({
      status: "COMPLETED",
      progressPercent: 100,
      attempts: nextAttempts,
      score: currentUnitProgress?.score ?? 100,
    });
  }

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
          href={`/student/courses/${courseSlug}/modules/${moduleSlug}`}
          className="mt-4 inline-flex rounded-2xl bg-rose-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-rose-700"
        >
          Kembali ke Modul
        </Link>
      </div>
    );
  }

  if (
    !moduleMeta ||
    !currentUnit ||
    !moduleProgress ||
    !currentUnitProgress ||
    !derived
  ) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
        Data bagian belum tersedia.
      </div>
    );
  }

  const status = currentUnitProgress.status;
  const isCompleted = status === "COMPLETED";

  return (
    <div className="space-y-6">
      {/* Kepala */}
      <section className="rounded-3xl bg-teal-600 px-6 py-7 text-white sm:px-8">
        <Link
          href={`/student/courses/${courseSlug}/modules/${moduleSlug}`}
          className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-base font-medium transition hover:bg-white/25"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Kembali ke Modul
        </Link>

        <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-base">
          <Layers3 size={18} className="shrink-0" aria-hidden="true" />
          <span className="truncate">
            {courseTitle} · {moduleMeta.title}
          </span>
        </div>

        <h1 className="mt-4 wrap-break-word text-2xl font-bold sm:text-3xl">
          {currentUnit.title}
        </h1>
        <p className="mt-2 max-w-3xl wrap-break-word text-lg leading-relaxed text-teal-50">
          {currentUnit.description ?? "Belum ada deskripsi bagian."}
        </p>

        <div className="mt-5 max-w-2xl">
          <div className="mb-1.5 flex items-center justify-between text-base text-teal-50">
            <span>Progres bagian</span>
            <span className="font-semibold text-white">
              {currentUnitProgress.progressPercent}%
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${currentUnitProgress.progressPercent}%` }}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleStartUnit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-base font-semibold text-teal-700 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <PlayCircle size={18} aria-hidden="true" />
                Mulai / Lanjutkan
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCompleteUnit}
            disabled={submitting || isCompleted}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/40 px-5 py-3 text-base font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 size={18} aria-hidden="true" />
            {isCompleted ? "Sudah Selesai" : "Tandai Selesai"}
          </button>
        </div>
      </section>

      {/* Konten */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <FileText size={20} className="text-teal-600" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-900">Materi</h2>
        </div>
        {currentUnit.content ? (
          <Markdown className="text-base leading-8">
            {currentUnit.content}
          </Markdown>
        ) : (
          <div className="text-base text-slate-600">
            Belum ada materi pada bagian ini.
          </div>
        )}
      </section>

      {/* Bahan tambahan */}
      {currentUnit.resources.length > 0 ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen size={20} className="text-teal-600" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-900">Bahan Tambahan</h2>
          </div>
          <div className="space-y-3">
            {currentUnit.resources.map((resource) => (
              <LearningResourceView key={resource.id} resource={resource} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Navigasi */}
      <section className="grid gap-4 sm:grid-cols-2">
        {derived.previousUnit ? (
          <Link
            href={`/student/courses/${courseSlug}/modules/${moduleSlug}/units/${derived.previousUnit.slug}`}
            className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-5 py-4 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Bagian Sebelumnya
          </Link>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-base text-slate-500">
            Tidak ada bagian sebelumnya.
          </div>
        )}

        {derived.nextUnit ? (
          <Link
            href={`/student/courses/${courseSlug}/modules/${moduleSlug}/units/${derived.nextUnit.slug}`}
            className="inline-flex items-center justify-end gap-2 rounded-3xl border border-slate-200 bg-white px-5 py-4 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Bagian Berikutnya
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-right text-base text-slate-500">
            Tidak ada bagian berikutnya.
          </div>
        )}
      </section>

      {/* Daftar bagian modul */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          Daftar Bagian Modul
        </h2>

        <div className="space-y-3">
          {allUnits.map((unit) => {
            const unitProgress =
              moduleProgress.units.find((item) => item.slug === unit.slug)
                ?.progress ?? null;

            const isCurrent = unit.slug === unitSlug;

            return (
              <Link
                key={unit.id}
                href={`/student/courses/${courseSlug}/modules/${moduleSlug}/units/${unit.slug}`}
                className={`block rounded-2xl border p-4 transition ${
                  isCurrent
                    ? "border-teal-300 bg-teal-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-500">
                      Bagian {unit.order}
                    </div>
                    <div className="mt-1 wrap-break-word text-base font-semibold text-slate-900">
                      {unit.title}
                    </div>
                  </div>

                  <div
                    className={`rounded-full border px-3 py-1 text-sm font-semibold ${getStatusBadge(
                      unitProgress?.status,
                    )}`}
                  >
                    {getReadableStatus(unitProgress?.status)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
