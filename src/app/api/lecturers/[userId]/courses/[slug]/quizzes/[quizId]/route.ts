/** @format */

import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { quizUpdateSchema } from "@/lib/validators/quiz.schema";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    quizId: string;
  }>;
};

async function resolveLecturerQuiz(
  userId: string,
  slug: string,
  quizId: string,
) {
  return prisma.quiz.findFirst({
    where: {
      id: quizId,
      module: {
        course: {
          slug,
          lecturerId: userId,
        },
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      timeLimitMinutes: true,
      passingScore: true,
      showScoreToStudent: true,
      createdAt: true,
      updatedAt: true,
      module: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          questionText: true,
          questionType: true,
          explanation: true,
          order: true,
          points: true,
          options: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              optionText: true,
              isCorrect: true,
              order: true,
            },
          },
        },
      },
      _count: {
        select: {
          attempts: true,
        },
      },
    },
  });
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug, quizId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lecturer can only access their own quizzes",
        },
        { status: 403 },
      );
    }

    const quiz = await resolveLecturerQuiz(userId, slug, quizId);

    if (!quiz) {
      return NextResponse.json(
        {
          success: false,
          message: "Quiz not found in your course",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Quiz fetched successfully",
        data: { quiz },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "GET /api/lecturers/[userId]/courses/[slug]/quizzes/[quizId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch quiz",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug, quizId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lecturer can only edit their own quizzes",
        },
        { status: 403 },
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = quizUpdateSchema.safeParse(json);

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

    const existing = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        module: {
          course: {
            slug,
            lecturerId: userId,
          },
        },
      },
      select: {
        id: true,
        _count: {
          select: { attempts: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Quiz not found in your course",
        },
        { status: 404 },
      );
    }

    const {
      title,
      description,
      status,
      timeLimitMinutes,
      passingScore,
      showScoreToStudent,
      questions,
    } = parsed.data;

    const replaceQuestions = questions !== undefined;

    if (replaceQuestions && existing._count.attempts > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Soal tidak dapat diubah karena kuis sudah pernah dikerjakan mahasiswa",
        },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.quiz.update({
        where: { id: quizId },
        data: {
          title,
          description: description.length > 0 ? description : null,
          status,
          timeLimitMinutes: timeLimitMinutes ?? null,
          passingScore,
          showScoreToStudent,
        },
      });

      if (!replaceQuestions || !questions) {
        return;
      }

      await tx.quizQuestion.deleteMany({
        where: { quizId },
      });

      let questionOrder = 1;

      for (const question of questions) {
        await tx.quizQuestion.create({
          data: {
            quizId,
            questionText: question.questionText,
            questionType: question.questionType,
            explanation:
              question.explanation.length > 0 ? question.explanation : null,
            order: questionOrder,
            points: question.points,
            options: {
              create: question.options.map((option, index) => ({
                optionText: option.optionText,
                isCorrect: option.isCorrect,
                order: index + 1,
              })),
            },
          },
        });

        questionOrder += 1;
      }
    });

    const quiz = await resolveLecturerQuiz(userId, slug, quizId);

    return NextResponse.json(
      {
        success: true,
        message: "Kuis tersimpan",
        data: { quiz },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "PATCH /api/lecturers/[userId]/courses/[slug]/quizzes/[quizId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update quiz",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug, quizId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lecturer can only delete their own quizzes",
        },
        { status: 403 },
      );
    }

    const existing = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        module: {
          course: {
            slug,
            lecturerId: userId,
          },
        },
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Quiz not found in your course",
        },
        { status: 404 },
      );
    }

    await prisma.quiz.delete({
      where: { id: quizId },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Kuis dihapus",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "DELETE /api/lecturers/[userId]/courses/[slug]/quizzes/[quizId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete quiz",
      },
      { status: 500 },
    );
  }
}
