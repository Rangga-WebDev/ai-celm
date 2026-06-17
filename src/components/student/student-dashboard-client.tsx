/** @format */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Info,
  PlayCircle,
} from "lucide-react";

type StudentDashboardClientProps = {
  user: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    email: string;
    role: string;
  };
};

type DashboardResponse = {
  student: {
    id: string;
    name: string;
    email: string;
  };
  summary: {
    totalCourses: number;
    completedCourses: number;
    activeCourses: number;
  };
  courses: Array<{
    enrollmentId: string;
    enrolledAt: string;
    course: {
      id: string;
      title: string;
      slug: string;
      code: string | null;
      description: string | null;
      coverImage: string | null;
      lecturer: {
        id: string;
        name: string;
        email: string;
      } | null;
      summary: {
        totalModules: number;
        completedModules: number;
        inProgressModules: number;
        overallProgress: number;
      };
      nextModule: {
        id: string;
        title: string;
        slug: string;
        order: number;
      } | null;
    };
  }>;
};

export default function StudentDashboardClient({
  user,
}: StudentDashboardClientProps) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/students/${user.id}/dashboard`, {
          cache: "no-store",
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal memuat data");
        }

        setDashboard(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, [user.id]);

  const firstName =
    user.firstName?.trim() ||
    user.name?.trim()?.split(" ")[0] ||
    dashboard?.student.name?.split(" ")[0] ||
    "Mahasiswa";

  // Hitung progres keseluruhan dari data nyata (bukan angka karangan).
  const overallProgress = useMemo(() => {
    if (!dashboard || dashboard.courses.length === 0) return 0;

    const totalModules = dashboard.courses.reduce(
      (sum, item) => sum + item.course.summary.totalModules,
      0,
    );
    const completedModules = dashboard.courses.reduce(
      (sum, item) => sum + item.course.summary.completedModules,
      0,
    );

    return totalModules > 0
      ? Math.round((completedModules / totalModules) * 100)
      : 0;
  }, [dashboard]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-3xl bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-28 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-28 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-28 animate-pulse rounded-3xl bg-slate-200" />
        </div>
        <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
        <h2 className="text-lg font-bold text-rose-800">
          Maaf, data belum bisa ditampilkan
        </h2>
        <p className="mt-2 text-base text-rose-700">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-2xl bg-rose-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-rose-700"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (!dashboard) return null;

  const courses = dashboard.courses;

  return (
    <div className="space-y-8">
      {/* Sapaan */}
      <section className="rounded-3xl bg-teal-600 px-6 py-7 text-white sm:px-8">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Selamat datang, {firstName}
        </h1>
        <p className="mt-2 max-w-2xl text-lg leading-relaxed text-teal-50">
          {dashboard.summary.activeCourses > 0
            ? `Anda sedang mengikuti ${dashboard.summary.activeCourses} mata kuliah. Lanjutkan belajar Anda hari ini.`
            : "Anda belum mengikuti mata kuliah. Hubungi dosen Anda untuk mulai belajar."}
        </p>
      </section>

      {/* Ringkasan angka — sederhana, jujur, mudah dibaca */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={BookOpen}
          label="Mata Kuliah Aktif"
          value={dashboard.summary.activeCourses}
        />
        <StatCard
          icon={CheckCircle2}
          label="Kelas Selesai"
          value={dashboard.summary.completedCourses}
        />
        <StatCard
          icon={GraduationCap}
          label="Progres Belajar"
          value={overallProgress}
          suffix="%"
        />
      </section>

      {/* Lanjutkan belajar */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            Lanjutkan Belajar
          </h2>
          <Link
            href="/student/courses"
            className="inline-flex items-center gap-1.5 text-base font-semibold text-teal-700 transition hover:text-teal-800"
          >
            Lihat semua
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <BookOpen size={28} aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              Belum ada mata kuliah
            </h3>
            <p className="mx-auto mt-2 max-w-md text-base text-slate-600">
              Mata kuliah akan muncul di sini setelah dosen mendaftarkan Anda ke
              dalam kelas.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {courses.map((item) => (
              <CourseCard key={item.enrollmentId} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* Catatan peran AI — human in the loop */}
      <section className="flex items-start gap-3 rounded-3xl border border-teal-200 bg-teal-50 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
          <Info size={22} aria-hidden="true" />
        </span>
        <p className="text-base leading-relaxed text-teal-900">
          AI di aplikasi ini membantu Anda belajar dan memberi masukan. Namun,
          semua nilai dan keputusan akhir tetap diberikan oleh dosen Anda.
        </p>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix = "",
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
          <Icon size={24} aria-hidden="true" />
        </span>
        <div>
          <div className="text-3xl font-bold text-slate-900">
            {value}
            {suffix}
          </div>
          <div className="text-base text-slate-600">{label}</div>
        </div>
      </div>
    </div>
  );
}

function CourseCard({ item }: { item: DashboardResponse["courses"][number] }) {
  const { course } = item;
  const progress = course.summary.overallProgress;
  const done = progress >= 100;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-slate-900">{course.title}</h3>
          {course.lecturer && (
            <p className="mt-1 text-base text-slate-600">
              Dosen: {course.lecturer.name}
            </p>
          )}
        </div>
        <span
          className={
            done
              ? "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-700"
              : "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-700"
          }
        >
          {done ? "Selesai" : "Sedang berjalan"}
        </span>
      </div>

      {/* Progres */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-base text-slate-600">
          <span>
            {course.summary.completedModules} dari {course.summary.totalModules}{" "}
            modul selesai
          </span>
          <span className="font-semibold text-slate-900">{progress}%</span>
        </div>
        <div
          className="h-3 w-full overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progres ${course.title}`}
        >
          <div
            className="h-full rounded-full bg-teal-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Aksi utama */}
      <div className="mt-5">
        <Link
          href={`/student/courses/${course.slug}/learn`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3.5 text-base font-semibold text-white transition hover:bg-teal-700 sm:w-auto"
        >
          <PlayCircle size={20} aria-hidden="true" />
          {progress > 0 && !done ? "Lanjut Belajar" : "Mulai Belajar"}
        </Link>
        {course.nextModule && !done && (
          <p className="mt-2 text-base text-slate-500">
            Berikutnya: {course.nextModule.title}
          </p>
        )}
      </div>
    </div>
  );
}
