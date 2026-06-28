/** @format */

import { prisma } from "@/lib/prisma";
import { GradeSource, LetterGrade } from "@/generated/prisma/client";
import { toLetterGrade } from "@/lib/grades/letter";

export type ComponentBreakdown = {
  componentId: string;
  name: string;
  source: GradeSource;
  weight: number;
  maxScore: number;
  raw: number | null;
  hasData: boolean;
};

export type StudentGradeRow = {
  studentId: string;
  name: string;
  email: string;
  components: ComponentBreakdown[];
  numericScore: number | null;
  letterGrade: LetterGrade | null;
  isFinalized: boolean;
  finalizedAt: Date | null;
};

export type GradebookResult = {
  components: Array<{
    id: string;
    name: string;
    source: GradeSource;
    weight: number;
    maxScore: number;
    order: number;
  }>;
  totalWeight: number;
  rows: StudentGradeRow[];
};

function clampPercentage(value: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  const pct = (value / maxScore) * 100;
  if (Number.isNaN(pct)) return 0;
  return Math.max(0, Math.min(100, pct));
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
}

/**
 * Compute the full gradebook for a course: per-student, per-component scores
 * and a weighted final numeric/letter grade.
 *
 * Auto sources (QUIZ/CER/PROJECT) are averaged from existing submissions.
 * MANUAL/PARTICIPATION components read from stored ComponentScore entries.
 */
export async function computeGradebook(
  courseId: string,
): Promise<GradebookResult> {
  const [components, enrollments, course] = await Promise.all([
    prisma.gradeComponent.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
    }),
    prisma.enrollment.findMany({
      where: { courseId, status: { in: ["ACTIVE", "COMPLETED"] } },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    }),
    prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    }),
  ]);

  if (!course) {
    return { components: [], totalWeight: 0, rows: [] };
  }

  const studentIds = enrollments.map((e) => e.userId);
  const usedSources = new Set(components.map((c) => c.source));

  // --- Manual / participation scores ---
  const manualScores =
    components.length > 0
      ? await prisma.componentScore.findMany({
          where: { componentId: { in: components.map((c) => c.id) } },
        })
      : [];
  const manualMap = new Map<string, number>(); // `${componentId}:${studentId}` -> score
  for (const s of manualScores) {
    manualMap.set(`${s.componentId}:${s.studentId}`, s.score);
  }

  // --- QUIZ source: best attempt per quiz, averaged across course quizzes ---
  const quizAvgByStudent = new Map<string, number | null>();
  if (usedSources.has(GradeSource.QUIZ) && studentIds.length > 0) {
    const quizzes = await prisma.quiz.findMany({
      where: { module: { courseId }, status: "PUBLISHED" },
      select: { id: true },
    });
    const quizIds = quizzes.map((q) => q.id);
    if (quizIds.length > 0) {
      const attempts = await prisma.quizAttempt.findMany({
        where: {
          quizId: { in: quizIds },
          studentId: { in: studentIds },
          submittedAt: { not: null },
        },
        select: { quizId: true, studentId: true, percentage: true },
      });
      // best percentage per (student, quiz)
      const bestByStudentQuiz = new Map<string, number>();
      for (const a of attempts) {
        const key = `${a.studentId}:${a.quizId}`;
        const pct = a.percentage ?? 0;
        const prev = bestByStudentQuiz.get(key);
        if (prev === undefined || pct > prev) bestByStudentQuiz.set(key, pct);
      }
      for (const studentId of studentIds) {
        const perQuiz: number[] = quizIds.map(
          (quizId) => bestByStudentQuiz.get(`${studentId}:${quizId}`) ?? 0,
        );
        quizAvgByStudent.set(studentId, average(perQuiz));
      }
    }
  }

  // --- CER source ---
  const cerAvgByStudent = new Map<string, number | null>();
  if (usedSources.has(GradeSource.CER) && studentIds.length > 0) {
    const assignments = await prisma.cerAssignment.findMany({
      where: { courseId, status: { in: ["ACTIVE", "CLOSED"] } },
      select: { id: true },
    });
    const assignmentIds = assignments.map((a) => a.id);
    if (assignmentIds.length > 0) {
      const submissions = await prisma.cerSubmission.findMany({
        where: {
          assignmentId: { in: assignmentIds },
          studentId: { in: studentIds },
        },
        select: {
          assignmentId: true,
          studentId: true,
          score: true,
          status: true,
        },
      });
      const scoreMap = new Map<string, number>();
      for (const s of submissions) {
        if (
          s.score !== null &&
          (s.status === "GRADED" || s.status === "APPROVED")
        ) {
          scoreMap.set(
            `${s.studentId}:${s.assignmentId}`,
            Math.max(0, Math.min(100, s.score)),
          );
        }
      }
      for (const studentId of studentIds) {
        const perAssignment = assignmentIds.map(
          (id) => scoreMap.get(`${studentId}:${id}`) ?? 0,
        );
        cerAvgByStudent.set(studentId, average(perAssignment));
      }
    }
  }

  // --- PROJECT source ---
  const projectAvgByStudent = new Map<string, number | null>();
  if (usedSources.has(GradeSource.PROJECT) && studentIds.length > 0) {
    const projects = await prisma.civicActionProject.findMany({
      where: { courseId, status: { in: ["ACTIVE", "CLOSED"] } },
      select: { id: true },
    });
    const projectIds = projects.map((p) => p.id);
    if (projectIds.length > 0) {
      const submissions = await prisma.projectSubmission.findMany({
        where: { projectId: { in: projectIds }, studentId: { in: studentIds } },
        select: { projectId: true, studentId: true, score: true, status: true },
      });
      const scoreMap = new Map<string, number>();
      for (const s of submissions) {
        if (
          s.score !== null &&
          (s.status === "GRADED" || s.status === "APPROVED")
        ) {
          scoreMap.set(
            `${s.studentId}:${s.projectId}`,
            Math.max(0, Math.min(100, s.score)),
          );
        }
      }
      for (const studentId of studentIds) {
        const perProject = projectIds.map(
          (id) => scoreMap.get(`${studentId}:${id}`) ?? 0,
        );
        projectAvgByStudent.set(studentId, average(perProject));
      }
    }
  }

  // --- Existing finalized grades ---
  const courseGrades = await prisma.courseGrade.findMany({
    where: { courseId },
  });
  const courseGradeMap = new Map(courseGrades.map((g) => [g.studentId, g]));

  const totalWeight = components.reduce((acc, c) => acc + c.weight, 0);

  const rows: StudentGradeRow[] = enrollments.map((enrollment) => {
    const studentId = enrollment.userId;
    const breakdown: ComponentBreakdown[] = components.map((component) => {
      let raw: number | null = null;
      let hasData = false;

      switch (component.source) {
        case GradeSource.QUIZ: {
          const v = quizAvgByStudent.get(studentId) ?? null;
          raw = v;
          hasData = v !== null;
          break;
        }
        case GradeSource.CER: {
          const v = cerAvgByStudent.get(studentId) ?? null;
          raw = v;
          hasData = v !== null;
          break;
        }
        case GradeSource.PROJECT: {
          const v = projectAvgByStudent.get(studentId) ?? null;
          raw = v;
          hasData = v !== null;
          break;
        }
        case GradeSource.PARTICIPATION:
        case GradeSource.MANUAL:
        default: {
          const stored = manualMap.get(`${component.id}:${studentId}`);
          if (stored !== undefined) {
            raw = clampPercentage(stored, component.maxScore);
            hasData = true;
          }
          break;
        }
      }

      return {
        componentId: component.id,
        name: component.name,
        source: component.source,
        weight: component.weight,
        maxScore: component.maxScore,
        raw,
        hasData,
      };
    });

    let numericScore: number | null = null;
    if (totalWeight > 0) {
      const weightedSum = breakdown.reduce(
        (acc, b) => acc + (b.raw ?? 0) * b.weight,
        0,
      );
      numericScore = Math.round((weightedSum / totalWeight) * 100) / 100;
    }

    const existing = courseGradeMap.get(studentId);
    const letterGrade = existing?.isFinalized
      ? existing.letterGrade
      : toLetterGrade(numericScore);

    return {
      studentId,
      name: `${enrollment.user.firstName} ${enrollment.user.lastName}`.trim(),
      email: enrollment.user.email,
      components: breakdown,
      numericScore: existing?.isFinalized
        ? existing.numericScore
        : numericScore,
      letterGrade,
      isFinalized: existing?.isFinalized ?? false,
      finalizedAt: existing?.finalizedAt ?? null,
    };
  });

  rows.sort((a, b) => a.name.localeCompare(b.name));

  return {
    components: components.map((c) => ({
      id: c.id,
      name: c.name,
      source: c.source,
      weight: c.weight,
      maxScore: c.maxScore,
      order: c.order,
    })),
    totalWeight,
    rows,
  };
}
