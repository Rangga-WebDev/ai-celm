/** @format */

"use client";

/** @format */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Layers3,
  PlayCircle,
  RefreshCw,
  Target,
} from "lucide-react";
import ProgressBarAnimated from "@/components/student/progress-bar-animated";

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
      return "Remedial";
    case "LOCKED":
      return "Terkunci";
    default:
      return "Belum mulai";
  }
}

function getStatusBadge(status?: string) {
  switch (status) {
    case "COMPLETED":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
    case "IN_PROGRESS":
      return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
    case "REMEDIAL":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";
    case "LOCKED":
      return "border-slate-400/20 bg-slate-400/10 text-slate-300";
    default:
      return "border-white/10 bg-white/5 text-slate-300";
  }
}

export default function StudentUnitDetailClient({
  user,
  courseSlug,
  moduleSlug,
  unitSlug,
}: StudentUnitDetailClientProps) {
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
        throw new Error(unitsJson.message || "Gagal mengambil data unit");
      }

      if (!progressRes.ok || !progressJson.success) {
        throw new Error(progressJson.message || "Gagal mengambil progress");
      }

      const selectedUnit = unitsJson.data.units.find(
        (item) => item.slug === unitSlug,
      );

      if (!selectedUnit) {
        throw new Error("Unit tidak ditemukan");
      }

      const selectedModuleProgress = progressJson.data.modules.find(
        (item) => item.slug === moduleSlug,
      );

      if (!selectedModuleProgress) {
        throw new Error("Progress modul tidak ditemukan");
      }

      setCourseTitle(modulesJson.data.courseTitle);
      setModuleMeta(selectedModule);
      setAllUnits(unitsJson.data.units);
      setCurrentUnit(selectedUnit);
      setModuleProgress(selectedModuleProgress);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
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
        throw new Error(json.message || "Gagal memperbarui progress unit");
      }

      await fetchUnitDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
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
      <div className="grid min-w-0 gap-6 overflow-x-hidden">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <p className="text-slate-300">Memuat detail unit...</p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid min-w-0 gap-6 overflow-x-hidden">
        <section className="rounded-[28px] border border-red-400/20 bg-red-500/5 p-6">
          <p className="text-red-300">Error: {error}</p>
        </section>
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
      <div className="grid min-w-0 gap-6 overflow-x-hidden">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <p className="text-slate-300">Data unit belum tersedia.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-6 overflow-x-hidden">
      <section className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-6 xl:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/student/courses/${courseSlug}/modules/${moduleSlug}`}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            <ArrowLeft size={16} />
            Kembali ke Modul
          </Link>

          <div className="rounded-full bg-teal-400/10 px-4 py-2 text-sm text-teal-200">
            Detail Unit
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="min-w-0">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
              <BookOpen size={16} className="shrink-0" />
              <span className="truncate">{courseTitle}</span>
            </div>

            <h1 className="mt-5 break-words text-3xl font-semibold leading-tight text-white sm:text-4xl">
              {currentUnit.title}
            </h1>

            <p className="mt-4 max-w-3xl break-words text-slate-300">
              {currentUnit.description ?? "Belum ada deskripsi unit."}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <InfoRow icon={Layers3} label="Modul" value={moduleMeta.title} />
              <InfoRow
                icon={Clock3}
                label="Estimasi Waktu"
                value={`${currentUnit.estimatedMinutes ?? 0} menit`}
              />
              <InfoRow
                icon={Target}
                label="Tipe Unit"
                value={currentUnit.unitType}
              />
              <InfoRow
                icon={CheckCircle2}
                label="Status Unit"
                value={getReadableStatus(currentUnitProgress.status)}
              />
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
                <span>Progress unit</span>
                <span>{currentUnitProgress.progressPercent}%</span>
              </div>
              <ProgressBarAnimated
                value={currentUnitProgress.progressPercent}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleStartUnit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <PlayCircle size={16} />
                    Mulai / Lanjutkan Unit
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCompleteUnit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 size={16} />
                Tandai Selesai
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <MiniStatCard
              icon={CheckCircle2}
              label="Progress"
              value={currentUnitProgress.progressPercent}
              subtitle="Akumulasi unit"
              suffix="%"
            />
            <MiniStatCard
              icon={Target}
              label="Score"
              value={currentUnitProgress.score ?? 0}
              subtitle={
                currentUnitProgress.score !== null
                  ? "Nilai unit saat ini"
                  : "Belum ada nilai"
              }
              suffix={currentUnitProgress.score !== null ? "%" : ""}
            />
            <MiniStatCard
              icon={FileText}
              label="Attempt"
              value={currentUnitProgress.attempts}
              subtitle="Jumlah percobaan"
            />
            <MiniStatCard
              icon={BookOpen}
              label="Unit Tuntas"
              value={derived.completedUnits}
              subtitle={`${derived.totalUnits} total unit di modul`}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="Konten Unit"
          subtitle="Materi microlearning yang sedang dipelajari"
        >
          <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
            {currentUnit.content ? (
              <div className="whitespace-pre-line break-words text-sm leading-8 text-slate-300">
                {currentUnit.content}
              </div>
            ) : (
              <div className="text-sm text-slate-400">
                Belum ada konten unit.
              </div>
            )}
          </div>
        </SectionCard>

        <div className="grid gap-6">
          <SectionCard
            title="Ringkasan Unit"
            subtitle="Status, navigasi, dan fokus belajar"
          >
            <div className="grid gap-4">
              <StatusRow
                label="Status"
                value={getReadableStatus(currentUnitProgress.status)}
                badgeClass={getStatusBadge(currentUnitProgress.status)}
              />
              <StatusRow
                label="Required"
                value={currentUnit.isRequired ? "Wajib" : "Opsional"}
              />
              <StatusRow
                label="Remedial"
                value={currentUnitProgress.remedialRequired ? "Perlu" : "Tidak"}
              />
              <StatusRow
                label="Threshold"
                value={
                  currentUnit.masteryThreshold !== null
                    ? `${currentUnit.masteryThreshold}%`
                    : `${moduleMeta.masteryThreshold}%`
                }
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Navigasi Unit"
            subtitle="Berpindah antar unit dalam modul"
          >
            <div className="grid gap-3">
              {derived.previousUnit ? (
                <Link
                  href={`/student/courses/${courseSlug}/modules/${moduleSlug}/units/${derived.previousUnit.slug}`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10"
                >
                  <ArrowLeft size={16} />
                  Unit Sebelumnya
                </Link>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
                  Tidak ada unit sebelumnya.
                </div>
              )}

              {derived.nextUnit ? (
                <Link
                  href={`/student/courses/${courseSlug}/modules/${moduleSlug}/units/${derived.nextUnit.slug}`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10"
                >
                  Unit Berikutnya
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
                  Tidak ada unit berikutnya.
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="Resource Unit"
          subtitle="Dokumen dan bahan pendukung untuk unit ini"
        >
          <div className="grid gap-3">
            {currentUnit.resources.length > 0 ? (
              currentUnit.resources.map((resource) => (
                <a
                  key={resource.id}
                  href={resource.url}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 transition hover:border-white/15 hover:bg-white/[0.06]"
                >
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-cyan-300">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="break-words text-sm font-semibold text-white">
                      {resource.title}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                      {resource.type}
                    </div>
                    {resource.description ? (
                      <div className="mt-2 text-sm leading-6 text-slate-300">
                        {resource.description}
                      </div>
                    ) : null}
                  </div>
                </a>
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-400">
                Belum ada resource pada unit ini.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Sub-CPMK Terkait"
          subtitle="Outcome pembelajaran yang didukung unit ini"
        >
          <div className="grid gap-3">
            {currentUnit.subCpmks.length > 0 ? (
              currentUnit.subCpmks.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"
                >
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    {sub.code}
                  </div>
                  <div className="mt-2 text-sm leading-7 text-slate-300">
                    {sub.statement}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-400">
                Belum ada Sub-CPMK terkait pada unit ini.
              </div>
            )}
          </div>
        </SectionCard>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-white">
            Daftar Unit Modul
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Navigasi cepat ke seluruh unit dalam modul ini
          </p>
        </div>

        <div className="grid gap-3">
          {allUnits.map((unit) => {
            const unitProgress =
              moduleProgress.units.find((item) => item.slug === unit.slug)
                ?.progress ?? null;

            const isCurrent = unit.slug === unitSlug;

            return (
              <Link
                key={unit.id}
                href={`/student/courses/${courseSlug}/modules/${moduleSlug}/units/${unit.slug}`}
                className={`rounded-2xl border p-4 transition ${
                  isCurrent
                    ? "border-cyan-400/20 bg-cyan-400/5"
                    : "border-white/10 bg-slate-900/70 hover:border-white/15 hover:bg-white/[0.06]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Unit {unit.order}
                    </div>
                    <div className="mt-1 break-words text-sm font-semibold text-white">
                      {unit.title}
                    </div>
                  </div>

                  <div
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadge(
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

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-cyan-300">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            {label}
          </div>
          <div className="mt-1 break-words text-sm font-medium text-white">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  suffix = "",
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  subtitle: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-slate-400">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {value}
            {suffix}
          </div>
          <div className="mt-2 text-sm text-slate-300">{subtitle}</div>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-teal-300">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  badgeClass,
}: {
  label: string;
  value: string;
  badgeClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <div className="text-sm text-slate-400">{label}</div>
      <div
        className={`rounded-full border px-3 py-1 text-xs font-medium ${
          badgeClass ?? "border-white/10 bg-white/5 text-slate-300"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
