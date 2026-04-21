/** @format */

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { EnrollmentStatus, ProgressStatus } from "@/generated/prisma/client";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Layers3,
  User2,
} from "lucide-react";

function getReadableStatus(status?: ProgressStatus | string) {
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

function getStatusBadge(status?: ProgressStatus | string) {
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

export default async function StudentModulesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "STUDENT") {
    redirect("/login");
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: user.id,
      status: EnrollmentStatus.ACTIVE,
    },
    orderBy: {
      enrolledAt: "desc",
    },
    include: {
      course: {
        include: {
          lecturer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          modules: {
            orderBy: {
              order: "asc",
            },
            include: {
              progresses: {
                where: {
                  userId: user.id,
                },
                take: 1,
              },
              units: {
                orderBy: {
                  order: "asc",
                },
                include: {
                  progresses: {
                    where: {
                      userId: user.id,
                    },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const courseBlocks = enrollments.map((enrollment) => {
    const course = enrollment.course;

    const modules = course.modules.map((module) => {
      const moduleProgress = module.progresses[0] ?? null;
      const completedUnits = module.units.filter(
        (unit) => unit.progresses[0]?.status === ProgressStatus.COMPLETED,
      ).length;

      const inProgressUnits = module.units.filter(
        (unit) => unit.progresses[0]?.status === ProgressStatus.IN_PROGRESS,
      ).length;

      const nextUnit =
        module.units.find(
          (unit) => unit.progresses[0]?.status !== ProgressStatus.COMPLETED,
        ) ?? null;

      return {
        id: module.id,
        title: module.title,
        slug: module.slug,
        description: module.description,
        order: module.order,
        estimatedMinutes: module.estimatedMinutes,
        masteryThreshold: module.masteryThreshold,
        totalUnits: module.units.length,
        completedUnits,
        inProgressUnits,
        nextUnitTitle: nextUnit?.title ?? null,
        status: moduleProgress?.status ?? ProgressStatus.NOT_STARTED,
        progressPercent: moduleProgress?.progressPercent ?? 0,
        masteryScore: moduleProgress?.masteryScore ?? null,
        remedialRequired: moduleProgress?.remedialRequired ?? false,
      };
    });

    const totalModules = modules.length;
    const completedModules = modules.filter(
      (module) => module.status === ProgressStatus.COMPLETED,
    ).length;
    const inProgressModules = modules.filter(
      (module) => module.status === ProgressStatus.IN_PROGRESS,
    ).length;
    const overallProgress =
      totalModules > 0
        ? Math.round((completedModules / totalModules) * 100)
        : 0;

    return {
      enrollmentId: enrollment.id,
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        code: course.code,
        description: course.description,
        lecturer: course.lecturer
          ? `${course.lecturer.firstName} ${course.lecturer.lastName}`
          : "-",
      },
      summary: {
        totalModules,
        completedModules,
        inProgressModules,
        overallProgress,
      },
      modules,
    };
  });

  const grandTotalModules = courseBlocks.reduce(
    (sum, block) => sum + block.summary.totalModules,
    0,
  );
  const grandCompletedModules = courseBlocks.reduce(
    (sum, block) => sum + block.summary.completedModules,
    0,
  );
  const grandInProgressModules = courseBlocks.reduce(
    (sum, block) => sum + block.summary.inProgressModules,
    0,
  );

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
            Semua Modul Saya
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="min-w-0">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
              <Layers3 size={16} className="shrink-0" />
              <span className="truncate">Ringkasan Modul Mahasiswa</span>
            </div>

            <h1 className="mt-5 break-words text-3xl font-semibold leading-tight text-white sm:text-4xl">
              Modul dari Course Aktif
            </h1>

            <p className="mt-4 max-w-3xl break-words text-slate-300">
              Halaman ini menampilkan seluruh modul dari course yang sedang kamu
              ikuti, lengkap dengan progres belajar dan akses cepat ke detail
              modul.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <MiniStatCard
              icon={BookOpen}
              label="Course Aktif"
              value={courseBlocks.length}
              subtitle="Course yang sedang berjalan"
            />
            <MiniStatCard
              icon={Layers3}
              label="Total Modul"
              value={grandTotalModules}
              subtitle="Seluruh modul dari course aktif"
            />
            <MiniStatCard
              icon={CheckCircle2}
              label="Modul Selesai"
              value={grandCompletedModules}
              subtitle="Modul yang telah dituntaskan"
            />
            <MiniStatCard
              icon={Clock3}
              label="Modul Berjalan"
              value={grandInProgressModules}
              subtitle="Modul yang sedang dipelajari"
            />
          </div>
        </div>
      </section>

      {courseBlocks.length === 0 ? (
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <p className="text-slate-300">
            Belum ada course aktif, jadi belum ada modul yang bisa ditampilkan.
          </p>
        </section>
      ) : (
        <div className="grid gap-6">
          {courseBlocks.map((block) => (
            <section
              key={block.enrollmentId}
              className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
                    <BookOpen size={14} />
                    {block.course.code ?? "Tanpa kode"}
                  </div>

                  <h2 className="mt-3 break-words text-2xl font-semibold text-white">
                    {block.course.title}
                  </h2>

                  <p className="mt-2 max-w-3xl break-words text-sm leading-7 text-slate-300">
                    {block.course.description ?? "Belum ada deskripsi course."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                    <span className="rounded-full bg-white/5 px-3 py-1.5">
                      Dosen: {block.course.lecturer}
                    </span>
                    <span className="rounded-full bg-white/5 px-3 py-1.5">
                      {block.summary.totalModules} modul
                    </span>
                    <span className="rounded-full bg-white/5 px-3 py-1.5">
                      {block.summary.completedModules} selesai
                    </span>
                  </div>
                </div>

                <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                    <span>Progress course</span>
                    <span>{block.summary.overallProgress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400 transition-all"
                      style={{ width: `${block.summary.overallProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                {block.modules.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-400">
                    Belum ada modul pada course ini.
                  </div>
                ) : (
                  block.modules.map((module) => (
                    <div
                      key={module.id}
                      className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs uppercase tracking-wide text-slate-400">
                            Modul {module.order}
                          </div>

                          <h3 className="mt-1 break-words text-lg font-semibold text-white">
                            {module.title}
                          </h3>

                          {module.description ? (
                            <p className="mt-2 max-w-3xl break-words text-sm leading-7 text-slate-300">
                              {module.description}
                            </p>
                          ) : null}

                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                            <span className="rounded-full bg-white/5 px-2.5 py-1">
                              {module.totalUnits} unit
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
                            module.status,
                          )}`}
                        >
                          {getReadableStatus(module.status)}
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                          <span>Progress modul</span>
                          <span>{module.progressPercent}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-800">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400 transition-all"
                            style={{ width: `${module.progressPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <SmallInfo
                          label="Unit Tuntas"
                          value={`${module.completedUnits}/${module.totalUnits}`}
                        />
                        <SmallInfo
                          label="Unit Berjalan"
                          value={`${module.inProgressUnits}`}
                        />
                        <SmallInfo
                          label="Mastery"
                          value={
                            module.masteryScore !== null
                              ? `${module.masteryScore}%`
                              : "—"
                          }
                        />
                      </div>

                      {module.nextUnitTitle ? (
                        <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4">
                          <div className="text-sm font-semibold text-white">
                            Fokus saat ini
                          </div>
                          <p className="mt-2 text-sm leading-7 text-slate-300">
                            Lanjutkan unit{" "}
                            <span className="font-medium text-white">
                              {module.nextUnitTitle}
                            </span>{" "}
                            untuk menuntaskan modul ini.
                          </p>
                        </div>
                      ) : null}

                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link
                          href={`/student/courses/${block.course.slug}/modules/${module.slug}`}
                          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                        >
                          Buka Detail Modul
                          <ArrowRight size={14} />
                        </Link>

                        <Link
                          href={`/student/courses/${block.course.slug}`}
                          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white transition hover:bg-white/10"
                        >
                          Lihat Course
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
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
          <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
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
