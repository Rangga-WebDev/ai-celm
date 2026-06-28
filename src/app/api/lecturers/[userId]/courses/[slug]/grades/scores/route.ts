/** @format */

import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { componentScoreInputSchema } from "@/lib/validators/gradebook.schema";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
  }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug } = await params;
    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    const course = await prisma.course.findFirst({
      where: { slug, lecturerId: userId },
      select: { id: true },
    });
    if (!course) {
      return NextResponse.json(
        { success: false, message: "Course not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = componentScoreInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: parsed.error.flatten(),
        },
        { status: 422 },
      );
    }

    const { componentId, studentId, score, note } = parsed.data;

    // Component must belong to this course.
    const component = await prisma.gradeComponent.findFirst({
      where: { id: componentId, courseId: course.id },
      select: { id: true, maxScore: true },
    });
    if (!component) {
      return NextResponse.json(
        { success: false, message: "Component not found in this course" },
        { status: 404 },
      );
    }

    if (score > component.maxScore) {
      return NextResponse.json(
        {
          success: false,
          message: `Nilai melebihi skor maksimal (${component.maxScore})`,
        },
        { status: 422 },
      );
    }

    // Student must be enrolled in this course.
    const enrollment = await prisma.enrollment.findFirst({
      where: { courseId: course.id, userId: studentId },
      select: { id: true },
    });
    if (!enrollment) {
      return NextResponse.json(
        { success: false, message: "Student is not enrolled in this course" },
        { status: 404 },
      );
    }

    const saved = await prisma.componentScore.upsert({
      where: { componentId_studentId: { componentId, studentId } },
      update: { score, note: note || null, updatedById: userId },
      create: {
        componentId,
        studentId,
        score,
        note: note || null,
        updatedById: userId,
      },
    });

    return NextResponse.json(
      { success: true, message: "Score saved successfully", data: saved },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /grades/scores error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save score" },
      { status: 500 },
    );
  }
}
