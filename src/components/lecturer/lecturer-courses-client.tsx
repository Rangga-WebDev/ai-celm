/** @format */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Layers3,
  MessageSquareMore,
  RefreshCcw,
  Search,
  Target,
  Users,
} from "lucide-react";

type LecturerCoursesClientProps = {
  user: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    email: string;
    role: string;
  };
};

type LecturerCoursesResponse = {
  success: boolean;
  message: string;
  data: {
    lecturer: {
      id: string;
      name: string;
      email: string;
    };
    summary: {
      totalCourses: number;
      publishedCourses: number;
      draftCourses: number;
      totalStudents: number;
      totalModules: number;
      totalUnits: number;
      averageProgress: number;
    };
    courses: Array<{
      id: string;
      title: string;
      slug: string;
      code: string | null;
      description: string | null;
      coverImage: string | null;
      isPublished: boolean;
      createdAt: string;
      updatedAt: string;
      summary: {
        activeStudents: number;
        totalEnrollments: number;
        totalModules: number;
        totalUnits: number;
        totalResources: number;
        totalThreads: number;
        totalProjects: number;
        averageProgress: number;
        averageMastery: number | null;
        completedRows: number;
        remedialRows: number;
      };
      modules: Array<{
        id: string;
        title: string;
        slug: string;
        description: string | null;
        order: number;
        status: string;
        isLocked: boolean;
        estimatedMinutes: number | null;
        masteryThreshold: number;
        totalUnits: number;
        averageProgress: number;
        completedStudents: number;
        remedialStudents: number;
      }>;
      studentsPreview: Array<{
        id: string;
        name: string;
        email: string;
        enrolledAt: string;
        averageProgress: number;
        completedModules: number;
        inProgressModules: number;
      }>;
    }>;
  };
};

type CourseItem = LecturerCoursesResponse["data"]["courses"][number];

export default function LecturerCoursesClient({
  user,
}: LecturerCoursesClientProps) {
  const [data, setData] = useState<LecturerCoursesResponse["data"] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PUBLISHED" | "DRAFT"
  >("ALL");

  async function fetchCourses() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/lecturers/${user.id}/courses`, {
        cache: "no-store",
      });

      const json = (await res.json()) as LecturerCoursesResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengambil course dosen");
      }

      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const filteredCourses = useMemo(() => {
    if (!data) return [];

    const keyword = q.trim().toLowerCase();

    return data.courses.filter((course) => {
      const matchesKeyword =
        !keyword ||
        course.title.toLowerCase().includes(keyword) ||
        course.slug.toLowerCase().includes(keyword) ||
        (course.code ?? "").toLowerCase().includes(keyword) ||
        (course.description ?? "").toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PUBLISHED" && course.isPublished) ||
        (statusFilter === "DRAFT" && !course.isPublished);

      return matchesKeyword && matchesStatus;
    });
  }, [data, q, statusFilter]);

  if (loading) {
    return (
      <main className="space-y-6 p-6">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <p className="text-slate-300">Memuat course dosen...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="space-y-6 p-6">
        <section className="rounded-[28px] border border-red-400/20 bg-red-500/5 p-6">
          <p className="text-red-300">Error: {error}</p>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="space-y-6 p-6">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <p className="text-slate-300">Data course belum tersedia.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <section className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="min-w-0">
            <Link
              href="/lecturer/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeft size={16} />
              Kembali ke Dashboard
            </Link>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
              <GraduationCap size={16} />
              Lecturer Course Workspace
            </div>

            <h1 className="mt-5 break-words text-3xl font-semibold text-white sm:text-4xl">
              Course yang Diampu
            </h1>

            <p className="mt-4 max-w-3xl break-words text-slate-300">
              Halaman ini menjadi pusat kerja dosen untuk melihat course,
              mahasiswa, modul, resource, forum, project, dan progres umum.
              Pembuatan modul dan micro-unit akan dilanjutkan pada Tahap 4B.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5">
            <div className="text-sm font-semibold text-white">Dosen aktif</div>
            <div className="mt-3 text-lg font-semibold text-white">
              {data.lecturer.name}
            </div>
            <div className="mt-1 text-sm text-slate-400">
              {data.lecturer.email}
            </div>

            <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
              <div className="text-sm text-cyan-200">
                Total course yang diampu
              </div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {data.summary.totalCourses}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-5">
        <StatCard
          icon={BookOpen}
          label="Total Course"
          value={data.summary.totalCourses}
          subtitle="Course yang diampu"
        />
        <StatCard
          icon={Users}
          label="Mahasiswa Aktif"
          value={data.summary.totalStudents}
          subtitle="Terdaftar aktif"
        />
        <StatCard
          icon={Layers3}
          label="Total Modul"
          value={data.summary.totalModules}
          subtitle="Modul tersedia"
        />
        <StatCard
          icon={CheckCircle2}
          label="Total Unit"
          value={data.summary.totalUnits}
          subtitle="Micro-unit"
        />
        <StatCard
          icon={GraduationCap}
          label="Avg Progress"
          value={data.summary.averageProgress}
          subtitle="Rata-rata course"
          suffix="%"
        />
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Daftar Course</h2>
            <p className="mt-1 text-sm text-slate-400">
              Pilih course untuk melihat detail dan melanjutkan pengelolaan
              akademik.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3">
              <Search size={16} className="text-slate-500" />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Cari course..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as "ALL" | "PUBLISHED" | "DRAFT",
                )
              }
              className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>

            <button
              type="button"
              onClick={fetchCourses}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              <RefreshCcw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {filteredCourses.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-sm text-slate-300">
            Belum ada course yang sesuai filter. Pastikan admin sudah membuat
            course dan memilih dosen pengampu.
          </div>
        ) : (
          <div className="grid gap-5">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function CourseCard({ course }: { course: CourseItem }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/70 p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <StatusBadge isPublished={course.isPublished} />

            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
              {course.code ?? "Tanpa kode"}
            </span>

            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
              /{course.slug}
            </span>
          </div>

          <h3 className="mt-4 break-words text-2xl font-semibold text-white">
            {course.title}
          </h3>

          <p className="mt-2 max-w-4xl break-words text-sm leading-7 text-slate-300">
            {course.description ?? "Belum ada deskripsi course."}
          </p>
        </div>

        <div className="w-full shrink-0 rounded-2xl border border-white/10 bg-slate-950/60 p-4 xl:w-80">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
            <span>Rata-rata progres</span>
            <span>{course.summary.averageProgress}%</span>
          </div>

          <div className="h-2 w-full rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400"
              style={{ width: `${course.summary.averageProgress}%` }}
            />
          </div>

          <div className="mt-3 text-xs text-slate-400">
            Mastery rata-rata:{" "}
            <span className="text-slate-200">
              {course.summary.averageMastery ?? "Belum tersedia"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MiniInfo
          label="Mahasiswa"
          value={`${course.summary.activeStudents}`}
        />
        <MiniInfo label="Modul" value={`${course.summary.totalModules}`} />
        <MiniInfo label="Unit" value={`${course.summary.totalUnits}`} />
        <MiniInfo label="Resource" value={`${course.summary.totalResources}`} />
        <MiniInfo label="Forum" value={`${course.summary.totalThreads}`} />
        <MiniInfo label="Project" value={`${course.summary.totalProjects}`} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Layers3 size={16} className="text-teal-300" />
            Ringkasan Modul
          </div>

          {course.modules.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-400">
              Belum ada modul. Gunakan menu Modules untuk membuat modul dan mengelola micro-unit.
            </div>
          ) : (
            <div className="grid gap-3">
              {course.modules.slice(0, 4).map((module) => (
                <div
                  key={module.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">
                        {module.order}. {module.title}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {module.totalUnits} unit · {module.status}
                      </div>
                    </div>

                    <div className="rounded-full bg-teal-400/10 px-3 py-1 text-xs text-teal-300">
                      {module.averageProgress}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Users size={16} className="text-cyan-300" />
            Mahasiswa Terbaru
          </div>

          {course.studentsPreview.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-400">
              Belum ada mahasiswa aktif pada course ini.
            </div>
          ) : (
            <div className="grid gap-3">
              {course.studentsPreview.map((student) => (
                <div
                  key={student.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">
                        {student.name}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {student.email}
                      </div>
                    </div>

                    <div className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                      {student.averageProgress}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/lecturer/courses/${course.slug}`}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
        >
          Buka Detail Course
          <ArrowRight size={16} />
        </Link>

        <Link
          href={`/lecturer/courses/${course.slug}/cer`}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-white transition hover:bg-white/[0.08]"
        >
          <Target size={16} />
          CER
        </Link>

        <Link
          href={`/lecturer/courses/${course.slug}/modules`}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-white transition hover:bg-white/[0.08]"
        >
          <Layers3 size={16} />
          Modul
        </Link>

        <Link
          href={`/lecturer/courses/${course.slug}/resources`}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-white transition hover:bg-white/[0.08]"
        >
          <FileText size={16} />
          Resource
        </Link>

        <Link
          href={`/lecturer/courses/${course.slug}/forums`}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-white transition hover:bg-white/[0.08]"
        >
          <MessageSquareMore size={16} />
          Forum
        </Link>

        <Link
          href={`/lecturer/courses/${course.slug}/projects`}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-white transition hover:bg-white/[0.08]"
        >
          <Target size={16} />
          Project
        </Link>
      </div>
    </div>
  );
}

function StatCard({
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
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-400">{label}</div>
          <div className="mt-2 text-3xl font-semibold text-white">
            {value}
            {suffix}
          </div>
          <div className="mt-2 text-xs text-slate-500">{subtitle}</div>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function StatusBadge({ isPublished }: { isPublished: boolean }) {
  return isPublished ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
      <Eye size={13} />
      Published
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
      <EyeOff size={13} />
      Draft
    </span>
  );
}
