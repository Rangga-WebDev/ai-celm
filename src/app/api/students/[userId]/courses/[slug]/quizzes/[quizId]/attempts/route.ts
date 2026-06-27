/** @format */

import { NextRequest, NextResponse } from "next/server";
import {
  AIInteractionType,
  EnrollmentStatus,
  ModuleStatus,
  QuizStatus,
  Role,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import {
  isChoiceQuestionType,
  quizAttemptSchema,
} from "@/lib/validators/quiz.schema";
import { gradeQuizTextAnswer } from "@/lib/ai/quiz-answer-grader";
import { isAiEnabled } from "@/lib/ai/openai";

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
        dueAt: true,
        moduleId: true,
        module: {
          select: {
            course: { select: { title: true } },
          },
        },
        sourceMaterial: {
          select: { extractedText: true },
        },
        questions: {
          select: {
            id: true,
            questionText: true,
            questionType: true,
            explanation: true,
            referenceAnswer: true,
            gradingCriteria: true,
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

    if (quiz.dueAt && quiz.dueAt.getTime() < Date.now()) {
      return NextResponse.json(
        {
          success: false,
          message: "Tenggat kuis telah berakhir, pengumpulan ditutup",
        },
        { status: 409 },
      );
    }

    const answerMap = new Map(
      parsed.data.answers.map((a) => [a.questionId, a]),
    );

    const courseTitle = quiz.module.course.title;
    const materialText = quiz.sourceMaterial?.extractedText ?? null;
    const aiEnabled = isAiEnabled();

    type GradedAnswer = {
      questionId: string;
      selectedOptionId: string | null;
      answerText: string | null;
      isCorrect: boolean | null;
      earnedPoints: number;
      correctOptionId: string | null;
      explanation: string | null;
      aiFeedback: string | null;
      gradedByAi: boolean;
    };

    const aiLogsToCreate: Array<{
      userId: string;
      courseId: string;
      moduleId: string;
      interactionType: AIInteractionType;
      prompt: string;
      response: string;
      modelName: string | null;
      inputTokens: number | null;
      outputTokens: number | null;
    }> = [];
    const gradedAnswers: GradedAnswer[] = [];

    let maxScore = 0;
    let score = 0;

    for (const question of quiz.questions) {
      maxScore += question.points;
      const submitted = answerMap.get(question.id);

      if (isChoiceQuestionType(question.questionType)) {
        const selectedOptionId = submitted?.selectedOptionId ?? null;
        const correctOption = question.options.find((o) => o.isCorrect);
        const validSelection =
          selectedOptionId !== null &&
          selectedOptionId !== undefined &&
          question.options.some((o) => o.id === selectedOptionId);

        const isCorrect =
          validSelection && correctOption?.id === selectedOptionId;
        const earnedPoints = isCorrect ? question.points : 0;

        score += earnedPoints;

        gradedAnswers.push({
          questionId: question.id,
          selectedOptionId: validSelection ? selectedOptionId : null,
          answerText: null,
          isCorrect,
          earnedPoints,
          correctOptionId: correctOption?.id ?? null,
          explanation: question.explanation,
          aiFeedback: null,
          gradedByAi: false,
        });
        continue;
      }

      // Soal esai / jawaban singkat: nilai dengan AI bila tersedia.
      const answerText = submitted?.answerText?.trim() ?? "";
      let earnedPoints = 0;
      let isCorrect: boolean | null = null;
      let aiFeedback: string | null = null;
      let gradedByAi = false;

      if (aiEnabled && answerText.length > 0) {
        try {
          const result = await gradeQuizTextAnswer({
            courseTitle,
            materialText,
            questionText: question.questionText,
            referenceAnswer: question.referenceAnswer,
            gradingCriteria: question.gradingCriteria,
            maxPoints: question.points,
            studentAnswer: answerText,
          });

          earnedPoints = result.grade.earnedPoints;
          isCorrect = result.grade.isCorrect;
          aiFeedback = result.grade.feedback;
          gradedByAi = true;

          aiLogsToCreate.push({
            userId,
            courseId: course.id,
            moduleId: quiz.moduleId,
            interactionType: AIInteractionType.RUBRIC_ASSIST,
            prompt: result.promptText,
            response: result.rawResponse,
            modelName: result.modelName,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
          });
        } catch (gradeError) {
          console.error("AI grading failed for quiz answer:", gradeError);
          // Fallback: biarkan untuk dinilai manual oleh dosen.
        }
      }

      score += earnedPoints;

      gradedAnswers.push({
        questionId: question.id,
        selectedOptionId: null,
        answerText: answerText.length > 0 ? answerText : null,
        isCorrect,
        earnedPoints,
        correctOptionId: null,
        explanation: question.explanation,
        aiFeedback,
        gradedByAi,
      });
    }

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
            answerText: a.answerText,
            isCorrect: a.isCorrect,
            earnedPoints: a.earnedPoints,
            aiFeedback: a.aiFeedback,
            gradedByAi: a.gradedByAi,
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

    if (aiLogsToCreate.length > 0) {
      await prisma.aIResponseLog.createMany({ data: aiLogsToCreate });
    }

    const review = quiz.showScoreToStudent
      ? gradedAnswers.map((a) => ({
          questionId: a.questionId,
          selectedOptionId: a.selectedOptionId,
          correctOptionId: a.correctOptionId,
          isCorrect: a.isCorrect,
          earnedPoints: a.earnedPoints,
          explanation: a.explanation,
          aiFeedback: a.aiFeedback,
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
