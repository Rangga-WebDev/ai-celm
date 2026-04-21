/** @format */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  EnrollmentStatus,
  ProgressStatus,
  Role,
} from "@/generated/prisma/client";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
  }>;
};

export async function GET(_: Request, { params }: Params) {
  try {
    const { userId, slug } = await params;

    const lecturer = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    if (!lecturer || lecturer.role !== Role.LECTURER) {
      return NextResponse.json(
        { success: false, message: "Lecturer not found" },
        { status: 404 },
      );
    }

    const course = await prisma.course.findFirst({
      where: {
        slug,
        lecturerId: userId,
      },
      include: {
        lecturer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        rps: true,
        cplMappings: {
          include: {
            cpl: true,
          },
        },
        cpmks: {
          orderBy: { order: "asc" },
          include: {
            subCpmks: {
              orderBy: { order: "asc" },
            },
          },
        },
        resources: {
          orderBy: { createdAt: "asc" },
        },
        modules: {
          orderBy: { order: "asc" },
          include: {
            units: {
              orderBy: { order: "asc" },
            },
          },
        },
        enrollments: {
          where: {
            status: EnrollmentStatus.ACTIVE,
          },
          orderBy: {
            enrolledAt: "asc",
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, message: "Course not found" },
        { status: 404 },
      );
    }

    const studentIds = course.enrollments.map((e) => e.userId);
    const moduleIds = course.modules.map((m) => m.id);

    const moduleProgresses =
      studentIds.length > 0 && moduleIds.length > 0
        ? await prisma.moduleProgress.findMany({
            where: {
              userId: { in: studentIds },
              moduleId: { in: moduleIds },
            },
            select: {
              userId: true,
              moduleId: true,
              status: true,
              progressPercent: true,
              masteryScore: true,
              isPassed: true,
              remedialRequired: true,
            },
          })
        : [];

    const moduleProgressMap = new Map(
      moduleProgresses.map((item) => [`${item.userId}:${item.moduleId}`, item]),
    );

    const modules = course.modules.map((module) => {
      const studentRows = course.enrollments.map((enrollment) => {
        const progress = moduleProgressMap.get(
          `${enrollment.userId}:${module.id}`,
        );

        return {
          studentId: enrollment.user.id,
          studentName: `${enrollment.user.firstName} ${enrollment.user.lastName}`,
          status: progress?.status ?? ProgressStatus.NOT_STARTED,
          progressPercent: progress?.progressPercent ?? 0,
          masteryScore: progress?.masteryScore ?? null,
          isPassed: progress?.isPassed ?? false,
          remedialRequired: progress?.remedialRequired ?? false,
        };
      });

      const avgProgress =
        studentRows.length > 0
          ? Math.round(
              studentRows.reduce((sum, row) => sum + row.progressPercent, 0) /
                studentRows.length,
            )
          : 0;

      const avgMastery =
        studentRows.filter((row) => row.masteryScore !== null).length > 0
          ? Number(
              (
                studentRows
                  .filter((row) => row.masteryScore !== null)
                  .reduce((sum, row) => sum + (row.masteryScore ?? 0), 0) /
                studentRows.filter((row) => row.masteryScore !== null).length
              ).toFixed(2),
            )
          : null;

      const completedStudents = studentRows.filter(
        (row) => row.status === ProgressStatus.COMPLETED,
      ).length;

      return {
        id: module.id,
        title: module.title,
        slug: module.slug,
        description: module.description,
        order: module.order,
        estimatedMinutes: module.estimatedMinutes,
        masteryThreshold: module.masteryThreshold,
        totalUnits: module.units.length,
        avgProgress,
        avgMastery,
        completedStudents,
        students: studentRows,
      };
    });

    const students = course.enrollments.map((enrollment) => {
      const moduleRows = course.modules.map((module) => {
        const progress = moduleProgressMap.get(
          `${enrollment.userId}:${module.id}`,
        );

        return {
          moduleId: module.id,
          moduleTitle: module.title,
          moduleSlug: module.slug,
          status: progress?.status ?? ProgressStatus.NOT_STARTED,
          progressPercent: progress?.progressPercent ?? 0,
          masteryScore: progress?.masteryScore ?? null,
        };
      });

      const completedModules = moduleRows.filter(
        (row) => row.status === ProgressStatus.COMPLETED,
      ).length;

      const inProgressModules = moduleRows.filter(
        (row) => row.status === ProgressStatus.IN_PROGRESS,
      ).length;

      const averageProgress =
        moduleRows.length > 0
          ? Math.round(
              moduleRows.reduce((sum, row) => sum + row.progressPercent, 0) /
                moduleRows.length,
            )
          : 0;

      return {
        id: enrollment.user.id,
        name: `${enrollment.user.firstName} ${enrollment.user.lastName}`,
        email: enrollment.user.email,
        enrolledAt: enrollment.enrolledAt,
        progress: {
          totalModules: course.modules.length,
          completedModules,
          inProgressModules,
          averageProgress,
        },
        moduleRows,
      };
    });

    const summary = {
      totalStudents: students.length,
      totalModules: modules.length,
      totalUnits: course.modules.reduce(
        (sum, module) => sum + module.units.length,
        0,
      ),
      averageProgress:
        modules.length > 0
          ? Math.round(
              modules.reduce((sum, module) => sum + module.avgProgress, 0) /
                modules.length,
            )
          : 0,
    };

    return NextResponse.json(
      {
        success: true,
        message: "Lecturer course detail fetched successfully",
        data: {
          lecturer: {
            id: lecturer.id,
            name: `${lecturer.firstName} ${lecturer.lastName}`,
            email: lecturer.email,
          },
          course: {
            id: course.id,
            title: course.title,
            slug: course.slug,
            code: course.code,
            description: course.description,
            isPublished: course.isPublished,
            lecturer: course.lecturer
              ? {
                  id: course.lecturer.id,
                  name: `${course.lecturer.firstName} ${course.lecturer.lastName}`,
                  email: course.lecturer.email,
                }
              : null,
            rps: course.rps,
            cpls: course.cplMappings.map((item) => item.cpl),
            cpmks: course.cpmks,
            resources: course.resources,
          },
          summary,
          modules,
          students,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/lecturers/[userId]/courses/[slug] error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch lecturer course detail",
      },
      { status: 500 },
    );
  }
}
