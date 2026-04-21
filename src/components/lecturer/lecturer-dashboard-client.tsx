/** @format */

"use client";

/** @format */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Layers3,
  Users,
} from "lucide-react";

type LecturerDashboardClientProps = {
  user: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    email: string;
    role: string;
  };
};

type LecturerDashboardResponse = {
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
      totalStudents: number;
      totalModules: number;
      totalUnits: number;
      averageCourseProgress: number;
    };
    courses: Array<{
      id: string;
      title: string;
      slug: string;
      code: string | null;
      description: string | null;
      isPublished: boolean;
      totalStudents: number;
      totalModules: number;
      totalUnits: number;
      averageProgress: number;
      averageMastery: number | null;
      completedStudents: number;
      students: Array<{
        id: string;
        name: string;
        email: string;
        enrolledAt: string;
        progress: {
          completedModules: number;
          inProgressModules: number;
          totalModules: number;
          averageProgress: number;
        };
      }>;
    }>;
  };
};

export default function LecturerDashboardClient({
  user,
}: LecturerDashboardClientProps) {
  const [dashboard, setDashboard] = useState<
    LecturerDashboardResponse["data"] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/lecturers/${user.id}/dashboard`, {
          cache: "no-store",
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to fetch lecturer dashboard");
        }

        setDashboard(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, [user.id]);

  const topCourse = useMemo(() => {
    if (!dashboard || dashboard.courses.length === 0) return null;

    return [...dashboard.courses].sort(
      (a, b) => b.averageProgress - a.averageProgress,
    )[0];
  }, [dashboard]);

  if (loading) {
    return (
      <main className="space-y-6 p-6">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <p className="text-slate-300">Memuat dashboard dosen...</p>
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

  if (!dashboard) {
    return (
      <main className="space-y-6 p-6">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <p className="text-slate-300">Data dashboard dosen belum tersedia.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <section className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
              <GraduationCap size={16} />
              Dashboard Dosen
            </div>

            <h1 className="mt-5 break-words text-3xl font-semibold text-white sm:text-4xl">
              Halo, {dashboard.lecturer.name} 👋
            </h1>

            <p className="mt-4 max-w-3xl break-words text-slate-300">
              Kamu sedang mengampu {dashboard.summary.totalCourses} course
              dengan {dashboard.summary.totalStudents} mahasiswa aktif.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/lecturer/courses"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
              >
                Kelola Course
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5">
            <div className="text-sm font-semibold text-white">
              Course dengan progres tertinggi
            </div>
            <div className="mt-3">
              {topCourse ? (
                <>
                  <div className="text-lg font-semibold text-white">
                    {topCourse.title}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    {topCourse.code ?? "Tanpa kode"}
                  </div>
                  <div className="mt-4 h-2 w-full rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400"
                      style={{ width: `${topCourse.averageProgress}%` }}
                    />
                  </div>
                  <div className="mt-2 text-sm text-slate-300">
                    Rata-rata progres: {topCourse.averageProgress}%
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-400">
                  Belum ada course untuk ditampilkan.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-5">
        <StatCard
          icon={BookOpen}
          label="Total Course"
          value={dashboard.summary.totalCourses}
          subtitle="Course yang diampu"
        />
        <StatCard
          icon={Users}
          label="Total Mahasiswa"
          value={dashboard.summary.totalStudents}
          subtitle="Mahasiswa aktif"
        />
        <StatCard
          icon={Layers3}
          label="Total Modul"
          value={dashboard.summary.totalModules}
          subtitle="Modul pembelajaran"
        />
        <StatCard
          icon={CheckCircle2}
          label="Total Unit"
          value={dashboard.summary.totalUnits}
          subtitle="Micro-unit aktif"
        />
        <StatCard
          icon={GraduationCap}
          label="Avg Progress"
          value={dashboard.summary.averageCourseProgress}
          subtitle="Rata-rata progres"
          suffix="%"
        />
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-white">
            Course yang Diampu
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Ringkasan course, mahasiswa, dan progres pembelajaran
          </p>
        </div>

        {dashboard.courses.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-400">
            Belum ada course yang diampu.
          </div>
        ) : (
          <div className="grid gap-4">
            {dashboard.courses.map((course) => (
              <div
                key={course.id}
                className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
                      {course.code ?? "Tanpa kode"}
                    </div>

                    <h3 className="mt-3 break-words text-xl font-semibold text-white">
                      {course.title}
                    </h3>

                    <p className="mt-2 max-w-3xl break-words text-sm leading-7 text-slate-300">
                      {course.description ?? "Belum ada deskripsi course."}
                    </p>
                  </div>

                  <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                      <span>Rata-rata progres</span>
                      <span>{course.averageProgress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400"
                        style={{ width: `${course.averageProgress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  <MiniInfo
                    label="Mahasiswa"
                    value={`${course.totalStudents}`}
                  />
                  <MiniInfo label="Modul" value={`${course.totalModules}`} />
                  <MiniInfo label="Unit" value={`${course.totalUnits}`} />
                  <MiniInfo
                    label="Selesai"
                    value={`${course.completedStudents}/${course.totalStudents}`}
                  />
                </div>

                <div className="mt-5">
                  <details className="group rounded-2xl border border-white/10 bg-white/5 p-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                      <span className="text-sm font-medium text-white">
                        Lihat mahasiswa pada course ini
                      </span>
                      <ArrowRight
                        size={16}
                        className="transition group-open:rotate-90"
                      />
                    </summary>

                    <div className="mt-4 grid gap-3">
                      {course.students.length === 0 ? (
                        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">
                          Belum ada mahasiswa aktif pada course ini.
                        </div>
                      ) : (
                        course.students.map((student) => (
                          <div
                            key={student.id}
                            className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="break-words text-sm font-semibold text-white">
                                  {student.name}
                                </div>
                                <div className="mt-1 text-xs text-slate-400">
                                  {student.email}
                                </div>
                              </div>

                              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                                {student.progress.averageProgress}%
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                              <MiniInfo
                                label="Modul selesai"
                                value={`${student.progress.completedModules}/${student.progress.totalModules}`}
                              />
                              <MiniInfo
                                label="Sedang berjalan"
                                value={`${student.progress.inProgressModules}`}
                              />
                              <MiniInfo
                                label="Progress"
                                value={`${student.progress.averageProgress}%`}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </details>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/lecturer/courses/${course.slug}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white transition hover:bg-white/10"
                  >
                    Detail Course
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
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
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-slate-400">{label}</div>
          <div className="mt-2 text-3xl font-semibold text-white">
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

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-center">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
