/** @format */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  GraduationCap,
  LibraryBig,
  ShieldCheck,
  UserCog,
  Users,
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
          throw new Error(json.message || "Gagal memuat dasbor admin");
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

  const adminName =
    user.name ?? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
        Memuat dasbor admin...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-base text-rose-700">
        Terjadi kesalahan: {error}
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
        Data belum tersedia.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sambutan */}
      <section className="overflow-hidden rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium">
          <ShieldCheck size={16} aria-hidden="true" />
          Ruang Admin
        </div>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          Halo, {adminName || "Admin"}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-teal-50">
          Pantau seluruh platform: pengguna, mata kuliah, dan pendaftaran kelas.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-base font-semibold text-teal-700 transition hover:bg-teal-50"
          >
            Kelola Pengguna
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            href="/admin/courses"
            className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-base font-semibold text-white transition hover:bg-white/25"
          >
            Kelola Mata Kuliah
          </Link>
        </div>
      </section>

      {/* Ringkasan angka */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Mahasiswa"
          value={dashboard.summary.totalStudents}
        />
        <StatCard
          icon={GraduationCap}
          label="Dosen"
          value={dashboard.summary.totalLecturers}
        />
        <StatCard
          icon={BookOpen}
          label="Mata Kuliah"
          value={dashboard.summary.totalCourses}
        />
        <StatCard
          icon={LibraryBig}
          label="Modul"
          value={dashboard.summary.totalModules}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CheckCircle2}
          label="Mata Kuliah Terbit"
          value={dashboard.summary.publishedCourses}
        />
        <StatCard
          icon={FileText}
          label="Mata Kuliah Draf"
          value={dashboard.summary.unpublishedCourses}
        />
        <StatCard
          icon={Users}
          label="Pendaftaran Aktif"
          value={dashboard.summary.activeEnrollments}
        />
        <StatCard
          icon={UserCog}
          label="Admin"
          value={dashboard.summary.totalAdmins}
        />
      </section>

      {/* Mata kuliah terbaru */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-900">
          Mata Kuliah Terbaru
        </h2>
        <p className="mt-1 text-base text-slate-600">
          Ringkasan mata kuliah, dosen pengampu, dan status terbit.
        </p>

        <div className="mt-5 grid gap-4">
          {dashboard.courses.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base text-slate-600">
              Belum ada mata kuliah.
            </div>
          ) : (
            dashboard.courses.map((course) => (
              <div
                key={course.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {course.code ?? "Tanpa kode"}
                    </div>
                    <h3 className="mt-1 text-lg font-bold text-slate-900">
                      {course.title}
                    </h3>
                    <p className="mt-1.5 max-w-2xl text-base leading-7 text-slate-600">
                      {course.description ?? "Belum ada deskripsi."}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      course.isPublished
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {course.isPublished ? "Terbit" : "Draf"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                    label="Modul Terbit"
                    value={`${course.publishedModules}`}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Dosen & mahasiswa terbaru */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900">Dosen Terbaru</h2>
          <div className="mt-4 grid gap-3">
            {dashboard.lecturers.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base text-slate-600">
                Belum ada dosen.
              </div>
            ) : (
              dashboard.lecturers.map((lecturer) => (
                <div
                  key={lecturer.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="text-base font-semibold text-slate-900">
                    {lecturer.name}
                  </div>
                  <div className="mt-0.5 truncate text-sm text-slate-500">
                    {lecturer.email}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    {lecturer.totalCourses} mata kuliah diampu
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900">
            Mahasiswa Terbaru
          </h2>
          <div className="mt-4 grid gap-3">
            {dashboard.students.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base text-slate-600">
                Belum ada mahasiswa.
              </div>
            ) : (
              dashboard.students.map((student) => (
                <div
                  key={student.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="text-base font-semibold text-slate-900">
                    {student.name}
                  </div>
                  <div className="mt-0.5 truncate text-sm text-slate-500">
                    {student.email}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    {student.activeEnrollments} pendaftaran aktif
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
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
      <div className="truncate text-base font-bold text-slate-900">{value}</div>
      <div className="mt-0.5 text-xs text-slate-500">{label}</div>
    </div>
  );
}
