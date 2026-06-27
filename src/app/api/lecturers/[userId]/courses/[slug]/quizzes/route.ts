/** @format */

import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { quizCreateSchema } from "@/lib/validators/quiz.schema";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
  }>;
};

async function resolveLecturerCourse(userId: string, slug: string) {
  return prisma.course.findFirst({
    where: {
      slug,
      lecturerId: userId,
    },
    select: {
      id: true,
      title: true,
      slug: true,
    },
  });
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lecturer can only access their own quizzes",
        },
        { status: 403 },
      );
    }

    const course = await resolveLecturerCourse(userId, slug);

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          message: "Course not found or you are not assigned to this course",
        },
        { status: 404 },
      );
    }

    const modules = await prisma.module.findMany({
      where: {
        courseId: course.id,
      },
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        slug: true,
        order: true,
      },
    });

    const quizzes = await prisma.quiz.findMany({
      where: {
        module: {
          courseId: course.id,
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        timeLimitMinutes: true,
        dueAt: true,
        passingScore: true,
        showScoreToStudent: true,
        createdAt: true,
        updatedAt: true,
        module: {
          select: {
            id: true,
            title: true,
            slug: true,
            order: true,
          },
        },
        _count: {
          select: {
            questions: true,
            attempts: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Quizzes fetched successfully",
        data: {
          course,
          modules,
          quizzes,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "GET /api/lecturers/[userId]/courses/[slug]/quizzes error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch quizzes",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lecturer can only create quizzes in their own courses",
        },
        { status: 403 },
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = quizCreateSchema.safeParse(json);

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

    const course = await resolveLecturerCourse(userId, slug);

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          message: "Course not found or you are not assigned to this course",
        },
        { status: 404 },
      );
    }

    const {
      moduleId,
      title,
      description,
      status,
      timeLimitMinutes,
      dueAt,
      sourceMaterialId,
      passingScore,
      showScoreToStudent,
    } = parsed.data;

    const targetModule = await prisma.module.findFirst({
      where: {
        id: moduleId,
        courseId: course.id,
      },
      select: { id: true },
    });

    if (!targetModule) {
      return NextResponse.json(
        {
          success: false,
          message: "Modul tidak ditemukan pada course ini",
        },
        { status: 404 },
      );
    }

    if (sourceMaterialId) {
      const material = await prisma.courseMaterial.findFirst({
        where: {
          id: sourceMaterialId,
          courseId: course.id,
        },
        select: { id: true },
      });

      if (!material) {
        return NextResponse.json(
          {
            success: false,
            message: "Materi sumber tidak ditemukan pada course ini",
          },
          { status: 404 },
        );
      }
    }

    const quiz = await prisma.quiz.create({
      data: {
        moduleId,
        title,
        description: description.length > 0 ? description : null,
        status,
        timeLimitMinutes: timeLimitMinutes ?? null,
        dueAt: dueAt ?? null,
        sourceMaterialId: sourceMaterialId ?? null,
        passingScore,
        showScoreToStudent,
      },
      select: {
        id: true,
        title: true,
        status: true,
        dueAt: true,
        module: {
          select: { id: true, title: true },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Kuis berhasil dibuat",
        data: { quiz },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/lecturers/[userId]/courses/[slug]/quizzes error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create quiz",
      },
      { status: 500 },
    );
  }
}
