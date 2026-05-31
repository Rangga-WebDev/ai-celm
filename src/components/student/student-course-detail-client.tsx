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
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileText,
  GraduationCap,
  Layers3,
  Target,
  User2,
} from "lucide-react";
import ProgressBarAnimated from "@/components/student/progress-bar-animated";
import AnimatedCounter from "@/components/student/animated-counter";

type StudentCourseDetailClientProps = {
  user: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    email: string;
    role: string;
  };
  slug: string;
};

type CourseDetailResponse = {
  success: boolean;
  message: string;
  data: {
    id: string;
    title: string;
    slug: string;
    code: string | null;
    description: string | null;
    coverImage: string | null;
    isPublished: boolean;
    lecturer: {
      id: string;
      name: string;
      email: string;
    } | null;
    rps: {
      semesterLabel?: string | null;
      academicYear?: string | null;
      description?: string | null;
      learningStrategy?: string | null;
      assessmentPolicy?: string | null;
      referencesNote?: string | null;
      documentUrl?: string | null;
    } | null;
    cpls: Array<{
      id: string;
      code: string;
      statement: string;
      domain: string;
    }>;
    cpmks: Array<{
      id: string;
      code: string;
      statement: string;
      order: number;
      subCpmks: Array<{
        id: string;
        code: string;
        statement: string;
        order: number;
      }>;
    }>;
    resources: Array<{
      id: string;
      title: string;
      description: string | null;
      type: string;
      url: string;
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

export default function StudentCourseDetailClient({
  user,
  slug,
}: StudentCourseDetailClientProps) {
  void user;

  const [course, setCourse] = useState<CourseDetailResponse["data"] | null>(
    null,
  );
  const [progress, setProgress] = useState<
    CourseProgressResponse["data"] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourseDetail() {
      try {
        setLoading(true);
        setError(null);

        const [courseRes, progressRes] = await Promise.all([
          fetch(`/api/courses/${slug}`, { cache: "no-store" }),
          fetch(`/api/courses/${slug}/progress`, {
            cache: "no-store",
          }),
        ]);

        const courseJson = await courseRes.json();
        const progressJson = await progressRes.json();

        if (!courseRes.ok || !courseJson.success) {
          throw new Error(
            courseJson.message || "Gagal mengambil detail course",
          );
        }

        if (!progressRes.ok || !progressJson.success) {
          throw new Error(
            progressJson.message || "Gagal mengambil progress course",
          );
        }

        setCourse(courseJson.data);
        setProgress(progressJson.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchCourseDetail();
  }, [slug]);

  const derived = useMemo(() => {
    if (!course || !progress) return null;

    const totalUnits = progress.modules.reduce(
      (sum, module) => sum + module.units.length,
      0,
    );

    const completedUnits = progress.modules.reduce(
      (sum, module) =>
        sum +
        module.units.filter((unit) => unit.progress.status === "COMPLETED")
          .length,
      0,
    );

    const inProgressModules = progress.modules.filter(
      (module) => module.progress.status === "IN_PROGRESS",
    ).length;

    const nextModule =
      progress.modules.find(
        (module) => module.progress.status !== "COMPLETED",
      ) ?? null;

    return {
      totalUnits,
      completedUnits,
      inProgressModules,
      nextModule,
      totalResources: course.resources.length,
      totalCpls: course.cpls.length,
      totalCpmks: course.cpmks.length,
    };
  }, [course, progress]);

  if (loading) {
    return (
      <div className="grid min-w-0 gap-6 overflow-x-hidden">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <p className="text-slate-300">Memuat detail course...</p>
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

  if (!course || !progress || !derived) {
    return (
      <div className="grid min-w-0 gap-6 overflow-x-hidden">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <p className="text-slate-300">Data course belum tersedia.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-6 overflow-x-hidden">
      <section className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-6 xl:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            <ArrowLeft size={16} />
            Kembali ke Dashboard
          </Link>

          <div className="rounded-full bg-teal-400/10 px-4 py-2 text-sm text-teal-200">
            Course Detail
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="min-w-0">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
              <BookOpen size={16} className="shrink-0" />
              <span className="truncate">{course.code ?? "Tanpa kode"}</span>
            </div>

            <h1 className="mt-5 break-words text-3xl font-semibold leading-tight text-white sm:text-4xl">
              {course.title}
            </h1>

            <p className="mt-4 max-w-3xl break-words text-slate-300">
              {course.description ?? "Belum ada deskripsi course."}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <InfoRow
                icon={User2}
                label="Dosen Pengampu"
                value={course.lecturer?.name ?? "-"}
              />
              <InfoRow
                icon={GraduationCap}
                label="Semester"
                value={course.rps?.semesterLabel ?? "-"}
              />
              <InfoRow
                icon={ClipboardCheck}
                label="Tahun Akademik"
                value={course.rps?.academicYear ?? "-"}
              />
              <InfoRow
                icon={Clock3}
                label="Progress Course"
                value={`${progress.summary.overallProgress}%`}
              />
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
                <span>Progress keseluruhan</span>
                <span>{progress.summary.overallProgress}%</span>
              </div>
              <ProgressBarAnimated value={progress.summary.overallProgress} />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#modules"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
              >
                Lihat Modul
                <ArrowRight size={16} />
              </a>

              {derived.nextModule ? (
                <a
                  href={`#module-${derived.nextModule.id}`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Fokus Modul Berikutnya
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <MiniStatCard
              icon={Layers3}
              label="Total Modul"
              value={progress.summary.totalModules}
              subtitle={`${derived.inProgressModules} sedang berjalan`}
            />
            <MiniStatCard
              icon={CheckCircle2}
              label="Modul Selesai"
              value={progress.summary.completedModules}
              subtitle="Modul yang telah dituntaskan"
            />
            <MiniStatCard
              icon={Target}
              label="Unit Selesai"
              value={derived.completedUnits}
              subtitle={`${derived.totalUnits} total unit`}
            />
            <MiniStatCard
              icon={FileText}
              label="Resource"
              value={derived.totalResources}
              subtitle={`${derived.totalCpmks} CPMK • ${derived.totalCpls} CPL`}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-6">
          <SectionCard
            title="Daftar Modul"
            subtitle="Pantau progres per modul dan fokuskan pembelajaran berikutnya"
            id="modules"
          >
            <div className="grid gap-4">
              {progress.modules.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-400">
                  Belum ada modul pada course ini.
                </div>
              ) : (
                progress.modules.map((module) => {
                  const completedUnits = module.units.filter(
                    (unit) => unit.progress.status === "COMPLETED",
                  ).length;

                  const nextUnit =
                    module.units.find(
                      (unit) => unit.progress.status !== "COMPLETED",
                    ) ?? null;

                  return (
                    <div
                      key={module.id}
                      id={`module-${module.id}`}
                      className="rounded-[26px] border border-white/10 bg-slate-900/70 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs uppercase tracking-wide text-slate-400">
                            Modul {module.order}
                          </div>
                          <h3 className="mt-1 break-words text-lg font-semibold text-white">
                            {module.title}
                          </h3>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                            <span className="rounded-full bg-white/5 px-2.5 py-1">
                              {module.units.length} unit
                            </span>
                            <span className="rounded-full bg-white/5 px-2.5 py-1">
                              {module.estimatedMinutes ?? 0} menit
                            </span>
                            <span className="rounded-full bg-white/5 px-2.5 py-1">
                              Mastery {module.masteryThreshold}%
                            </span>
                          </div>
                        </div>

                        <div
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadge(
                            module.progress.status,
                          )}`}
                        >
                          {getReadableStatus(module.progress.status)}
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                          <span>Progress modul</span>
                          <span>{module.progress.progressPercent}%</span>
                        </div>
                        <ProgressBarAnimated
                          value={module.progress.progressPercent}
                        />
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <SmallInfo
                          label="Unit tuntas"
                          value={`${completedUnits}/${module.units.length}`}
                        />
                        <SmallInfo
                          label="Mastery score"
                          value={
                            module.progress.masteryScore !== null
                              ? `${module.progress.masteryScore}%`
                              : "—"
                          }
                        />
                        <SmallInfo
                          label="Status"
                          value={getReadableStatus(module.progress.status)}
                        />
                      </div>

                      {nextUnit ? (
                        <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4">
                          <div className="text-sm font-semibold text-white">
                            Fokus saat ini
                          </div>
                          <p className="mt-2 text-sm leading-7 text-slate-300">
                            Lanjutkan unit{" "}
                            <span className="font-medium text-white">
                              {nextUnit.title}
                            </span>{" "}
                            untuk mendorong penyelesaian modul ini.
                          </p>
                        </div>
                      ) : null}

                      <div className="mt-5">
                        <details className="group rounded-2xl border border-white/10 bg-white/5 p-4">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                            <span className="text-sm font-medium text-white">
                              Lihat unit dalam modul
                            </span>
                            <ChevronRight
                              className="transition group-open:rotate-90"
                              size={16}
                            />
                          </summary>

                          <div className="mt-4 grid gap-3">
                            {module.units.map((unit) => (
                              <div
                                key={unit.id}
                                className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-xs uppercase tracking-wide text-slate-400">
                                      Unit {unit.order}
                                    </div>
                                    <div className="mt-1 break-words text-sm font-semibold text-white">
                                      {unit.title}
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                                      <span className="rounded-full bg-white/5 px-2 py-1">
                                        {unit.unitType}
                                      </span>
                                      <span className="rounded-full bg-white/5 px-2 py-1">
                                        {unit.estimatedMinutes ?? 0} menit
                                      </span>
                                    </div>
                                  </div>

                                  <div
                                    className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadge(
                                      unit.progress.status,
                                    )}`}
                                  >
                                    {getReadableStatus(unit.progress.status)}
                                  </div>
                                </div>

                                <div className="mt-3">
                                  <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                                    <span>Progress unit</span>
                                    <span>
                                      {unit.progress.progressPercent}%
                                    </span>
                                  </div>
                                  <ProgressBarAnimated
                                    value={unit.progress.progressPercent}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6">
          <SectionCard
            title="CPL & CPMK"
            subtitle="Ringkasan outcome pembelajaran pada course ini"
          >
            <div className="grid gap-4">
              <div>
                <div className="mb-3 text-sm font-semibold text-white">CPL</div>
                <div className="flex flex-wrap gap-2">
                  {course.cpls.length > 0 ? (
                    course.cpls.map((cpl) => (
                      <span
                        key={cpl.id}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300"
                      >
                        {cpl.code}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">
                      Belum ada CPL.
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-3 text-sm font-semibold text-white">
                  CPMK
                </div>
                <div className="grid gap-3">
                  {course.cpmks.length > 0 ? (
                    course.cpmks.map((cpmk) => (
                      <div
                        key={cpmk.id}
                        className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"
                      >
                        <div className="text-xs uppercase tracking-wide text-slate-400">
                          {cpmk.code}
                        </div>
                        <div className="mt-1 text-sm leading-7 text-slate-300">
                          {cpmk.statement}
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">
                      Belum ada CPMK.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Resource Course"
            subtitle="Dokumen dan bahan pendukung pembelajaran"
          >
            <div className="grid gap-3">
              {course.resources.length > 0 ? (
                course.resources.map((resource) => (
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
                  Belum ada resource pada course ini.
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Informasi RPS"
            subtitle="Ringkasan strategi dan kebijakan pembelajaran"
          >
            <div className="grid gap-3">
              <RpsItem
                label="Deskripsi"
                value={course.rps?.description ?? "Belum tersedia"}
              />
              <RpsItem
                label="Strategi Pembelajaran"
                value={course.rps?.learningStrategy ?? "Belum tersedia"}
              />
              <RpsItem
                label="Kebijakan Penilaian"
                value={course.rps?.assessmentPolicy ?? "Belum tersedia"}
              />
              <RpsItem
                label="Catatan Referensi"
                value={course.rps?.referencesNote ?? "Belum tersedia"}
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
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-slate-400">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-white">
            <AnimatedCounter value={value} />
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

function RpsItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-sm leading-7 text-slate-300">{value}</div>
    </div>
  );
}
