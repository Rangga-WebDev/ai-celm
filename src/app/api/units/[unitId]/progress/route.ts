/** @format */

import { NextRequest, NextResponse } from "next/server";
import { ProgressStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    unitId: string;
  }>;
};

function calculateModuleStatus(
  completedUnits: number,
  totalUnits: number,
): ProgressStatus {
  if (completedUnits === 0) return ProgressStatus.NOT_STARTED;
  if (completedUnits < totalUnits) return ProgressStatus.IN_PROGRESS;
  return ProgressStatus.COMPLETED;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { unitId } = await params;
    const body = await request.json();

    const {
      userId,
      status,
      progressPercent,
      score,
      attempts,
    }: {
      userId?: string;
      status?: ProgressStatus;
      progressPercent?: number;
      score?: number | null;
      attempts?: number;
    } = body;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "userId is required",
        },
        { status: 400 },
      );
    }

    const unit = await prisma.microUnit.findUnique({
      where: { id: unitId },
      include: {
        module: {
          include: {
            units: true,
          },
        },
      },
    });

    if (!unit) {
      return NextResponse.json(
        {
          success: false,
          message: "Unit not found",
        },
        { status: 404 },
      );
    }

    const now = new Date();

    const nextStatus = status ?? ProgressStatus.IN_PROGRESS;
    const nextProgressPercent =
      typeof progressPercent === "number" ? progressPercent : 0;

    const isPassed =
      typeof score === "number"
        ? score >= (unit.masteryThreshold ?? unit.module.masteryThreshold)
        : nextStatus === ProgressStatus.COMPLETED;

    const remedialRequired =
      typeof score === "number"
        ? score < (unit.masteryThreshold ?? unit.module.masteryThreshold)
        : false;

    const unitProgress = await prisma.unitProgress.upsert({
      where: {
        userId_microUnitId: {
          userId,
          microUnitId: unit.id,
        },
      },
      update: {
        status: nextStatus,
        progressPercent: nextProgressPercent,
        score: typeof score === "number" ? score : undefined,
        attempts: typeof attempts === "number" ? attempts : undefined,
        isPassed,
        remedialRequired,
        startedAt: nextStatus !== ProgressStatus.NOT_STARTED ? now : undefined,
        completedAt: nextStatus === ProgressStatus.COMPLETED ? now : null,
        lastAccessedAt: now,
      },
      create: {
        userId,
        microUnitId: unit.id,
        status: nextStatus,
        progressPercent: nextProgressPercent,
        score: typeof score === "number" ? score : null,
        attempts: typeof attempts === "number" ? attempts : 1,
        isPassed,
        remedialRequired,
        startedAt: nextStatus !== ProgressStatus.NOT_STARTED ? now : null,
        completedAt: nextStatus === ProgressStatus.COMPLETED ? now : null,
        lastAccessedAt: now,
      },
    });

    const allUnitProgresses = await prisma.unitProgress.findMany({
      where: {
        userId,
        microUnitId: {
          in: unit.module.units.map((u) => u.id),
        },
      },
    });

    const completedUnits = allUnitProgresses.filter(
      (item) => item.status === ProgressStatus.COMPLETED,
    ).length;

    const totalUnits = unit.module.units.length;
    const moduleProgressPercent =
      totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

    const masteryScores = allUnitProgresses
      .map((item) => item.score)
      .filter((value): value is number => typeof value === "number");

    const masteryScore =
      masteryScores.length > 0
        ? Number(
            (
              masteryScores.reduce((sum, value) => sum + value, 0) /
              masteryScores.length
            ).toFixed(2),
          )
        : null;

    const moduleStatus = calculateModuleStatus(completedUnits, totalUnits);

    const modulePassed =
      typeof masteryScore === "number"
        ? masteryScore >= unit.module.masteryThreshold
        : moduleStatus === ProgressStatus.COMPLETED;

    const moduleRemedialRequired =
      typeof masteryScore === "number"
        ? masteryScore < unit.module.masteryThreshold
        : false;

    const moduleProgress = await prisma.moduleProgress.upsert({
      where: {
        userId_moduleId: {
          userId,
          moduleId: unit.module.id,
        },
      },
      update: {
        status: moduleStatus,
        progressPercent: moduleProgressPercent,
        masteryScore,
        isPassed: modulePassed,
        remedialRequired: moduleRemedialRequired,
        startedAt:
          moduleStatus !== ProgressStatus.NOT_STARTED ? now : undefined,
        completedAt: moduleStatus === ProgressStatus.COMPLETED ? now : null,
        lastAccessedAt: now,
      },
      create: {
        userId,
        moduleId: unit.module.id,
        status: moduleStatus,
        progressPercent: moduleProgressPercent,
        masteryScore,
        isPassed: modulePassed,
        remedialRequired: moduleRemedialRequired,
        startedAt: moduleStatus !== ProgressStatus.NOT_STARTED ? now : null,
        completedAt: moduleStatus === ProgressStatus.COMPLETED ? now : null,
        lastAccessedAt: now,
      },
    });

    await prisma.learningAnalyticsEvent.create({
      data: {
        userId,
        courseId: unit.module.courseId,
        moduleId: unit.module.id,
        microUnitId: unit.id,
        eventType:
          nextStatus === ProgressStatus.COMPLETED
            ? "UNIT_COMPLETE"
            : "UNIT_VIEW",
        value: typeof score === "number" ? score : null,
        metadata: {
          status: nextStatus,
          progressPercent: nextProgressPercent,
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
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("PATCH /api/units/[unitId]/progress error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update unit progress",
      },
      { status: 500 },
    );
  }
}
