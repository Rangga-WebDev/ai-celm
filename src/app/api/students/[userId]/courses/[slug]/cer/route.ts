/** @format */

import { NextRequest, NextResponse } from "next/server";
import {
  CerAssignmentStatus,
  EnrollmentStatus,
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
          message: "Student can only access their own CER assignments",
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

    const assignments = await prisma.cerAssignment.findMany({
      where: {
        courseId: course.id,
        status: CerAssignmentStatus.ACTIVE,
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        prompt: true,
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

    const data = assignments.map((assignment) => {
      const { submissions, ...rest } = assignment;

      return {
        ...rest,
        submission: submissions[0] ?? null,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "CER assignments fetched successfully",
        data: {
          course,
          assignments: data,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "GET /api/students/[userId]/courses/[slug]/cer error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch CER assignments",
      },
      { status: 500 },
    );
  }
}
