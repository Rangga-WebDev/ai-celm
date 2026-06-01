/** @format */

import { NextRequest, NextResponse } from "next/server";
import {
  AnalyticsEventType,
  EnrollmentStatus,
  ProgressStatus,
  Role,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    unitId: string;
  }>;
};

const MIN_LEARNING_SECONDS = 20;

function isValidProgressStatus(value: unknown): value is ProgressStatus {
  return (
    value === ProgressStatus.IN_PROGRESS || value === ProgressStatus.COMPLETED
  );
}

function getElapsedSeconds(startedAt: Date | null) {
  if (!startedAt) return 0;

  return Math.floor((Date.now() - startedAt.getTime()) / 1000);
}

function calculateModuleStatus(
  completedRequiredUnits: number,
  totalRequiredUnits: number,
): ProgressStatus {
  if (totalRequiredUnits === 0) return ProgressStatus.NOT_STARTED;
  if (completedRequiredUnits === 0) return ProgressStatus.IN_PROGRESS;
  if (completedRequiredUnits < totalRequiredUnits) {
    return ProgressStatus.IN_PROGRESS;
  }

  return ProgressStatus.COMPLETED;
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

  const completedRequiredUnits =
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
      ? Math.round((completedRequiredUnits / requiredUnitIds.length) * 100)
      : 0;

  const moduleStatus = calculateModuleStatus(
    completedRequiredUnits,
    requiredUnitIds.length,
  );

  const isPassed =
    moduleStatus === ProgressStatus.COMPLETED &&
    progressPercent >= targetModule.masteryThreshold;

  const now = new Date();

  return prisma.moduleProgress.upsert({
    where: {
      userId_moduleId: {
        userId,
        moduleId,
      },
    },
    update: {
      status: moduleStatus,
      progressPercent,
      isPassed,
      remedialRequired: false,
      lastAccessedAt: now,
      completedAt: moduleStatus === ProgressStatus.COMPLETED ? now : null,
    },
    create: {
      userId,
      moduleId,
      status: moduleStatus,
      progressPercent,
      masteryScore: null,
      isPassed,
      remedialRequired: false,
      startedAt: now,
      lastAccessedAt: now,
      completedAt: moduleStatus === ProgressStatus.COMPLETED ? now : null,
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
        moduleId: true,
        isLocked: true,
        masteryThreshold: true,
        module: {
          select: {
            id: true,
            courseId: true,
            masteryThreshold: true,
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

    const existingProgress = await prisma.unitProgress.findUnique({
      where: {
        userId_microUnitId: {
          userId,
          microUnitId: targetUnit.id,
        },
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        attempts: true,
      },
    });

    if (
      existingProgress?.status === ProgressStatus.COMPLETED &&
      statusInput === ProgressStatus.IN_PROGRESS
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "This unit has already been completed",
        },
        { status: 409 },
      );
    }

    if (statusInput === ProgressStatus.COMPLETED) {
      if (!existingProgress?.startedAt) {
        return NextResponse.json(
          {
            success: false,
            message: "Start this unit before marking it as completed",
            remainingSeconds: MIN_LEARNING_SECONDS,
            minimumSeconds: MIN_LEARNING_SECONDS,
          },
          { status: 409 },
        );
      }

      const elapsedSeconds = getElapsedSeconds(existingProgress.startedAt);
      const remainingSeconds = Math.max(
        MIN_LEARNING_SECONDS - elapsedSeconds,
        0,
      );

      if (remainingSeconds > 0) {
        return NextResponse.json(
          {
            success: false,
            message: `Please continue learning for ${remainingSeconds} more seconds before completing this unit`,
            remainingSeconds,
            minimumSeconds: MIN_LEARNING_SECONDS,
          },
          { status: 409 },
        );
      }
    }

    const now = new Date();
    const progressPercent =
      statusInput === ProgressStatus.COMPLETED ? 100 : 25;

    const unitThreshold =
      targetUnit.masteryThreshold ?? targetUnit.module.masteryThreshold ?? 70;

    const isPassed =
      statusInput === ProgressStatus.COMPLETED &&
      progressPercent >= unitThreshold;

    const unitProgress = await prisma.unitProgress.upsert({
      where: {
        userId_microUnitId: {
          userId,
          microUnitId: targetUnit.id,
        },
      },
      update: {
        status: statusInput,
        progressPercent,
        attempts: existingProgress?.attempts ?? 1,
        isPassed,
        remedialRequired: false,
        startedAt: existingProgress?.startedAt ?? now,
        completedAt: statusInput === ProgressStatus.COMPLETED ? now : null,
        lastAccessedAt: now,
      },
      create: {
        userId,
        microUnitId: targetUnit.id,
        status: statusInput,
        progressPercent,
        attempts: 1,
        isPassed,
        remedialRequired: false,
        startedAt: now,
        completedAt: statusInput === ProgressStatus.COMPLETED ? now : null,
        lastAccessedAt: now,
      },
    });

    const moduleProgress = await recalculateModuleProgress({
      userId,
      moduleId: targetUnit.moduleId,
    });

    await prisma.learningAnalyticsEvent.create({
      data: {
        userId,
        courseId: targetUnit.module.courseId,
        moduleId: targetUnit.moduleId,
        microUnitId: targetUnit.id,
        eventType:
          statusInput === ProgressStatus.COMPLETED
            ? AnalyticsEventType.UNIT_COMPLETE
            : AnalyticsEventType.UNIT_START,
        value: progressPercent,
        metadata: {
          status: statusInput,
          progressPercent,
          minimumSeconds: MIN_LEARNING_SECONDS,
          source: "student_learning_flow",
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Unit progress updated successfully",
        data: {
          unitProgress,
          moduleProgress,
          minimumSeconds: MIN_LEARNING_SECONDS,
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
