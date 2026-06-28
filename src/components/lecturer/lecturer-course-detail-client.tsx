/** @format */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileText,
  HeartHandshake,
  LibraryBig,
  MessageSquareMore,
  ShieldAlert,
  Target,
  Users,
  Wrench,
} from "lucide-react";

type LecturerCourseDetailClientProps = {
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

type LecturerCourseDetailResponse = {
  success: boolean;
  message: string;
  data: {
    lecturer: {
      id: string;
      name: string;
      email: string;
    };
    course: {
      id: string;
      title: string;
      slug: string;
      code: string | null;
      description: string | null;
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
    summary: {
      totalStudents: number;
      totalModules: number;
      totalUnits: number;
      averageProgress: number;
    };
    modules: Array<{
      id: string;
      title: string;
      slug: string;
      description: string | null;
      order: number;
      estimatedMinutes: number | null;
      masteryThreshold: number;
      totalUnits: number;
      avgProgress: number;
      avgMastery: number | null;
      completedStudents: number;
      students: Array<{
        studentId: string;
        studentName: string;
        status: string;
        progressPercent: number;
        masteryScore: number | null;
        isPassed: boolean;
        remedialRequired: boolean;
      }>;
    }>;
    students: Array<{
      id: string;
      name: string;
      email: string;
      enrolledAt: string;
      progress: {
        totalModules: number;
        completedModules: number;
        inProgressModules: number;
        averageProgress: number;
      };
      moduleRows: Array<{
        moduleId: string;
        moduleTitle: string;
        moduleSlug: string;
        status: string;
        progressPercent: number;
        masteryScore: number | null;
      }>;
    }>;
  };
};

function statusText(status?: string) {
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

function statusBadge(status?: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700";
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-700";
    case "REMEDIAL":
      return "bg-orange-100 text-orange-700";
    case "LOCKED":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function LecturerCourseDetailClient({
  user,
  slug,
}: LecturerCourseDetailClientProps) {
  const [data, setData] = useState<LecturerCourseDetailResponse["data"] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetail() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/lecturers/${user.id}/courses/${slug}`, {
          cache: "no-store",
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal memuat detail kelas");
        }

        setData(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [slug, user.id]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <p className="text-base text-slate-600">Memuat detail kelas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
        <p className="text-base text-rose-700">Terjadi kesalahan: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <p className="text-base text-slate-600">Data belum tersedia.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/lecturer/courses"
        className="inline-flex items-center gap-2 text-base font-medium text-teal-700 hover:text-teal-800"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Kembali ke Mata Kuliah
      </Link>

      {/* Header */}
      <section className="overflow-hidden rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium">
          <BookOpen size={16} aria-hidden="true" />
          {data.course.code ?? "Mata Kuliah"}
        </div>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          {data.course.title}
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-teal-50">
          {data.course.description ?? "Belum ada deskripsi mata kuliah."}
        </p>
      </section>

      {/* Ringkasan angka */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Mahasiswa"
          value={data.summary.totalStudents}
        />
        <StatCard
          icon={LibraryBig}
          label="Modul"
          value={data.summary.totalModules}
        />
        <StatCard
          icon={FileText}
          label="Bagian"
          value={data.summary.totalUnits}
        />
        <StatCard
          icon={Target}
          label="Rata-rata Progres"
          value={data.summary.averageProgress}
          suffix="%"
        />
      </section>

      {/* Akses fitur kelas */}
      <CourseFeatureAccess slug={data.course.slug} />

      {/* Ringkasan modul */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-900">Perkembangan Modul</h2>
        <p className="mt-1 text-base text-slate-600">
          Progres rata-rata mahasiswa pada tiap modul.
        </p>

        <div className="mt-5 grid gap-4">
          {data.modules.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base text-slate-600">
              Belum ada modul pada kelas ini.
            </div>
          ) : (
            data.modules.map((module) => (
              <div
                key={module.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Modul {module.order}
                    </div>
                    <h3 className="mt-1 text-lg font-bold text-slate-900">
                      {module.title}
                    </h3>
                    {module.description ? (
                      <p className="mt-1.5 max-w-2xl text-base leading-7 text-slate-600">
                        {module.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                      <span>Progres</span>
                      <span className="font-semibold text-slate-900">
                        {module.avgProgress}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-200">
                      <div
                        className="h-2.5 rounded-full bg-teal-600"
                        style={{ width: `${module.avgProgress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <MiniInfo label="Bagian" value={`${module.totalUnits}`} />
                  <MiniInfo
                    label="Selesai"
                    value={`${module.completedStudents}/${data.summary.totalStudents}`}
                  />
                  <MiniInfo
                    label="Waktu (menit)"
                    value={
                      module.estimatedMinutes
                        ? `${module.estimatedMinutes}`
                        : "—"
                    }
                  />
                </div>

                {module.students.length > 0 ? (
                  <details className="group mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                      <span className="text-base font-semibold text-slate-900">
                        Lihat progres mahasiswa
                      </span>
                      <ChevronRight
                        size={18}
                        aria-hidden="true"
                        className="text-slate-400 transition group-open:rotate-90"
                      />
                    </summary>

                    <div className="mt-4 grid gap-2.5">
                      {module.students.map((student) => (
                        <div
                          key={student.studentId}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="min-w-0 text-base font-medium text-slate-900">
                            {student.studentName}
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-semibold text-slate-700">
                              {student.progressPercent}%
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(
                                student.status,
                              )}`}
                            >
                              {statusText(student.status)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Daftar mahasiswa */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-900">Mahasiswa</h2>
        <p className="mt-1 text-base text-slate-600">
          Ringkasan perkembangan setiap mahasiswa.
        </p>

        <div className="mt-5 grid gap-3">
          {data.students.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base text-slate-600">
              Belum ada mahasiswa aktif.
            </div>
          ) : (
            data.students.map((student) => (
              <div
                key={student.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-slate-900">
                      {student.name}
                    </div>
                    <div className="mt-0.5 truncate text-sm text-slate-500">
                      {student.email}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-900">
                      {student.progress.averageProgress}%
                    </div>
                    <div className="text-xs text-slate-500">
                      {student.progress.completedModules} modul selesai
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-teal-600"
                    style={{ width: `${student.progress.averageProgress}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Bahan belajar */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-900">Bahan Belajar</h2>
        <div className="mt-4 grid gap-3">
          {data.course.resources.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base text-slate-600">
              Belum ada bahan belajar.
            </div>
          ) : (
            data.course.resources.map((resource) => (
              <a
                key={resource.id}
                href={resource.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                  <FileText size={18} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-medium text-slate-900">
                    {resource.title}
                  </div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    {resource.type}
                  </div>
                </div>
              </a>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function CourseFeatureAccess({ slug }: { slug: string }) {
  const actions = [
    {
      label: "Course Builder",
      href: `/lecturer/courses/${slug}/builder`,
      icon: Wrench,
      description: "Unggah materi PDF/Word sebagai sumber fitur AI.",
    },
    {
      label: "Modul",
      href: `/lecturer/courses/${slug}/modules`,
      icon: LibraryBig,
      description: "Susun struktur modul dan bagian pembelajaran.",
    },
    {
      label: "Bahan Belajar",
      href: `/lecturer/courses/${slug}/resources`,
      icon: FileText,
      description: "Kelola PDF, link, slide, dan video materi.",
    },
    {
      label: "Tugas Argumentasi",
      href: `/lecturer/courses/${slug}/cer`,
      icon: ClipboardCheck,
      description: "Buat dan nilai tugas berbasis argumentasi.",
    },
    {
      label: "Forum Diskusi",
      href: `/lecturer/courses/${slug}/forums`,
      icon: MessageSquareMore,
      description: "Buka ruang diskusi dan pantau partisipasi.",
    },
    {
      label: "Project Aksi",
      href: `/lecturer/courses/${slug}/projects`,
      icon: Target,
      description: "Kelola proyek nyata dan karya mahasiswa.",
    },
    {
      label: "Ujian (UTS & UAS)",
      href: `/lecturer/courses/${slug}/exams`,
      icon: ClipboardList,
      description: "Buat soal UTS & UAS esai dari PDF dengan bantuan AI.",
    },
    {
      label: "Rekap Civic Engagement",
      href: `/lecturer/courses/${slug}/civic-test`,
      icon: HeartHandshake,
      description: "Pantau peningkatan pre-test vs post-test kewargaan.",
    },
    {
      label: "Mahasiswa Berisiko",
      href: `/lecturer/courses/${slug}/at-risk`,
      icon: ShieldAlert,
      description: "Pantau mahasiswa yang perlu perhatian.",
    },
  ];

  return (
    <section>
      <h2 className="mb-3 text-xl font-bold text-slate-900">Kelola Kelas</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-teal-300 hover:bg-teal-50"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                <Icon size={20} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="text-base font-bold text-slate-900">
                  {action.label}
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {action.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix = "",
}: {
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
          <Icon size={22} aria-hidden={true} />
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-900">
            {value}
            {suffix}
          </div>
          <div className="text-sm text-slate-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
      <div className="text-lg font-bold text-slate-900">{value}</div>
      <div className="mt-0.5 text-xs text-slate-500">{label}</div>
    </div>
  );
}
