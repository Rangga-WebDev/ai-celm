/** @format */

import { NextRequest, NextResponse } from "next/server";
import { EnrollmentStatus, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { computeGradebook } from "@/lib/grades/gradebook";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
  }>;
};

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.STUDENT]);
    if (auth.response) return auth.response;

    const { userId, slug } = await params;
    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Student can only access their own grades" },
        { status: 403 },
      );
    }

    const course = await prisma.course.findFirst({
      where: { slug, isPublished: true },
      select: { id: true, title: true, slug: true, code: true },
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
        status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
      },
      select: { id: true },
    });
    if (!enrollment) {
      return NextResponse.json(
        { success: false, message: "You are not enrolled in this course" },
        { status: 403 },
      );
    }

    const gradebook = await computeGradebook(course.id);
    const row = gradebook.rows.find((r) => r.studentId === userId) ?? null;

    return NextResponse.json(
      {
        success: true,
        message: "Grades fetched successfully",
        data: {
          course,
          totalWeight: gradebook.totalWeight,
          components: gradebook.components,
          grade: row
            ? {
                numericScore: row.numericScore,
                letterGrade: row.letterGrade,
                isFinalized: row.isFinalized,
                finalizedAt: row.finalizedAt,
                components: row.components,
              }
            : null,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET student /grades error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch grades" },
      { status: 500 },
    );
  }
}
