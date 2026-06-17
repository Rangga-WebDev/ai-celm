/** @format */

import { NextRequest, NextResponse } from "next/server";
import {
  EnrollmentStatus,
  ProjectStatus,
  Role,
} from "@/generated/prisma/client";
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
          message: "Student can only access their own projects",
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
        {
          success: false,
          message: "Course not found",
        },
        { status: 404 },
      );
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        courseId: course.id,
        status: EnrollmentStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not enrolled in this course",
        },
        { status: 403 },
      );
    }

    const projects = await prisma.civicActionProject.findMany({
      where: {
        courseId: course.id,
        status: ProjectStatus.ACTIVE,
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        brief: true,
        objective: true,
        outputType: true,
        dueAt: true,
        createdAt: true,
        module: {
          select: {
            id: true,
            title: true,
            slug: true,
            order: true,
          },
        },
        microUnit: {
          select: {
            id: true,
            title: true,
            slug: true,
            order: true,
          },
        },
        submissions: {
          where: {
            studentId: userId,
          },
          select: {
            id: true,
            status: true,
            score: true,
            submittedAt: true,
            reviewedAt: true,
            updatedAt: true,
          },
        },
      },
    });

    const data = projects.map((project) => {
      const { submissions, ...rest } = project;

      return {
        ...rest,
        submission: submissions[0] ?? null,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Projects fetched successfully",
        data: {
          course,
          projects: data,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "GET /api/students/[userId]/courses/[slug]/projects error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch projects",
      },
      { status: 500 },
    );
  }
}
