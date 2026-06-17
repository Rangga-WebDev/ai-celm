/** @format */

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { EnrollmentStatus, ProgressStatus } from "@/generated/prisma/client";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Layers3,
} from "lucide-react";

export const dynamic = "force-dynamic";

function getReadableStatus(status?: ProgressStatus | string) {
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

function getStatusBadge(status?: ProgressStatus | string) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700";
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-700";
    case "REMEDIAL":
      return "bg-orange-100 text-orange-700";
    case "LOCKED":
      return "bg-slate-100 text-slate-500";
    default:
      return "bg-slate-100 text-slate-600";
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
    <div className="space-y-8">
      {/* Judul halaman */}
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Modul Belajar
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          Seluruh modul dari mata kuliah yang Anda ikuti, lengkap dengan progres
          belajar.
        </p>
      </header>

      {/* Ringkasan angka */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStatCard
          icon={BookOpen}
          label="Mata Kuliah"
          value={courseBlocks.length}
        />
        <MiniStatCard
          icon={Layers3}
          label="Total Modul"
          value={grandTotalModules}
        />
        <MiniStatCard
          icon={CheckCircle2}
          label="Modul Selesai"
          value={grandCompletedModules}
        />
        <MiniStatCard
          icon={Clock3}
          label="Sedang Dipelajari"
          value={grandInProgressModules}
        />
      </section>

      {courseBlocks.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Layers3 size={28} aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            Belum ada modul
          </h2>
          <p className="mx-auto mt-2 max-w-md text-base text-slate-600">
            Modul akan muncul di sini setelah Anda terdaftar di sebuah mata
            kuliah.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {courseBlocks.map((block) => (
            <section
              key={block.enrollmentId}
              className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6"
            >
              {/* Kepala kartu mata kuliah */}
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                    <BookOpen size={15} aria-hidden="true" />
                    {block.course.code ?? "Tanpa kode"}
                  </span>
                  <h2 className="mt-3 text-xl font-bold text-slate-900">
                    {block.course.title}
                  </h2>
                  <p className="mt-1 text-base text-slate-600">
                    Dosen: {block.course.lecturer}
                  </p>
                </div>

                <div className="w-full rounded-2xl bg-slate-50 p-4 sm:max-w-xs">
                  <div className="mb-1.5 flex items-center justify-between text-base text-slate-600">
                    <span>Progres kelas</span>
                    <span className="font-semibold text-slate-900">
                      {block.summary.overallProgress}%
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-teal-600 transition-all"
                      style={{ width: `${block.summary.overallProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Daftar modul */}
              <div className="mt-5 space-y-4">
                {block.modules.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-base text-slate-500">
                    Belum ada modul pada mata kuliah ini.
                  </div>
                ) : (
                  block.modules.map((module) => (
                    <div
                      key={module.id}
                      className="rounded-2xl border border-slate-200 p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-500">
                            Modul {module.order}
                          </div>
                          <h3 className="mt-0.5 text-lg font-bold text-slate-900">
                            {module.title}
                          </h3>
                          {module.description && (
                            <p className="mt-2 text-base leading-relaxed text-slate-600">
                              {module.description}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
                            <span className="rounded-full bg-slate-100 px-3 py-1">
                              {module.totalUnits} bagian
                            </span>
                            <span className="rounded-full bg-slate-100 px-3 py-1">
                              {module.estimatedMinutes ?? 0} menit
                            </span>
                          </div>
                        </div>

                        <span
                          className={`inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-sm font-semibold ${getStatusBadge(
                            module.status,
                          )}`}
                        >
                          {getReadableStatus(module.status)}
                        </span>
                      </div>

                      {/* Progres modul */}
                      <div className="mt-4">
                        <div className="mb-1.5 flex items-center justify-between text-base text-slate-600">
                          <span>
                            {module.completedUnits} dari {module.totalUnits}{" "}
                            bagian selesai
                          </span>
                          <span className="font-semibold text-slate-900">
                            {module.progressPercent}%
                          </span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-teal-600 transition-all"
                            style={{ width: `${module.progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {module.nextUnitTitle && (
                        <div className="mt-4 rounded-2xl bg-teal-50 p-4">
                          <p className="text-base leading-relaxed text-teal-900">
                            <span className="font-semibold">Berikutnya:</span>{" "}
                            {module.nextUnitTitle}
                          </p>
                        </div>
                      )}

                      <div className="mt-4">
                        <Link
                          href={`/student/courses/${block.course.slug}/modules/${module.slug}`}
                          className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700"
                        >
                          Buka Modul
                          <ArrowRight size={18} aria-hidden="true" />
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
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
          <Icon size={24} aria-hidden="true" />
        </span>
        <div>
          <div className="text-3xl font-bold text-slate-900">{value}</div>
          <div className="text-base text-slate-600">{label}</div>
        </div>
      </div>
    </div>
  );
}
