/** @format */

import { NextRequest, NextResponse } from "next/server";
import {
  CerAssignmentStatus,
  EnrollmentStatus,
  ModuleStatus,
  QuizStatus,
  Role,
  SubmissionStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { computeRisk } from "@/lib/analytics/student-risk";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
  }>;
};

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 },
      );
    }

    const course = await prisma.course.findFirst({
      where: { slug, lecturerId: userId },
      select: { id: true, title: true, code: true },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, message: "Mata kuliah tidak ditemukan." },
        { status: 404 },
      );
    }

    // Struktur kelas: modul terbit, kuis terbit, tugas argumentasi aktif.
    const modules = await prisma.module.findMany({
      where: { courseId: course.id, status: ModuleStatus.PUBLISHED },
      select: { id: true },
    });
    const moduleIds = modules.map((m) => m.id);

    const quizzes = await prisma.quiz.findMany({
      where: {
        status: QuizStatus.PUBLISHED,
        module: { courseId: course.id },
      },
      select: { id: true },
    });
    const quizIds = quizzes.map((q) => q.id);

    const assignments = await prisma.cerAssignment.findMany({
      where: { courseId: course.id, status: CerAssignmentStatus.ACTIVE },
      select: { id: true },
    });
    const assignmentIds = assignments.map((a) => a.id);

    // Mahasiswa terdaftar aktif.
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: course.id, status: EnrollmentStatus.ACTIVE },
      select: {
        enrolledAt: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    const studentIds = enrollments.map((e) => e.user.id);

    if (studentIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          course,
          summary: { total: 0, high: 0, medium: 0, low: 0 },
          students: [],
        },
      });
    }

    // Ambil semua sinyal dalam beberapa kueri lalu kelompokkan per mahasiswa.
    const [moduleProgresses, quizAttempts, cerSubmissions] = await Promise.all([
      moduleIds.length > 0
        ? prisma.moduleProgress.findMany({
            where: { userId: { in: studentIds }, moduleId: { in: moduleIds } },
            select: {
              userId: true,
              progressPercent: true,
              lastAccessedAt: true,
            },
          })
        : Promise.resolve([]),
      quizIds.length > 0
        ? prisma.quizAttempt.findMany({
            where: {
              studentId: { in: studentIds },
              quizId: { in: quizIds },
              submittedAt: { not: null },
            },
            select: {
              studentId: true,
              quizId: true,
              percentage: true,
              submittedAt: true,
            },
          })
        : Promise.resolve([]),
      assignmentIds.length > 0
        ? prisma.cerSubmission.findMany({
            where: {
              studentId: { in: studentIds },
              assignmentId: { in: assignmentIds },
            },
            select: {
              studentId: true,
              assignmentId: true,
              status: true,
            },
          })
        : Promise.resolve([]),
    ]);

    // Indeks per mahasiswa.
    const progressByStudent = new Map<
      string,
      { percents: number[]; lastActive: Date | null }
    >();
    for (const mp of moduleProgresses) {
      const entry = progressByStudent.get(mp.userId) ?? {
        percents: [],
        lastActive: null,
      };
      entry.percents.push(mp.progressPercent);
      if (mp.lastAccessedAt) {
        if (!entry.lastActive || mp.lastAccessedAt > entry.lastActive) {
          entry.lastActive = mp.lastAccessedAt;
        }
      }
      progressByStudent.set(mp.userId, entry);
    }

    // Nilai kuis terbaik per (mahasiswa, kuis).
    const bestQuizByStudent = new Map<string, Map<string, number>>();
    for (const qa of quizAttempts) {
      const pct = qa.percentage ?? 0;
      const perQuiz =
        bestQuizByStudent.get(qa.studentId) ?? new Map<string, number>();
      const prev = perQuiz.get(qa.quizId);
      if (prev === undefined || pct > prev) {
        perQuiz.set(qa.quizId, pct);
      }
      bestQuizByStudent.set(qa.studentId, perQuiz);
    }

    // Tugas yang sudah dikumpulkan (dianggap selesai bila bukan DRAFT/REVISION_REQUIRED).
    const submittedTasksByStudent = new Map<string, Set<string>>();
    for (const sub of cerSubmissions) {
      const isDone =
        sub.status !== SubmissionStatus.DRAFT &&
        sub.status !== SubmissionStatus.REVISION_REQUIRED;
      if (isDone) {
        const set =
          submittedTasksByStudent.get(sub.studentId) ?? new Set<string>();
        set.add(sub.assignmentId);
        submittedTasksByStudent.set(sub.studentId, set);
      }
    }

    const now = new Date();
    const totalModules = moduleIds.length;
    const totalQuizzes = quizIds.length;
    const totalTasks = assignmentIds.length;

    const students = enrollments.map((enr) => {
      const student = enr.user;
      const prog = progressByStudent.get(student.id);

      // Rata-rata progres dihitung atas SEMUA modul terbit (modul tanpa record = 0%).
      let avgProgressPercent: number | null = null;
      if (totalModules > 0) {
        const sum = (prog?.percents ?? []).reduce((a, b) => a + b, 0);
        avgProgressPercent = sum / totalModules;
      }

      const lastActive = prog?.lastActive ?? null;
      const daysSinceLastActive = lastActive
        ? daysBetween(lastActive, now)
        : null;

      const perQuiz = bestQuizByStudent.get(student.id);
      const attemptedQuizzes = perQuiz ? perQuiz.size : 0;
      let avgQuizPercent: number | null = null;
      if (perQuiz && perQuiz.size > 0) {
        const vals = Array.from(perQuiz.values());
        avgQuizPercent = vals.reduce((a, b) => a + b, 0) / vals.length;
      }

      const submitted = submittedTasksByStudent.get(student.id);
      const submittedCount = submitted ? submitted.size : 0;
      const pendingTasks = Math.max(0, totalTasks - submittedCount);

      const risk = computeRisk({
        avgProgressPercent,
        daysSinceLastActive,
        avgQuizPercent,
        totalQuizzes,
        attemptedQuizzes,
        pendingTasks,
        totalTasks,
      });

      return {
        id: student.id,
        name:
          `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() ||
          student.email,
        email: student.email,
        riskLevel: risk.level,
        riskScore: risk.score,
        reasons: risk.reasons,
        metrics: {
          avgProgressPercent:
            avgProgressPercent === null ? null : Math.round(avgProgressPercent),
          daysSinceLastActive,
          avgQuizPercent:
            avgQuizPercent === null ? null : Math.round(avgQuizPercent),
          attemptedQuizzes,
          totalQuizzes,
          pendingTasks,
          totalTasks,
        },
      };
    });

    // Urutkan: risiko tertinggi dulu.
    students.sort((a, b) => b.riskScore - a.riskScore);

    const summary = {
      total: students.length,
      high: students.filter((s) => s.riskLevel === "HIGH").length,
      medium: students.filter((s) => s.riskLevel === "MEDIUM").length,
      low: students.filter((s) => s.riskLevel === "LOW").length,
    };

    return NextResponse.json({
      success: true,
      data: { course, summary, students },
    });
  } catch (error) {
    console.error("GET at-risk error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat data mahasiswa berisiko." },
      { status: 500 },
    );
  }
}
