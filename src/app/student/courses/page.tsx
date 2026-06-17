/** @format */

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { EnrollmentStatus, ProgressStatus } from "@/generated/prisma/client";
import { ArrowRight, BookOpen, PlayCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentCoursesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "STUDENT") {
    redirect("/login");
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: user.id,
      status: EnrollmentStatus.ACTIVE,
    },
    orderBy: {
      enrolledAt: "desc",
    },
    include: {
      course: {
        include: {
          lecturer: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          modules: {
            select: {
              id: true,
              progresses: {
                where: { userId: user.id },
                select: { status: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  const courses = enrollments.map((enrollment) => {
    const course = enrollment.course;
    const totalModules = course.modules.length;
    const completedModules = course.modules.filter(
      (module) => module.progresses[0]?.status === ProgressStatus.COMPLETED,
    ).length;
    const progress =
      totalModules > 0
        ? Math.round((completedModules / totalModules) * 100)
        : 0;

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      lecturer: course.lecturer
        ? `${course.lecturer.firstName} ${course.lecturer.lastName}`
        : null,
      totalModules,
      completedModules,
      progress,
    };
  });

  return (
    <div className="space-y-8">
      {/* Judul halaman */}
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Mata Kuliah Saya
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          Daftar kelas yang sedang Anda ikuti. Pilih satu untuk mulai belajar.
        </p>
      </header>

      {courses.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <BookOpen size={28} aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            Belum ada mata kuliah
          </h2>
          <p className="mx-auto mt-2 max-w-md text-base text-slate-600">
            Mata kuliah akan muncul di sini setelah dosen mendaftarkan Anda ke
            dalam kelas.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {courses.map((course) => {
            const done = course.progress >= 100;
            return (
              <article
                key={course.id}
                className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                    <BookOpen size={24} aria-hidden="true" />
                  </span>
                  <span
                    className={
                      done
                        ? "inline-flex items-center rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-700"
                        : "inline-flex items-center rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-700"
                    }
                  >
                    {done ? "Selesai" : "Sedang berjalan"}
                  </span>
                </div>

                <h2 className="mt-4 text-lg font-bold text-slate-900">
                  {course.title}
                </h2>
                {course.lecturer && (
                  <p className="mt-1 text-base text-slate-600">
                    Dosen: {course.lecturer}
                  </p>
                )}
                {course.description && (
                  <p className="mt-3 line-clamp-2 text-base leading-relaxed text-slate-600">
                    {course.description}
                  </p>
                )}

                {/* Progres */}
                <div className="mt-5">
                  <div className="mb-1.5 flex items-center justify-between text-base text-slate-600">
                    <span>
                      {course.completedModules} dari {course.totalModules} modul
                    </span>
                    <span className="font-semibold text-slate-900">
                      {course.progress}%
                    </span>
                  </div>
                  <div
                    className="h-3 w-full overflow-hidden rounded-full bg-slate-200"
                    role="progressbar"
                    aria-valuenow={course.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progres ${course.title}`}
                  >
                    <div
                      className="h-full rounded-full bg-teal-600 transition-all"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>

                {/* Aksi */}
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Link
                    href={`/student/courses/${course.slug}/learn`}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700"
                  >
                    <PlayCircle size={20} aria-hidden="true" />
                    {course.progress > 0 && !done
                      ? "Lanjut Belajar"
                      : "Mulai Belajar"}
                  </Link>
                  <Link
                    href={`/student/courses/${course.slug}`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Detail
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
