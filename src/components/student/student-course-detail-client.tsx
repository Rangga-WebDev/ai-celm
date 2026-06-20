/** @format */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileQuestion,
  FileText,
  GraduationCap,
  MessagesSquare,
  PlayCircle,
  Rocket,
  Sparkles,
  Target,
} from "lucide-react";

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
          fetch(`/api/courses/${slug}/progress`, { cache: "no-store" }),
        ]);

        const courseJson = await courseRes.json();
        const progressJson = await progressRes.json();

        if (!courseRes.ok || !courseJson.success) {
          throw new Error(courseJson.message || "Gagal memuat detail kelas");
        }
        if (!progressRes.ok || !progressJson.success) {
          throw new Error(progressJson.message || "Gagal memuat progres kelas");
        }

        setCourse(courseJson.data);
        setProgress(progressJson.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
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
    const nextModule =
      progress.modules.find(
        (module) => module.progress.status !== "COMPLETED",
      ) ?? null;

    return {
      totalUnits,
      completedUnits,
      nextModule,
      totalResources: course.resources.length,
    };
  }, [course, progress]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-3xl bg-slate-200" />
        <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
        <h2 className="text-lg font-bold text-rose-800">
          Maaf, kelas belum bisa ditampilkan
        </h2>
        <p className="mt-2 text-base text-rose-700">{error}</p>
        <Link
          href="/student/courses"
          className="mt-4 inline-flex rounded-2xl bg-rose-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-rose-700"
        >
          Kembali ke Daftar Mata Kuliah
        </Link>
      </div>
    );
  }

  if (!course || !progress || !derived) return null;

  const activities = [
    {
      href: `/student/courses/${slug}/learn`,
      icon: PlayCircle,
      label: "Belajar",
      desc: "Materi dan modul",
    },
    {
      href: `/student/courses/${slug}/study`,
      icon: GraduationCap,
      label: "Bahan Belajar",
      desc: "Ringkasan, kartu hafalan & latihan",
    },
    {
      href: `/student/courses/${slug}/chat`,
      icon: Sparkles,
      label: "Tanya Materi",
      desc: "Asisten belajar dari materi dosen",
    },
    {
      href: `/student/courses/${slug}/cer`,
      icon: ClipboardCheck,
      label: "Tugas Argumentasi",
      desc: "Latihan menyusun argumen",
    },
    {
      href: `/student/courses/${slug}/forums`,
      icon: MessagesSquare,
      label: "Forum Diskusi",
      desc: "Berdiskusi dengan teman",
    },
    {
      href: `/student/courses/${slug}/projects`,
      icon: Rocket,
      label: "Project Aksi",
      desc: "Proyek kewargaan nyata",
    },
    {
      href: `/student/courses/${slug}/quizzes`,
      icon: FileQuestion,
      label: "Kuis",
      desc: "Uji pemahaman Anda",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Kepala kelas */}
      <section className="rounded-3xl bg-teal-600 px-6 py-7 text-white sm:px-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
          <BookOpen size={15} aria-hidden="true" />
          {course.code ?? "Mata Kuliah"}
        </span>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{course.title}</h1>
        {course.lecturer && (
          <p className="mt-1 text-lg text-teal-50">
            Dosen: {course.lecturer.name}
          </p>
        )}
        {course.description && (
          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-teal-50">
            {course.description}
          </p>
        )}

        {/* Progres */}
        <div className="mt-5 max-w-md">
          <div className="mb-1.5 flex items-center justify-between text-base text-teal-50">
            <span>Progres belajar Anda</span>
            <span className="font-semibold text-white">
              {progress.summary.overallProgress}%
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${progress.summary.overallProgress}%` }}
            />
          </div>
        </div>
      </section>

      {/* Aktivitas kelas — tombol besar & jelas */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-slate-900">
          Aktivitas Kelas
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity) => {
            const Icon = activity.icon;
            return (
              <Link
                key={activity.href}
                href={activity.href}
                className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-teal-300 hover:bg-teal-50"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                  <Icon size={26} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-lg font-bold text-slate-900">
                    {activity.label}
                  </span>
                  <span className="block text-base text-slate-600">
                    {activity.desc}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Ringkasan angka */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={CheckCircle2}
          label="Modul Selesai"
          value={`${progress.summary.completedModules} / ${progress.summary.totalModules}`}
        />
        <StatCard
          icon={Target}
          label="Bagian Selesai"
          value={`${derived.completedUnits} / ${derived.totalUnits}`}
        />
        <StatCard
          icon={FileText}
          label="Bahan Belajar"
          value={`${derived.totalResources}`}
        />
      </section>

      {/* Daftar modul */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-slate-900">Daftar Modul</h2>
        {progress.modules.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-500">
            Belum ada modul pada kelas ini.
          </div>
        ) : (
          <div className="space-y-4">
            {progress.modules.map((module) => {
              const completedUnits = module.units.filter(
                (unit) => unit.progress.status === "COMPLETED",
              ).length;
              const nextUnit =
                module.units.find(
                  (unit) => unit.progress.status !== "COMPLETED",
                ) ?? null;

              return (
                <article
                  key={module.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-500">
                        Modul {module.order}
                      </div>
                      <h3 className="mt-0.5 text-lg font-bold text-slate-900">
                        {module.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
                        <span className="rounded-full bg-slate-100 px-3 py-1">
                          {module.units.length} bagian
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">
                          {module.estimatedMinutes ?? 0} menit
                        </span>
                      </div>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-sm font-semibold ${getStatusBadge(
                        module.progress.status,
                      )}`}
                    >
                      {getReadableStatus(module.progress.status)}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-base text-slate-600">
                      <span>
                        {completedUnits} dari {module.units.length} bagian
                        selesai
                      </span>
                      <span className="font-semibold text-slate-900">
                        {module.progress.progressPercent}%
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-teal-600 transition-all"
                        style={{ width: `${module.progress.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {nextUnit && (
                    <div className="mt-4 rounded-2xl bg-teal-50 p-4">
                      <p className="text-base leading-relaxed text-teal-900">
                        <span className="font-semibold">Berikutnya:</span>{" "}
                        {nextUnit.title}
                      </p>
                    </div>
                  )}

                  {/* Daftar bagian (disembunyikan dulu — progressive disclosure) */}
                  {module.units.length > 0 && (
                    <details className="group mt-4 rounded-2xl border border-slate-200">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                        <span className="text-base font-semibold text-slate-700">
                          Lihat semua bagian
                        </span>
                        <ChevronDown
                          size={20}
                          aria-hidden="true"
                          className="text-slate-400 transition group-open:rotate-180"
                        />
                      </summary>
                      <div className="space-y-2 px-4 pb-4">
                        {module.units.map((unit) => (
                          <div
                            key={unit.id}
                            className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3"
                          >
                            <span className="min-w-0 text-base font-medium text-slate-700">
                              {unit.order}. {unit.title}
                            </span>
                            <span
                              className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-sm font-semibold ${getStatusBadge(
                                unit.progress.status,
                              )}`}
                            >
                              {getReadableStatus(unit.progress.status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  <div className="mt-4">
                    <Link
                      href={`/student/courses/${slug}/modules/${module.slug}`}
                      className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700"
                    >
                      Buka Modul
                      <ArrowRight size={18} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Capaian pembelajaran — disederhanakan, jargon disembunyikan */}
      {course.cpmks.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-slate-900">
            Yang Akan Anda Capai
          </h2>
          <p className="mt-1 text-base text-slate-600">
            Kemampuan yang diharapkan Anda kuasai setelah mengikuti kelas ini.
          </p>
          <ul className="mt-4 space-y-3">
            {course.cpmks.map((cpmk) => (
              <li
                key={cpmk.id}
                className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4"
              >
                <CheckCircle2
                  size={22}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-teal-600"
                />
                <span className="text-base leading-relaxed text-slate-700">
                  {cpmk.statement}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Bahan belajar */}
      {course.resources.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Bahan Belajar
          </h2>
          <div className="space-y-3">
            {course.resources.map((resource) => (
              <a
                key={resource.id}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-teal-300 hover:bg-teal-50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                  <FileText size={22} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-semibold text-slate-900">
                    {resource.title}
                  </span>
                  {resource.description && (
                    <span className="block text-base text-slate-600">
                      {resource.description}
                    </span>
                  )}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
          <Icon size={24} aria-hidden="true" />
        </span>
        <div>
          <div className="text-2xl font-bold text-slate-900">{value}</div>
          <div className="text-base text-slate-600">{label}</div>
        </div>
      </div>
    </div>
  );
}
