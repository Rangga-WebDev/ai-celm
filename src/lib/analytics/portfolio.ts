/** @format */

import {
  EnrollmentStatus,
  ModuleStatus,
  ProgressStatus,
  SubmissionStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type PortfolioCourse = {
  id: string;
  title: string;
  slug: string;
  progressPercent: number;
  completedModules: number;
  totalModules: number;
};

export type PortfolioData = {
  student: {
    id: string;
    firstName: string;
    lastName: string;
  };
  courses: PortfolioCourse[];
  quizzes: {
    attempts: number;
    passed: number;
    averagePercent: number | null;
  };
  cer: {
    submitted: number;
    graded: number;
    averageScore: number | null;
    items: Array<{
      title: string;
      courseTitle: string;
      status: string;
      score: number | null;
    }>;
  };
  projects: {
    submitted: number;
    graded: number;
    titles: string[];
    items: Array<{
      title: string;
      courseTitle: string;
      status: string;
      score: number | null;
    }>;
  };
  reflections: string[];
};

const GRADED_STATUSES: SubmissionStatus[] = [
  SubmissionStatus.GRADED,
  SubmissionStatus.APPROVED,
];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sum = values.reduce((acc, v) => acc + v, 0);
  return round2(sum / values.length);
}

/**
 * Mengagregasi seluruh capaian belajar mahasiswa untuk portofolio.
 * Bersifat read-only dan tidak mengubah data apa pun.
 */
export async function aggregateStudentPortfolio(
  studentId: string,
): Promise<PortfolioData | null> {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, firstName: true, lastName: true },
  });

  if (!student) {
    return null;
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: studentId,
      status: {
        in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED],
      },
    },
    select: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          modules: {
            where: { status: ModuleStatus.PUBLISHED },
            select: { id: true },
          },
        },
      },
    },
  });

  const courses = enrollments
    .map((e) => e.course)
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const courseIds = courses.map((c) => c.id);

  const moduleProgresses = courseIds.length
    ? await prisma.moduleProgress.findMany({
        where: {
          userId: studentId,
          module: { courseId: { in: courseIds } },
        },
        select: {
          progressPercent: true,
          status: true,
          module: { select: { courseId: true } },
        },
      })
    : [];

  const portfolioCourses: PortfolioCourse[] = courses.map((course) => {
    const totalModules = course.modules.length;
    const progresses = moduleProgresses.filter(
      (p) => p.module.courseId === course.id,
    );
    const completedModules = progresses.filter(
      (p) => p.status === ProgressStatus.COMPLETED,
    ).length;
    const progressPercent =
      totalModules > 0
        ? Math.round((completedModules / totalModules) * 100)
        : 0;

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      progressPercent,
      completedModules,
      totalModules,
    };
  });

  // Kuis
  const quizAttempts = await prisma.quizAttempt.findMany({
    where: {
      studentId,
      submittedAt: { not: null },
    },
    select: { percentage: true, isPassed: true },
  });

  const quizPercents = quizAttempts
    .map((a) => a.percentage)
    .filter((p): p is number => p !== null);

  // CER
  const cerSubmissions = await prisma.cerSubmission.findMany({
    where: { studentId },
    select: {
      status: true,
      score: true,
      assignment: {
        select: {
          title: true,
          course: { select: { title: true } },
        },
      },
    },
  });

  const cerSubmitted = cerSubmissions.filter(
    (s) => s.status !== SubmissionStatus.DRAFT,
  );
  const cerGraded = cerSubmissions.filter((s) =>
    GRADED_STATUSES.includes(s.status),
  );
  const cerScores = cerGraded
    .map((s) => s.score)
    .filter((v): v is number => v !== null);

  // Proyek
  const projectSubmissions = await prisma.projectSubmission.findMany({
    where: { studentId },
    select: {
      status: true,
      score: true,
      title: true,
      reflection: true,
      project: { select: { title: true } },
    },
  });

  const projectSubmitted = projectSubmissions.filter(
    (s) => s.status !== SubmissionStatus.DRAFT,
  );
  const projectGraded = projectSubmissions.filter((s) =>
    GRADED_STATUSES.includes(s.status),
  );

  const reflections = projectSubmissions
    .map((s) => s.reflection?.trim())
    .filter((r): r is string => Boolean(r));

  return {
    student,
    courses: portfolioCourses,
    quizzes: {
      attempts: quizAttempts.length,
      passed: quizAttempts.filter((a) => a.isPassed).length,
      averagePercent: average(quizPercents),
    },
    cer: {
      submitted: cerSubmitted.length,
      graded: cerGraded.length,
      averageScore: average(cerScores),
      items: cerSubmissions.map((s) => ({
        title: s.assignment.title,
        courseTitle: s.assignment.course?.title ?? "-",
        status: s.status,
        score: s.score,
      })),
    },
    projects: {
      submitted: projectSubmitted.length,
      graded: projectGraded.length,
      titles: projectSubmissions
        .map((s) => s.project?.title ?? s.title ?? "")
        .filter(Boolean),
      items: projectSubmissions.map((s) => ({
        title: s.project?.title ?? s.title ?? "Proyek",
        courseTitle: "-",
        status: s.status,
        score: s.score,
      })),
    },
    reflections,
  };
}
