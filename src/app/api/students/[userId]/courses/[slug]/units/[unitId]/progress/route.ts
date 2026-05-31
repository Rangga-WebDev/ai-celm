/** @format */

import { NextRequest, NextResponse } from "next/server";
import { EnrollmentStatus, ProgressStatus, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    unitId: string;
  }>;
};

function isValidProgressStatus(value: unknown): value is ProgressStatus {
  return (
    value === ProgressStatus.IN_PROGRESS || value === ProgressStatus.COMPLETED
  );
}

async function recalculateModuleProgress({
  userId,
  moduleId,
}: {
  userId: string;
  moduleId: string;
}) {
  const targetModule = await prisma.module.findUnique({
    where: {
      id: moduleId,
    },
    select: {
      id: true,
      masteryThreshold: true,
      units: {
        where: {
          isRequired: true,
        },
        select: {
          id: true,
        },
      },
    },
  });

  if (!targetModule) return null;

  const requiredUnitIds = targetModule.units.map((unit) => unit.id);

  const completedCount =
    requiredUnitIds.length > 0
      ? await prisma.unitProgress.count({
          where: {
            userId,
            microUnitId: {
              in: requiredUnitIds,
            },
            status: ProgressStatus.COMPLETED,
          },
        })
      : 0;

  const progressPercent =
    requiredUnitIds.length > 0
      ? Math.round((completedCount / requiredUnitIds.length) * 100)
      : 0;

  const status =
    requiredUnitIds.length > 0 && completedCount === requiredUnitIds.length
      ? ProgressStatus.COMPLETED
      : ProgressStatus.IN_PROGRESS;

  const isPassed = progressPercent >= targetModule.masteryThreshold;
  const now = new Date();

  return prisma.moduleProgress.upsert({
    where: {
      userId_moduleId: {
        userId,
        moduleId,
      },
    },
    update: {
      status,
      progressPercent,
      isPassed,
      remedialRequired: false,
      lastAccessedAt: now,
      completedAt: status === ProgressStatus.COMPLETED ? now : undefined,
    },
    create: {
      userId,
      moduleId,
      status,
      progressPercent,
      isPassed,
      remedialRequired: false,
      startedAt: now,
      lastAccessedAt: now,
      completedAt: status === ProgressStatus.COMPLETED ? now : null,
    },
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.STUDENT]);

    if (auth.response) return auth.response;

    const { userId, slug, unitId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Student can only update their own progress",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const statusInput = body.status ?? ProgressStatus.IN_PROGRESS;

    if (!isValidProgressStatus(statusInput)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid progress status is required",
        },
        { status: 400 },
      );
    }

    const targetUnit = await prisma.microUnit.findFirst({
      where: {
        id: unitId,
        module: {
          course: {
            slug,
            isPublished: true,
          },
        },
      },
      select: {
        id: true,
        isLocked: true,
        moduleId: true,
        module: {
          select: {
            id: true,
            courseId: true,
          },
        },
      },
    });

    if (!targetUnit) {
      return NextResponse.json(
        {
          success: false,
          message: "Micro-unit not found",
        },
        { status: 404 },
      );
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        courseId: targetUnit.module.courseId,
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

    if (targetUnit.isLocked) {
      return NextResponse.json(
        {
          success: false,
          message: "This unit is locked",
        },
        { status: 403 },
      );
    }

    const progressPercent =
      statusInput === ProgressStatus.COMPLETED ? 100 : 50;
    const now = new Date();

    const unitProgress = await prisma.unitProgress.upsert({
      where: {
        userId_microUnitId: {
          userId,
          microUnitId: unitId,
        },
      },
      update: {
        status: statusInput,
        progressPercent,
        startedAt: now,
        completedAt: statusInput === ProgressStatus.COMPLETED ? now : null,
        lastAccessedAt: now,
      },
      create: {
        userId,
        microUnitId: unitId,
        status: statusInput,
        progressPercent,
        startedAt: now,
        completedAt: statusInput === ProgressStatus.COMPLETED ? now : null,
        lastAccessedAt: now,
      },
    });

    const moduleProgress = await recalculateModuleProgress({
      userId,
      moduleId: targetUnit.moduleId,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Unit progress updated successfully",
        data: {
          unitProgress,
          moduleProgress,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "PATCH /api/students/[userId]/courses/[slug]/units/[unitId]/progress error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update unit progress",
        detail:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 },
    );
  }
}
