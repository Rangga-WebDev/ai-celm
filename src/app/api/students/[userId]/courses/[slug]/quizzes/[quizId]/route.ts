/** @format */

import { NextRequest, NextResponse } from "next/server";
import { EnrollmentStatus, QuizStatus, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    quizId: string;
  }>;
};

export async function GET(_: NextRequest, { params }: Params) {
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
          message: "Student can only access their own quiz",
        },
        { status: 403 },
      );
    }

    const course = await prisma.course.findFirst({
      where: {
        slug,
        isPublished: true,
      },
      select: { id: true, title: true, slug: true },
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
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        timeLimitMinutes: true,
        passingScore: true,
        showScoreToStudent: true,
        dueAt: true,
        module: {
          select: { id: true, title: true, slug: true },
        },
        questions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            questionText: true,
            questionType: true,
            order: true,
            points: true,
            options: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                optionText: true,
                order: true,
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

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        quizId,
        studentId: userId,
        submittedAt: { not: null },
      },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        score: true,
        maxScore: true,
        percentage: true,
        isPassed: true,
        submittedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Quiz fetched successfully",
        data: {
          course,
          quiz,
          attempts,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "GET /api/students/[userId]/courses/[slug]/quizzes/[quizId] error:",
      error,
    );

    return NextResponse.json(
      { success: false, message: "Failed to fetch quiz" },
      { status: 500 },
    );
  }
}
