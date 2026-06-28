/** @format */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    quizId: string;
  }>;
};

const overrideSchema = z.object({
  attemptId: z.string().min(1, "attemptId wajib diisi"),
  answers: z
    .array(
      z.object({
        answerId: z.string().min(1),
        earnedPoints: z.number().min(0),
        aiFeedback: z.string().max(4000).optional().nullable(),
      }),
    )
    .min(1, "Minimal satu jawaban untuk dinilai"),
});

/**
 * Memastikan dosen pemilik kelas berhak atas kuis ini.
 * Mengembalikan id kuis & passingScore jika valid, atau null bila tidak.
 */
async function findOwnedQuiz(userId: string, slug: string, quizId: string) {
  return prisma.quiz.findFirst({
    where: {
      id: quizId,
      module: { course: { slug, lecturerId: userId } },
    },
    select: { id: true, passingScore: true, title: true },
  });
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug, quizId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 },
      );
    }

    const quiz = await findOwnedQuiz(userId, slug, quizId);
    if (!quiz) {
      return NextResponse.json(
        { success: false, message: "Kuis tidak ditemukan di kelas Anda." },
        { status: 404 },
      );
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId, submittedAt: { not: null } },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        score: true,
        maxScore: true,
        percentage: true,
        isPassed: true,
        submittedAt: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        answers: {
          select: {
            id: true,
            answerText: true,
            isCorrect: true,
            earnedPoints: true,
            aiFeedback: true,
            gradedByAi: true,
            selectedOption: { select: { optionText: true } },
            question: {
              select: {
                id: true,
                questionText: true,
                questionType: true,
                points: true,
                referenceAnswer: true,
                order: true,
              },
            },
          },
        },
      },
    });

    const data = attempts.map((attempt) => ({
      ...attempt,
      answers: [...attempt.answers].sort(
        (a, b) => a.question.order - b.question.order,
      ),
    }));

    return NextResponse.json({
      success: true,
      data: { quiz, attempts: data },
    });
  } catch (error) {
    console.error("LECTURER_QUIZ_ATTEMPTS_GET_ERROR", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat percobaan kuis." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug, quizId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 },
      );
    }

    const quiz = await findOwnedQuiz(userId, slug, quizId);
    if (!quiz) {
      return NextResponse.json(
        { success: false, message: "Kuis tidak ditemukan di kelas Anda." },
        { status: 404 },
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = overrideSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validasi gagal",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { attemptId, answers } = parsed.data;

    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: attemptId, quizId },
      select: {
        id: true,
        answers: {
          select: {
            id: true,
            earnedPoints: true,
            question: { select: { points: true } },
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json(
        { success: false, message: "Percobaan tidak ditemukan." },
        { status: 404 },
      );
    }

    const overrideMap = new Map(answers.map((a) => [a.answerId, a]));

    // Validasi: jangan beri poin melebihi bobot soal.
    for (const ans of attempt.answers) {
      const override = overrideMap.get(ans.id);
      if (override && override.earnedPoints > ans.question.points) {
        return NextResponse.json(
          {
            success: false,
            message: `Poin (${override.earnedPoints}) melebihi bobot soal (${ans.question.points}).`,
          },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      for (const override of answers) {
        await tx.quizAnswer.update({
          where: { id: override.answerId },
          data: {
            earnedPoints: override.earnedPoints,
            gradedByAi: false,
            ...(override.aiFeedback !== undefined
              ? { aiFeedback: override.aiFeedback }
              : {}),
          },
        });
      }

      const fresh = await tx.quizAnswer.findMany({
        where: { attemptId },
        select: {
          earnedPoints: true,
          question: { select: { points: true } },
        },
      });

      const score = fresh.reduce((sum, a) => sum + a.earnedPoints, 0);
      const maxScore = fresh.reduce((sum, a) => sum + a.question.points, 0);
      const percentage =
        maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0;
      const isPassed = percentage >= quiz.passingScore;

      return tx.quizAttempt.update({
        where: { id: attemptId },
        data: { score, maxScore, percentage, isPassed },
        select: {
          id: true,
          score: true,
          maxScore: true,
          percentage: true,
          isPassed: true,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Nilai berhasil diperbarui.",
      data: { attempt: updated },
    });
  } catch (error) {
    console.error("LECTURER_QUIZ_ATTEMPTS_PATCH_ERROR", error);
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui nilai." },
      { status: 500 },
    );
  }
}
