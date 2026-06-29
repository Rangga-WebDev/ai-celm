/** @format */

import { NextRequest, NextResponse } from "next/server";
import { EnrollmentStatus, QuizStatus, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
  }>;
};

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.STUDENT]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Student can only access their own quizzes",
        },
        { status: 403 },
      );
    }

    const course = await prisma.course.findFirst({
      where: {
        slug,
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        code: true,
      },
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

    const quizzes = await prisma.quiz.findMany({
      where: {
        status: QuizStatus.PUBLISHED,
        module: {
          courseId: course.id,
        },
      },
      orderBy: [{ module: { order: "asc" } }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        timeLimitMinutes: true,
        passingScore: true,
        showScoreToStudent: true,
        module: {
          select: {
            id: true,
            title: true,
            slug: true,
            order: true,
          },
        },
        _count: {
          select: { questions: true },
        },
        attempts: {
          where: { studentId: userId },
          orderBy: { startedAt: "desc" },
          select: {
            id: true,
            score: true,
            maxScore: true,
            percentage: true,
            isPassed: true,
            submittedAt: true,
            startedAt: true,
          },
        },
      },
    });

    const data = quizzes.map((quiz) => {
      const { attempts, ...rest } = quiz;
      const submitted = attempts.filter((a) => a.submittedAt !== null);
      const best = submitted.reduce<(typeof submitted)[number] | null>(
        (acc, item) => {
          if (acc === null) return item;
          return (item.percentage ?? 0) > (acc.percentage ?? 0) ? item : acc;
        },
        null,
      );

      return {
        ...rest,
        attemptCount: submitted.length,
        bestAttempt: best,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Quizzes fetched successfully",
        data: {
          course,
          quizzes: data,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "GET /api/students/[userId]/courses/[slug]/quizzes error:",
      error,
    );

    return NextResponse.json(
      { success: false, message: "Failed to fetch quizzes" },
      { status: 500 },
    );
  }
}
