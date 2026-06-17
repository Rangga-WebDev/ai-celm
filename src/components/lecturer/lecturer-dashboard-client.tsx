/** @format */

"use client";

/** @format */

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  FileText,
  LibraryBig,
  MessageSquareMore,
  Target,
  Users,
} from "lucide-react";

type LecturerUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: string;
};

type LecturerCourseSummary = {
  id: string;
  title: string;
  slug: string;
  code: string | null;
  description: string | null;
  isPublished: boolean;
  enrollmentCount: number;
  moduleCount: number;
  resourceCount: number;
  modules: {
    id: string;
    title: string;
    slug: string;
    status: string;
    order: number;
    unitCount: number;
    resourceCount: number;
  }[];
};

type Props = {
  user: LecturerUser;
  courses: LecturerCourseSummary[];
};

export default function LecturerDashboardClient({ user, courses }: Props) {
  const lecturerName =
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;

  const totalCourses = courses.length;
  const totalStudents = courses.reduce(
    (sum, course) => sum + course.enrollmentCount,
    0,
  );
  const totalModules = courses.reduce(
    (sum, course) => sum + course.moduleCount,
    0,
  );
  const totalResources = courses.reduce(
    (sum, course) => sum + course.resourceCount,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Sambutan */}
      <section className="overflow-hidden rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
        <div className="text-sm font-medium text-teal-50">Selamat datang,</div>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{lecturerName}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-teal-50">
          Kelola mata kuliah, modul, dan bahan belajar PKn SD. Pantau aktivitas
          mahasiswa dari satu tempat.
        </p>
      </section>

      {/* Ringkasan angka */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<BookOpen size={22} aria-hidden="true" />}
          label="Mata Kuliah"
          value={totalCourses}
        />
        <StatCard
          icon={<Users size={22} aria-hidden="true" />}
          label="Mahasiswa"
          value={totalStudents}
        />
        <StatCard
          icon={<LibraryBig size={22} aria-hidden="true" />}
          label="Modul"
          value={totalModules}
        />
        <StatCard
          icon={<FileText size={22} aria-hidden="true" />}
          label="Bahan Belajar"
          value={totalResources}
        />
      </section>

      {/* Daftar mata kuliah */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">
            Mata Kuliah yang Diampu
          </h2>
          <Link
            href="/lecturer/courses"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800"
          >
            Lihat semua
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-4">
          {courses.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
              Belum ada mata kuliah yang ditugaskan ke akun Anda.
            </div>
          ) : (
            courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-900">{value}</div>
          <div className="text-sm text-slate-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

function CourseCard({ course }: { course: LecturerCourseSummary }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            {course.code ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {course.code}
              </span>
            ) : null}
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

          <h3 className="mt-3 text-lg font-bold text-slate-900">
            {course.title}
          </h3>

          <p className="mt-1.5 max-w-2xl text-base leading-7 text-slate-600">
            {course.description ?? "Belum ada deskripsi mata kuliah."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1">
              <Users size={14} aria-hidden="true" />
              {course.enrollmentCount} mahasiswa
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1">
              <LibraryBig size={14} aria-hidden="true" />
              {course.moduleCount} modul
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1">
              <FileText size={14} aria-hidden="true" />
              {course.resourceCount} bahan
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:min-w-48">
          <Link
            href={`/lecturer/courses/${course.slug}`}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-teal-700"
          >
            Buka Kelas
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            href={`/lecturer/courses/${course.slug}/modules`}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <LibraryBig size={16} aria-hidden="true" />
            Kelola Modul
          </Link>

          <div className="grid grid-cols-3 gap-2">
            <QuickIconLink
              href={`/lecturer/courses/${course.slug}/resources`}
              label="Bahan Belajar"
              icon={FileText}
            />
            <QuickIconLink
              href={`/lecturer/courses/${course.slug}/cer`}
              label="Tugas Argumentasi"
              icon={ClipboardCheck}
            />
            <QuickIconLink
              href={`/lecturer/courses/${course.slug}/forums`}
              label="Forum Diskusi"
              icon={MessageSquareMore}
            />
            <QuickIconLink
              href={`/lecturer/courses/${course.slug}/projects`}
              label="Project Aksi"
              icon={Target}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickIconLink({
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
      title={label}
      aria-label={label}
      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-3 py-2.5 text-teal-700 transition hover:bg-teal-50"
    >
      <Icon size={18} aria-hidden={true} />
    </Link>
  );
}
