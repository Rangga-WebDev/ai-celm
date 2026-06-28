/** @format */

import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { computeGradebook } from "@/lib/grades/gradebook";
import { gradeComponentsPayloadSchema } from "@/lib/validators/gradebook.schema";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
  }>;
};

async function getOwnedCourse(userId: string, slug: string) {
  return prisma.course.findFirst({
    where: { slug, lecturerId: userId },
    select: { id: true, title: true, slug: true },
  });
}

export async function GET(_: NextRequest, { params }: Params) {
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

    const course = await getOwnedCourse(userId, slug);
    if (!course) {
      return NextResponse.json(
        { success: false, message: "Course not found" },
        { status: 404 },
      );
    }

    const gradebook = await computeGradebook(course.id);

    return NextResponse.json(
      {
        success: true,
        message: "Gradebook fetched successfully",
        data: { course, ...gradebook },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /grades error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch gradebook" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
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

    const course = await getOwnedCourse(userId, slug);
    if (!course) {
      return NextResponse.json(
        { success: false, message: "Course not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = gradeComponentsPayloadSchema.safeParse(body);
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

    const incoming = parsed.data.components;
    const existing = await prisma.gradeComponent.findMany({
      where: { courseId: course.id },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((c) => c.id));
    const keepIds = new Set(
      incoming.map((c) => c.id).filter((id): id is string => Boolean(id)),
    );
    const toDelete = [...existingIds].filter((id) => !keepIds.has(id));

    await prisma.$transaction(async (tx) => {
      if (toDelete.length > 0) {
        await tx.gradeComponent.deleteMany({
          where: { id: { in: toDelete }, courseId: course.id },
        });
      }

      // Two-phase order update to avoid unique [courseId, order] collisions.
      for (let i = 0; i < incoming.length; i += 1) {
        const c = incoming[i];
        if (c.id && existingIds.has(c.id)) {
          await tx.gradeComponent.update({
            where: { id: c.id },
            data: { order: 1000 + i },
          });
        }
      }

      for (let i = 0; i < incoming.length; i += 1) {
        const c = incoming[i];
        if (c.id && existingIds.has(c.id)) {
          await tx.gradeComponent.update({
            where: { id: c.id },
            data: {
              name: c.name,
              source: c.source,
              weight: c.weight,
              maxScore: c.maxScore,
              order: i,
            },
          });
        } else {
          await tx.gradeComponent.create({
            data: {
              courseId: course.id,
              name: c.name,
              source: c.source,
              weight: c.weight,
              maxScore: c.maxScore,
              order: i,
            },
          });
        }
      }
    });

    const gradebook = await computeGradebook(course.id);

    return NextResponse.json(
      {
        success: true,
        message: "Grade components saved successfully",
        data: { course, ...gradebook },
      },
      { status: 200 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, message: "Duplicate component order" },
        { status: 409 },
      );
    }
    console.error("PUT /grades error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save grade components" },
      { status: 500 },
    );
  }
}
