/** @format */

import { NextRequest, NextResponse } from "next/server";
import {
  EnrollmentStatus,
  ModuleStatus,
  QuizStatus,
  Role,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { quizAttemptSchema } from "@/lib/validators/quiz.schema";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    quizId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.STUDENT]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug, quizId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Student can only submit their own attempt",
        },
        { status: 403 },
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = quizAttemptSchema.safeParse(json);

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

    const course = await prisma.course.findFirst({
      where: {
        slug,
        isPublished: true,
      },
      select: { id: true },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, message: "Course not found" },
        { status: 404 },
      );
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        courseId: course.id,
        status: EnrollmentStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!enrollment) {
      return NextResponse.json(
        { success: false, message: "You are not enrolled in this course" },
        { status: 403 },
      );
    }

    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        status: QuizStatus.PUBLISHED,
        module: {
          courseId: course.id,
          status: ModuleStatus.PUBLISHED,
        },
      },
      select: {
        id: true,
        passingScore: true,
        showScoreToStudent: true,
        questions: {
          select: {
            id: true,
            questionType: true,
            explanation: true,
            points: true,
            options: {
              select: {
                id: true,
                isCorrect: true,
              },
            },
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json(
        { success: false, message: "Quiz not found" },
        { status: 404 },
      );
    }

    if (quiz.questions.length === 0) {
      return NextResponse.json(
        { success: false, message: "Kuis ini belum memiliki soal" },
        { status: 409 },
      );
    }

    const answerMap = new Map(
      parsed.data.answers.map((a) => [a.questionId, a.selectedOptionId]),
    );

    let maxScore = 0;
    let score = 0;

    const gradedAnswers = quiz.questions.map((question) => {
      maxScore += question.points;

      const selectedOptionId = answerMap.get(question.id) ?? null;
      const correctOption = question.options.find((o) => o.isCorrect);
      const validSelection =
        selectedOptionId !== null &&
        question.options.some((o) => o.id === selectedOptionId);

      const isCorrect =
        validSelection && correctOption?.id === selectedOptionId;
      const earnedPoints = isCorrect ? question.points : 0;

      score += earnedPoints;

      return {
        questionId: question.id,
        selectedOptionId: validSelection ? selectedOptionId : null,
        isCorrect,
        earnedPoints,
        correctOptionId: correctOption?.id ?? null,
        explanation: question.explanation,
      };
    });

    const percentage =
      maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0;
    const isPassed = percentage >= quiz.passingScore;
    const now = new Date();

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        studentId: userId,
        score,
        maxScore,
        percentage,
        isPassed,
        submittedAt: now,
        answers: {
          create: gradedAnswers.map((a) => ({
            questionId: a.questionId,
            selectedOptionId: a.selectedOptionId,
            isCorrect: a.isCorrect,
            earnedPoints: a.earnedPoints,
          })),
        },
      },
      select: {
        id: true,
        score: true,
        maxScore: true,
        percentage: true,
        isPassed: true,
        submittedAt: true,
      },
    });

    const review = quiz.showScoreToStudent
      ? gradedAnswers.map((a) => ({
          questionId: a.questionId,
          selectedOptionId: a.selectedOptionId,
          correctOptionId: a.correctOptionId,
          isCorrect: a.isCorrect,
          earnedPoints: a.earnedPoints,
          explanation: a.explanation,
        }))
      : null;

    return NextResponse.json(
      {
        success: true,
        message: "Jawaban berhasil dikumpulkan",
        data: {
          attempt,
          showScore: quiz.showScoreToStudent,
          review,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/students/[userId]/courses/[slug]/quizzes/[quizId]/attempts error:",
      error,
    );

    return NextResponse.json(
      { success: false, message: "Failed to submit quiz attempt" },
      { status: 500 },
    );
  }
}
