/** @format */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LibraryBig,
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
        throw new Error(json.message || "Gagal mengambil mata kuliah");
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
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <p className="text-base text-slate-600">Memuat mata kuliah...</p>
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
      {/* Header */}
      <section className="overflow-hidden rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium">
          <GraduationCap size={16} aria-hidden="true" />
          Ruang Dosen
        </div>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          Mata Kuliah yang Diampu
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-teal-50">
          Pilih mata kuliah untuk mengelola modul, bahan belajar, tugas, forum,
          dan memantau perkembangan mahasiswa.
        </p>
      </section>

      {/* Ringkasan angka */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Mata Kuliah"
          value={data.summary.totalCourses}
        />
        <StatCard
          icon={Users}
          label="Mahasiswa Aktif"
          value={data.summary.totalStudents}
        />
        <StatCard
          icon={LibraryBig}
          label="Modul"
          value={data.summary.totalModules}
        />
        <StatCard
          icon={GraduationCap}
          label="Rata-rata Progres"
          value={data.summary.averageProgress}
          suffix="%"
        />
      </section>

      {/* Pencarian + filter */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Search size={18} className="text-slate-400" aria-hidden="true" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Cari mata kuliah..."
              aria-label="Cari mata kuliah"
              className="w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "ALL" | "PUBLISHED" | "DRAFT",
              )
            }
            aria-label="Saring status"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700 outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="PUBLISHED">Terbit</option>
            <option value="DRAFT">Draf</option>
          </select>

          <button
            type="button"
            onClick={fetchCourses}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCcw size={18} aria-hidden="true" />
            Muat ulang
          </button>
        </div>
      </section>

      {/* Daftar */}
      {filteredCourses.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
          Belum ada mata kuliah yang sesuai. Pastikan admin sudah membuat mata
          kuliah dan menugaskan Anda sebagai dosen pengampu.
        </div>
      ) : (
        <div className="grid gap-5">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course }: { course: CourseItem }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                course.isPublished
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {course.isPublished ? "Terbit" : "Draf"}
            </span>
            {course.code ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {course.code}
              </span>
            ) : null}
          </div>

          <h3 className="mt-3 text-xl font-bold text-slate-900">
            {course.title}
          </h3>

          <p className="mt-1.5 max-w-3xl text-base leading-7 text-slate-600">
            {course.description ?? "Belum ada deskripsi mata kuliah."}
          </p>
        </div>

        <div className="w-full shrink-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 xl:w-72">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
            <span>Rata-rata progres</span>
            <span className="font-semibold text-slate-900">
              {course.summary.averageProgress}%
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-200">
            <div
              className="h-2.5 rounded-full bg-teal-600"
              style={{ width: `${course.summary.averageProgress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <MiniInfo
          label="Mahasiswa"
          value={`${course.summary.activeStudents}`}
        />
        <MiniInfo label="Modul" value={`${course.summary.totalModules}`} />
        <MiniInfo label="Bagian" value={`${course.summary.totalUnits}`} />
        <MiniInfo label="Bahan" value={`${course.summary.totalResources}`} />
        <MiniInfo label="Forum" value={`${course.summary.totalThreads}`} />
        <MiniInfo label="Project" value={`${course.summary.totalProjects}`} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2.5">
        <Link
          href={`/lecturer/courses/${course.slug}`}
          className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700"
        >
          Buka Kelas
          <ArrowRight size={16} aria-hidden="true" />
        </Link>

        <SecondaryLink
          href={`/lecturer/courses/${course.slug}/modules`}
          label="Modul"
          icon={LibraryBig}
        />
        <SecondaryLink
          href={`/lecturer/courses/${course.slug}/resources`}
          label="Bahan Belajar"
          icon={FileText}
        />
        <SecondaryLink
          href={`/lecturer/courses/${course.slug}/cer`}
          label="Tugas Argumentasi"
          icon={ClipboardCheck}
        />
        <SecondaryLink
          href={`/lecturer/courses/${course.slug}/forums`}
          label="Forum Diskusi"
          icon={MessageSquareMore}
        />
        <SecondaryLink
          href={`/lecturer/courses/${course.slug}/projects`}
          label="Project Aksi"
          icon={Target}
        />
      </div>
    </div>
  );
}

function SecondaryLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-50"
    >
      <Icon size={16} aria-hidden={true} />
      {label}
    </Link>
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
      <div className="text-lg font-bold text-slate-900">{value}</div>
      <div className="mt-0.5 text-xs text-slate-500">{label}</div>
    </div>
  );
}
