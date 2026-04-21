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
  ShieldCheck,
  Users,
  UserCog,
  FileText,
} from "lucide-react";

type AdminDashboardClientProps = {
  user: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    email: string;
    role: string;
  };
};

type AdminDashboardResponse = {
  success: boolean;
  message: string;
  data: {
    summary: {
      totalStudents: number;
      totalLecturers: number;
      totalAdmins: number;
      totalCourses: number;
      publishedCourses: number;
      unpublishedCourses: number;
      totalEnrollments: number;
      activeEnrollments: number;
      totalModules: number;
      publishedModules: number;
      totalUnits: number;
    };
    courses: Array<{
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
      totalEnrollments: number;
      totalModules: number;
      publishedModules: number;
      createdAt: string;
    }>;
    lecturers: Array<{
      id: string;
      name: string;
      email: string;
      totalCourses: number;
      createdAt: string;
    }>;
    students: Array<{
      id: string;
      name: string;
      email: string;
      activeEnrollments: number;
      createdAt: string;
    }>;
  };
};

export default function AdminDashboardClient({
  user,
}: AdminDashboardClientProps) {
  const [dashboard, setDashboard] = useState<
    AdminDashboardResponse["data"] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/admin/dashboard", {
          cache: "no-store",
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to fetch admin dashboard");
        }

        setDashboard(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  const topCourse = useMemo(() => {
    if (!dashboard || dashboard.courses.length === 0) return null;

    return [...dashboard.courses].sort(
      (a, b) => b.totalEnrollments - a.totalEnrollments,
    )[0];
  }, [dashboard]);

  if (loading) {
    return (
      <main className="space-y-6 p-6">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <p className="text-slate-300">Memuat dashboard admin...</p>
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
          <p className="text-slate-300">Data dashboard admin belum tersedia.</p>
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
              <ShieldCheck size={16} />
              Dashboard Admin
            </div>

            <h1 className="mt-5 break-words text-3xl font-semibold text-white sm:text-4xl">
              Halo,{" "}
              {user.name ?? `${user.firstName ?? ""} ${user.lastName ?? ""}`} 👋
            </h1>

            <p className="mt-4 max-w-3xl break-words text-slate-300">
              Monitor keseluruhan platform AI-CELM, mulai dari user, course,
              enrollment, hingga struktur pembelajaran.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/admin/users"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
              >
                Kelola User
                <ArrowRight size={16} />
              </Link>

              <Link
                href="/admin/courses"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white transition hover:bg-white/10"
              >
                Kelola Course
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5">
            <div className="text-sm font-semibold text-white">
              Course dengan peserta terbanyak
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
                  <div className="mt-3 text-sm text-slate-300">
                    {topCourse.totalEnrollments} mahasiswa aktif
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    Dosen: {topCourse.lecturer?.name ?? "-"}
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
          icon={Users}
          label="Mahasiswa"
          value={dashboard.summary.totalStudents}
          subtitle="Total akun mahasiswa"
        />
        <StatCard
          icon={GraduationCap}
          label="Dosen"
          value={dashboard.summary.totalLecturers}
          subtitle="Total akun dosen"
        />
        <StatCard
          icon={UserCog}
          label="Admin"
          value={dashboard.summary.totalAdmins}
          subtitle="Total akun admin"
        />
        <StatCard
          icon={BookOpen}
          label="Course"
          value={dashboard.summary.totalCourses}
          subtitle="Total mata kuliah"
        />
        <StatCard
          icon={Layers3}
          label="Modul"
          value={dashboard.summary.totalModules}
          subtitle="Total modul pembelajaran"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <StatCard
          icon={CheckCircle2}
          label="Course Published"
          value={dashboard.summary.publishedCourses}
          subtitle="Course aktif"
        />
        <StatCard
          icon={FileText}
          label="Course Draft"
          value={dashboard.summary.unpublishedCourses}
          subtitle="Belum dipublish"
        />
        <StatCard
          icon={Users}
          label="Enrollment Aktif"
          value={dashboard.summary.activeEnrollments}
          subtitle="Peserta aktif"
        />
        <StatCard
          icon={Layers3}
          label="Unit"
          value={dashboard.summary.totalUnits}
          subtitle="Total micro-unit"
        />
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">Course Terbaru</h2>
            <p className="mt-1 text-sm text-slate-400">
              Ringkasan course, dosen, dan status publikasi
            </p>
          </div>

          <div className="grid gap-4">
            {dashboard.courses.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-400">
                Belum ada course.
              </div>
            ) : (
              dashboard.courses.map((course) => (
                <div
                  key={course.id}
                  className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        {course.code ?? "Tanpa kode"}
                      </div>
                      <h3 className="mt-1 break-words text-lg font-semibold text-white">
                        {course.title}
                      </h3>
                      <p className="mt-2 break-words text-sm leading-7 text-slate-300">
                        {course.description ?? "Belum ada deskripsi course."}
                      </p>
                    </div>

                    <div
                      className={`rounded-full border px-3 py-1 text-xs ${
                        course.isPublished
                          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                          : "border-amber-400/20 bg-amber-400/10 text-amber-300"
                      }`}
                    >
                      {course.isPublished ? "Published" : "Draft"}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-4">
                    <MiniInfo
                      label="Dosen"
                      value={course.lecturer?.name ?? "-"}
                    />
                    <MiniInfo
                      label="Mahasiswa"
                      value={`${course.totalEnrollments}`}
                    />
                    <MiniInfo label="Modul" value={`${course.totalModules}`} />
                    <MiniInfo
                      label="Published Modul"
                      value={`${course.publishedModules}`}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="grid gap-6">
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">
                Dosen Terbaru
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Daftar dosen yang terdaftar di sistem
              </p>
            </div>

            <div className="grid gap-3">
              {dashboard.lecturers.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-400">
                  Belum ada dosen.
                </div>
              ) : (
                dashboard.lecturers.map((lecturer) => (
                  <div
                    key={lecturer.id}
                    className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"
                  >
                    <div className="break-words text-sm font-semibold text-white">
                      {lecturer.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {lecturer.email}
                    </div>
                    <div className="mt-3 text-sm text-slate-300">
                      {lecturer.totalCourses} course diampu
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">
                Mahasiswa Terbaru
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Ringkasan mahasiswa yang terdaftar
              </p>
            </div>

            <div className="grid gap-3">
              {dashboard.students.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-400">
                  Belum ada mahasiswa.
                </div>
              ) : (
                dashboard.students.map((student) => (
                  <div
                    key={student.id}
                    className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"
                  >
                    <div className="break-words text-sm font-semibold text-white">
                      {student.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {student.email}
                    </div>
                    <div className="mt-3 text-sm text-slate-300">
                      {student.activeEnrollments} enrollment aktif
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
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
