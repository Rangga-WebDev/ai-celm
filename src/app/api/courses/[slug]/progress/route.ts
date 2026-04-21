/** @format */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "userId is required",
        },
        { status: 400 },
      );
    }

    const course = await prisma.course.findUnique({
      where: { slug },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: {
            units: {
              orderBy: { order: "asc" },
            },
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

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: course.id,
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        {
          success: false,
          message: "Student is not enrolled in this course",
        },
        { status: 404 },
      );
    }

    const moduleIds = course.modules.map((m) => m.id);
    const unitIds = course.modules.flatMap((m) => m.units.map((u) => u.id));

    const moduleProgresses = await prisma.moduleProgress.findMany({
      where: {
        userId,
        moduleId: { in: moduleIds },
      },
    });

    const unitProgresses = await prisma.unitProgress.findMany({
      where: {
        userId,
        microUnitId: { in: unitIds },
      },
    });

    const moduleProgressMap = new Map(
      moduleProgresses.map((item) => [item.moduleId, item]),
    );

    const unitProgressMap = new Map(
      unitProgresses.map((item) => [item.microUnitId, item]),
    );

    const modules = course.modules.map((module) => {
      const moduleProgress = moduleProgressMap.get(module.id);

      const units = module.units.map((unit) => {
        const unitProgress = unitProgressMap.get(unit.id);

        return {
          id: unit.id,
          title: unit.title,
          slug: unit.slug,
          order: unit.order,
          unitType: unit.unitType,
          estimatedMinutes: unit.estimatedMinutes,
          progress: unitProgress
            ? {
                status: unitProgress.status,
                progressPercent: unitProgress.progressPercent,
                score: unitProgress.score,
                attempts: unitProgress.attempts,
                isPassed: unitProgress.isPassed,
                remedialRequired: unitProgress.remedialRequired,
                startedAt: unitProgress.startedAt,
                completedAt: unitProgress.completedAt,
                lastAccessedAt: unitProgress.lastAccessedAt,
              }
            : {
                status: "NOT_STARTED",
                progressPercent: 0,
                score: null,
                attempts: 0,
                isPassed: false,
                remedialRequired: false,
                startedAt: null,
                completedAt: null,
                lastAccessedAt: null,
              },
        };
      });

      return {
        id: module.id,
        title: module.title,
        slug: module.slug,
        order: module.order,
        estimatedMinutes: module.estimatedMinutes,
        masteryThreshold: module.masteryThreshold,
        progress: moduleProgress
          ? {
              status: moduleProgress.status,
              progressPercent: moduleProgress.progressPercent,
              masteryScore: moduleProgress.masteryScore,
              isPassed: moduleProgress.isPassed,
              remedialRequired: moduleProgress.remedialRequired,
              startedAt: moduleProgress.startedAt,
              completedAt: moduleProgress.completedAt,
              lastAccessedAt: moduleProgress.lastAccessedAt,
            }
          : {
              status: "NOT_STARTED",
              progressPercent: 0,
              masteryScore: null,
              isPassed: false,
              remedialRequired: false,
              startedAt: null,
              completedAt: null,
              lastAccessedAt: null,
            },
        units,
      };
    });

    const totalModules = modules.length;
    const completedModules = modules.filter(
      (m) => m.progress.status === "COMPLETED",
    ).length;

    const overallProgress =
      totalModules > 0
        ? Math.round((completedModules / totalModules) * 100)
        : 0;

    return NextResponse.json(
      {
        success: true,
        message: "Student course progress fetched successfully",
        data: {
          userId,
          course: {
            id: course.id,
            title: course.title,
            slug: course.slug,
            code: course.code,
          },
          enrollment: {
            id: enrollment.id,
            status: enrollment.status,
            enrolledAt: enrollment.enrolledAt,
            completedAt: enrollment.completedAt,
          },
          summary: {
            totalModules,
            completedModules,
            overallProgress,
          },
          modules,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/courses/[slug]/progress error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch student progress",
      },
      { status: 500 },
    );
  }
}
