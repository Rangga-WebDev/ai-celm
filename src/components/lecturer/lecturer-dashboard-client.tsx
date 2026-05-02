"use client";

/** @format */

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  LayoutDashboard,
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
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-400/10 px-4 py-2 text-sm text-teal-200">
                <LayoutDashboard size={16} />
                Dashboard Dosen
              </div>

              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Selamat datang, {lecturerName}
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Kelola course, modul pembelajaran, resource materi, serta pantau
                aktivitas mahasiswa dalam platform AI-CELM.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
              <div className="text-sm text-slate-400">Role Aktif</div>
              <div className="mt-2 text-xl font-semibold text-teal-300">
                {user.role}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardStatCard
            icon={<BookOpen size={20} />}
            label="Course Diampu"
            value={totalCourses}
            description="Jumlah course yang terhubung dengan akun dosen."
          />

          <DashboardStatCard
            icon={<Users size={20} />}
            label="Mahasiswa"
            value={totalStudents}
            description="Total mahasiswa yang terdaftar pada course dosen."
          />

          <DashboardStatCard
            icon={<ClipboardList size={20} />}
            label="Modul"
            value={totalModules}
            description="Total modul pembelajaran yang tersedia."
          />

          <DashboardStatCard
            icon={<FileText size={20} />}
            label="Resource"
            value={totalResources}
            description="Total materi atau file pendukung pada course."
          />
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-400/10 px-4 py-2 text-sm text-teal-200">
                <BookOpen size={16} />
                Course yang Diampu
              </div>

              <h2 className="mt-5 text-2xl font-semibold text-white">
                Kelola Modul Pembelajaran
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
                Dosen dapat menambahkan, mengedit, menghapus, dan
                mempublikasikan modul pembelajaran serta menambahkan resource
                seperti PDF, Word, slide, video, atau link materi.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {courses.length === 0 ? (
              <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-6 text-sm text-slate-400">
                Belum ada course yang ditugaskan kepada akun dosen ini.
              </div>
            ) : (
              courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))
            )}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
              <BarChart3 size={16} />
              Monitoring Pembelajaran
            </div>

            <h2 className="mt-5 text-xl font-semibold text-white">
              Pantau perkembangan kelas
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-300">
              Gunakan dashboard course untuk melihat progres mahasiswa, modul
              yang aktif, serta resource yang sudah tersedia dalam pembelajaran.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-4 py-2 text-sm text-violet-200">
              <CheckCircle2 size={16} />
              Status Fitur
            </div>

            <h2 className="mt-5 text-xl font-semibold text-white">
              Module management aktif
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-300">
              Dosen sudah dapat masuk ke halaman Kelola Modul untuk menambahkan
              modul dan resource berbasis URL. Fitur upload file langsung dapat
              ditambahkan pada tahap berikutnya melalui Supabase Storage.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function DashboardStatCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-2xl bg-teal-400/10 p-3 text-teal-300">
          {icon}
        </div>

        <div className="text-right">
          <div className="text-3xl font-semibold text-white">{value}</div>
          <div className="mt-1 text-sm text-slate-400">{label}</div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function CourseCard({ course }: { course: LecturerCourseSummary }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            {course.code ? (
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                {course.code}
              </span>
            ) : null}

            <span
              className={`rounded-full px-3 py-1 text-xs ${
                course.isPublished
                  ? "bg-teal-400/10 text-teal-300"
                  : "bg-amber-400/10 text-amber-300"
              }`}
            >
              {course.isPublished ? "Published" : "Draft"}
            </span>
          </div>

          <h3 className="mt-3 text-xl font-semibold text-white">
            {course.title}
          </h3>

          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
            {course.description ?? "Belum ada deskripsi course."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1">
              <Users size={13} />
              {course.enrollmentCount} mahasiswa
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1">
              <BookOpen size={13} />
              {course.moduleCount} modul
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1">
              <FileText size={13} />
              {course.resourceCount} resource
            </span>
          </div>

          {course.modules.length > 0 ? (
            <div className="mt-5 grid gap-2">
              {course.modules.map((courseModule) => (
                <div
                  key={courseModule.id}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {courseModule.order}. {courseModule.title}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        {courseModule.status} • {courseModule.unitCount} unit •{" "}
                        {courseModule.resourceCount} resource
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
              Belum ada modul pada course ini.
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={`/lecturer/courses/${course.slug}`}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white transition hover:bg-white/10"
          >
            Detail Course
          </Link>

          <Link
            href={`/lecturer/courses/${course.slug}/modules`}
            className="inline-flex items-center gap-2 rounded-2xl bg-teal-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-teal-300"
          >
            Kelola Modul
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}