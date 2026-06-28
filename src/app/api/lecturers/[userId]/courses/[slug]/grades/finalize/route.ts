/** @format */

import { NextRequest, NextResponse } from "next/server";
import { NotificationType, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { computeGradebook } from "@/lib/grades/gradebook";
import { createNotifications } from "@/lib/notifications/store";
import { finalizeGradesSchema } from "@/lib/validators/gradebook.schema";

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
      select: { id: true, slug: true, title: true },
    });
    if (!course) {
      return NextResponse.json(
        { success: false, message: "Course not found" },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = finalizeGradesSchema.safeParse(body);
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

    const { studentIds, unfinalize } = parsed.data;

    if (unfinalize) {
      await prisma.courseGrade.updateMany({
        where: {
          courseId: course.id,
          ...(studentIds && studentIds.length > 0
            ? { studentId: { in: studentIds } }
            : {}),
        },
        data: { isFinalized: false, finalizedAt: null },
      });

      const gradebook = await computeGradebook(course.id);
      return NextResponse.json(
        { success: true, message: "Grades unlocked", data: gradebook },
        { status: 200 },
      );
    }

    const gradebook = await computeGradebook(course.id);
    const now = new Date();

    const targets =
      studentIds && studentIds.length > 0
        ? gradebook.rows.filter((r) => studentIds.includes(r.studentId))
        : gradebook.rows;

    await prisma.$transaction(
      targets.map((row) =>
        prisma.courseGrade.upsert({
          where: {
            courseId_studentId: {
              courseId: course.id,
              studentId: row.studentId,
            },
          },
          update: {
            numericScore: row.numericScore,
            letterGrade: row.letterGrade,
            isFinalized: true,
            finalizedAt: now,
          },
          create: {
            courseId: course.id,
            studentId: row.studentId,
            numericScore: row.numericScore,
            letterGrade: row.letterGrade,
            isFinalized: true,
            finalizedAt: now,
          },
        }),
      ),
    );

    const refreshed = await computeGradebook(course.id);

    if (targets.length > 0) {
      try {
        await createNotifications(
          targets.map((row) => ({
            userId: row.studentId,
            type: NotificationType.GRADE,
            title: `Nilai final ${course.title} telah terbit`,
            body:
              row.letterGrade != null
                ? `Nilai akhir Anda: ${row.letterGrade}.`
                : "Nilai akhir Anda sudah difinalisasi.",
            href: `/student/courses/${course.slug}/grades`,
          })),
        );
      } catch (notifyError) {
        console.error("Failed to create grade notifications:", notifyError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `${targets.length} nilai difinalisasi`,
        data: refreshed,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /grades/finalize error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to finalize grades" },
      { status: 500 },
    );
  }
}
