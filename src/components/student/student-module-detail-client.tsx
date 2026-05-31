/** @format */

"use client";

/** @format */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Layers3,
  PlayCircle,
  Target,
} from "lucide-react";
import ProgressBarAnimated from "@/components/student/progress-bar-animated";
import AnimatedCounter from "@/components/student/animated-counter";

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
      return "bg-emerald-400/10 text-emerald-300 border-emerald-400/20";
    case "IN_PROGRESS":
      return "bg-cyan-400/10 text-cyan-300 border-cyan-400/20";
    case "REMEDIAL":
      return "bg-amber-400/10 text-amber-300 border-amber-400/20";
    case "LOCKED":
      return "bg-slate-400/10 text-slate-300 border-slate-400/20";
    default:
      return "bg-white/5 text-slate-300 border-white/10";
  }
}

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
          throw new Error(unitsJson.message || "Gagal mengambil unit modul");
        }

        if (!progressRes.ok || !progressJson.success) {
          throw new Error(
            progressJson.message || "Gagal mengambil progress modul",
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
        setError(err instanceof Error ? err.message : "Unknown error");
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
      <div className="grid min-w-0 gap-6 overflow-x-hidden">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <p className="text-slate-300">Memuat detail modul...</p>
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

  if (!moduleMeta || !progressModule || !derived) {
    return (
      <div className="grid min-w-0 gap-6 overflow-x-hidden">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <p className="text-slate-300">Data modul belum tersedia.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-6 overflow-x-hidden">
      <section className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-6 xl:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/student/courses/${courseSlug}`}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            <ArrowLeft size={16} />
            Kembali ke Course
          </Link>

          <div className="rounded-full bg-teal-400/10 px-4 py-2 text-sm text-teal-200">
            Detail Modul
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="min-w-0">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
              <Layers3 size={16} className="shrink-0" />
              <span className="truncate">{courseTitle}</span>
            </div>

            <h1 className="mt-5 break-words text-3xl font-semibold leading-tight text-white sm:text-4xl">
              {moduleMeta.title}
            </h1>

            <p className="mt-4 max-w-3xl break-words text-slate-300">
              {moduleMeta.description ?? "Belum ada deskripsi modul."}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <InfoRow
                icon={ClipboardCheck}
                label="Status Modul"
                value={getReadableStatus(progressModule.progress.status)}
              />
              <InfoRow
                icon={Clock3}
                label="Estimasi Waktu"
                value={`${moduleMeta.estimatedMinutes ?? 0} menit`}
              />
              <InfoRow
                icon={Target}
                label="Mastery Threshold"
                value={`${moduleMeta.masteryThreshold}%`}
              />
              <InfoRow
                icon={BookOpen}
                label="Total Unit"
                value={`${derived.totalUnits} unit`}
              />
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
                <span>Progress modul</span>
                <span>{progressModule.progress.progressPercent}%</span>
              </div>
              <ProgressBarAnimated
                value={progressModule.progress.progressPercent}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {derived.nextUnit ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                >
                  Lanjutkan Unit Berikutnya
                  <ArrowRight size={16} />
                </button>
              ) : null}

              <a
                href="#units"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Lihat Semua Unit
              </a>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <MiniStatCard
              icon={CheckCircle2}
              label="Unit Selesai"
              value={derived.completedUnits}
              subtitle={`${derived.totalUnits} total unit`}
            />
            <MiniStatCard
              icon={PlayCircle}
              label="Unit Berjalan"
              value={derived.inProgressUnits}
              subtitle="Sedang dikerjakan"
            />
            <MiniStatCard
              icon={ClipboardCheck}
              label="Progress"
              value={progressModule.progress.progressPercent}
              subtitle="Akumulasi modul"
              suffix="%"
            />
            <MiniStatCard
              icon={Target}
              label="Mastery Score"
              value={progressModule.progress.masteryScore ?? 0}
              subtitle="Nilai rerata modul"
              suffix={progressModule.progress.masteryScore !== null ? "%" : ""}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="Daftar Unit"
          subtitle="Ikuti unit secara berurutan untuk menuntaskan modul"
          id="units"
        >
          <div className="grid gap-4">
            {units.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-400">
                Belum ada unit pada modul ini.
              </div>
            ) : (
              units.map((unit) => {
                const unitProgress = progressModule.units.find(
                  (item) => item.slug === unit.slug,
                );

                return (
                  <div
                    key={unit.id}
                    className="rounded-[26px] border border-white/10 bg-slate-900/70 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs uppercase tracking-wide text-slate-400">
                          Unit {unit.order}
                        </div>
                        <h3 className="mt-1 break-words text-lg font-semibold text-white">
                          {unit.title}
                        </h3>
                        {unit.description ? (
                          <p className="mt-2 break-words text-sm leading-7 text-slate-300">
                            {unit.description}
                          </p>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                          <span className="rounded-full bg-white/5 px-2.5 py-1">
                            {unit.unitType}
                          </span>
                          <span className="rounded-full bg-white/5 px-2.5 py-1">
                            {unit.estimatedMinutes ?? 0} menit
                          </span>
                          <span className="rounded-full bg-white/5 px-2.5 py-1">
                            {unit.isRequired ? "Wajib" : "Opsional"}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadge(
                          unitProgress?.progress.status,
                        )}`}
                      >
                        {getReadableStatus(unitProgress?.progress.status)}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                        <span>Progress unit</span>
                        <span>
                          {unitProgress?.progress.progressPercent ?? 0}%
                        </span>
                      </div>
                      <ProgressBarAnimated
                        value={unitProgress?.progress.progressPercent ?? 0}
                      />
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <SmallInfo
                        label="Score"
                        value={
                          unitProgress?.progress.score !== null &&
                          unitProgress?.progress.score !== undefined
                            ? `${unitProgress.progress.score}%`
                            : "—"
                        }
                      />
                      <SmallInfo
                        label="Attempt"
                        value={`${unitProgress?.progress.attempts ?? 0}`}
                      />
                      <SmallInfo
                        label="Status"
                        value={getReadableStatus(unitProgress?.progress.status)}
                      />
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href={`/student/courses/${courseSlug}/modules/${moduleSlug}/units/${unit.slug}`}
                        className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                      >
                        Buka Unit
                        <ArrowRight size={14} />
                      </Link>

                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white transition hover:bg-white/10"
                      >
                        Simulasi Update Progress
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>

        <div className="grid gap-6">
          <SectionCard
            title="Ringkasan Modul"
            subtitle="Informasi progres dan fokus belajar berikutnya"
          >
            <div className="grid gap-4">
              <FocusCard
                title="Fokus Saat Ini"
                value={derived.nextUnit?.title ?? "Semua unit telah selesai"}
              />
              <FocusCard
                title="Status Modul"
                value={getReadableStatus(progressModule.progress.status)}
              />
              <FocusCard
                title="Mastery"
                value={
                  progressModule.progress.masteryScore !== null
                    ? `${progressModule.progress.masteryScore}%`
                    : "Belum ada skor"
                }
              />
              <FocusCard
                title="Remedial"
                value={
                  progressModule.progress.remedialRequired
                    ? "Diperlukan"
                    : "Tidak"
                }
              />
            </div>
          </SectionCard>
        </div>
      </section>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  id,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl sm:p-6"
    >
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
            <AnimatedCounter value={value} suffix={suffix} />
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

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-center">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function FocusCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">
        {title}
      </div>
      <div className="mt-2 break-words text-sm leading-7 text-slate-300">
        {value}
      </div>
    </div>
  );
}
