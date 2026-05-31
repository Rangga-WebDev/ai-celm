/** @format */

import { NextRequest, NextResponse } from "next/server";
import { EnrollmentStatus, ModuleStatus, Role } from "@/generated/prisma/client";
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

    if (auth.response) return auth.response;

    const { userId, slug } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Student can only access their own learning data",
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
        description: true,
        coverImage: true,
        isPublished: true,
        lecturer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
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
        enrolledAt: true,
        status: true,
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

    const learningModules = await prisma.module.findMany({
      where: {
        courseId: course.id,
        status: ModuleStatus.PUBLISHED,
      },
      orderBy: {
        order: "asc",
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        order: true,
        estimatedMinutes: true,
        status: true,
        isLocked: true,
        unlockRule: true,
        masteryThreshold: true,
        resources: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
          select: {
            id: true,
            courseId: true,
            moduleId: true,
            microUnitId: true,
            title: true,
            description: true,
            type: true,
            url: true,
            sortOrder: true,
            createdAt: true,
          },
        },
        units: {
          orderBy: {
            order: "asc",
          },
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            content: true,
            order: true,
            estimatedMinutes: true,
            unitType: true,
            isRequired: true,
            isLocked: true,
            masteryThreshold: true,
            resources: {
              orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
              select: {
                id: true,
                courseId: true,
                moduleId: true,
                microUnitId: true,
                title: true,
                description: true,
                type: true,
                url: true,
                sortOrder: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    const moduleIds = learningModules.map((learningModule) => learningModule.id);
    const microUnitIds = learningModules.flatMap((learningModule) =>
      learningModule.units.map((unit) => unit.id),
    );

    const [moduleProgresses, unitProgresses, courseResources] =
      await Promise.all([
        moduleIds.length > 0
          ? prisma.moduleProgress.findMany({
              where: {
                userId,
                moduleId: {
                  in: moduleIds,
                },
              },
              select: {
                id: true,
                moduleId: true,
                status: true,
                progressPercent: true,
                masteryScore: true,
                isPassed: true,
                remedialRequired: true,
                startedAt: true,
                completedAt: true,
                lastAccessedAt: true,
                updatedAt: true,
              },
            })
          : [],
        microUnitIds.length > 0
          ? prisma.unitProgress.findMany({
              where: {
                userId,
                microUnitId: {
                  in: microUnitIds,
                },
              },
              select: {
                id: true,
                microUnitId: true,
                status: true,
                progressPercent: true,
                startedAt: true,
                completedAt: true,
                lastAccessedAt: true,
                updatedAt: true,
              },
            })
          : [],
        prisma.learningResource.findMany({
          where: {
            courseId: course.id,
            moduleId: null,
            microUnitId: null,
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
          select: {
            id: true,
            courseId: true,
            moduleId: true,
            microUnitId: true,
            title: true,
            description: true,
            type: true,
            url: true,
            sortOrder: true,
            createdAt: true,
          },
        }),
      ]);

    const moduleProgressMap = new Map(
      moduleProgresses.map((progress) => [progress.moduleId, progress]),
    );

    const unitProgressMap = new Map(
      unitProgresses.map((progress) => [progress.microUnitId, progress]),
    );

    const modules = learningModules.map((learningModule) => ({
      ...learningModule,
      progress: moduleProgressMap.get(learningModule.id) ?? null,
      units: learningModule.units.map((unit) => ({
        ...unit,
        progress: unitProgressMap.get(unit.id) ?? null,
      })),
    }));

    const totalRequiredUnits = modules.reduce(
      (sum, learningModule) =>
        sum + learningModule.units.filter((unit) => unit.isRequired).length,
      0,
    );

    const completedRequiredUnits = modules.reduce(
      (sum, learningModule) =>
        sum +
        learningModule.units.filter(
          (unit) => unit.isRequired && unit.progress?.status === "COMPLETED",
        ).length,
      0,
    );

    const overallProgress =
      totalRequiredUnits > 0
        ? Math.round((completedRequiredUnits / totalRequiredUnits) * 100)
        : 0;

    return NextResponse.json(
      {
        success: true,
        message: "Student learning data fetched successfully",
        data: {
          course,
          enrollment,
          summary: {
            totalModules: modules.length,
            totalUnits: modules.reduce(
              (sum, learningModule) => sum + learningModule.units.length,
              0,
            ),
            totalRequiredUnits,
            completedRequiredUnits,
            overallProgress,
          },
          resources: courseResources,
          modules,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "GET /api/students/[userId]/courses/[slug]/learning error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch student learning data",
        detail:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 },
    );
  }
}
