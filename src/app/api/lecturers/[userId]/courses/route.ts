/** @format */

import { NextResponse } from "next/server";
import {
  EnrollmentStatus,
  ProgressStatus,
  Role,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

type Params = {
  params: Promise<{
    userId: string;
  }>;
};

export async function GET(_: Request, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);

    if (auth.response) {
      return auth.response;
    }

    const { userId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lecturer can only access their own courses",
        },
        { status: 403 },
      );
    }

    const lecturer = await prisma.user.findUnique({
      where: {
        id: userId,
      },
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
        {
          success: false,
          message: "Lecturer not found",
        },
        { status: 404 },
      );
    }

    const courses = await prisma.course.findMany({
      where: {
        lecturerId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        enrollments: {
          where: {
            status: EnrollmentStatus.ACTIVE,
          },
          orderBy: {
            enrolledAt: "desc",
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
        modules: {
          orderBy: {
            order: "asc",
          },
          include: {
            units: {
              select: {
                id: true,
                title: true,
                slug: true,
                unitType: true,
                isLocked: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            modules: true,
            resources: true,
            threads: true,
            projects: true,
          },
        },
      },
    });

    const courseData = await Promise.all(
      courses.map(async (course) => {
        const activeStudentIds = course.enrollments.map(
          (enrollment) => enrollment.userId,
        );

        const moduleIds = course.modules.map((module) => module.id);

        const moduleProgresses =
          activeStudentIds.length > 0 && moduleIds.length > 0
            ? await prisma.moduleProgress.findMany({
                where: {
                  userId: {
                    in: activeStudentIds,
                  },
                  moduleId: {
                    in: moduleIds,
                  },
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

        const averageProgress =
          moduleProgresses.length > 0
            ? Math.round(
                moduleProgresses.reduce(
                  (sum, item) => sum + item.progressPercent,
                  0,
                ) / moduleProgresses.length,
              )
            : 0;

        const masteryRows = moduleProgresses.filter(
          (item) => typeof item.masteryScore === "number",
        );

        const averageMastery =
          masteryRows.length > 0
            ? Number(
                (
                  masteryRows.reduce(
                    (sum, item) => sum + (item.masteryScore ?? 0),
                    0,
                  ) / masteryRows.length
                ).toFixed(2),
              )
            : null;

        const completedRows = moduleProgresses.filter(
          (item) => item.status === ProgressStatus.COMPLETED,
        ).length;

        const remedialRows = moduleProgresses.filter(
          (item) => item.remedialRequired,
        ).length;

        const totalUnits = course.modules.reduce(
          (sum, module) => sum + module.units.length,
          0,
        );

        const modules = course.modules.map((module) => {
          const rows = moduleProgresses.filter(
            (item) => item.moduleId === module.id,
          );

          const moduleAverageProgress =
            rows.length > 0
              ? Math.round(
                  rows.reduce((sum, item) => sum + item.progressPercent, 0) /
                    rows.length,
                )
              : 0;

          const completedStudents = rows.filter(
            (item) => item.status === ProgressStatus.COMPLETED,
          ).length;

          const remedialStudents = rows.filter(
            (item) => item.remedialRequired,
          ).length;

          return {
            id: module.id,
            title: module.title,
            slug: module.slug,
            description: module.description,
            order: module.order,
            status: module.status,
            isLocked: module.isLocked,
            estimatedMinutes: module.estimatedMinutes,
            masteryThreshold: module.masteryThreshold,
            totalUnits: module.units.length,
            averageProgress: moduleAverageProgress,
            completedStudents,
            remedialStudents,
          };
        });

        const studentsPreview = course.enrollments
          .slice(0, 6)
          .map((enrollment) => {
            const studentProgressRows = moduleProgresses.filter(
              (item) => item.userId === enrollment.userId,
            );

            const studentAverageProgress =
              studentProgressRows.length > 0
                ? Math.round(
                    studentProgressRows.reduce(
                      (sum, item) => sum + item.progressPercent,
                      0,
                    ) / studentProgressRows.length,
                  )
                : 0;

            const completedModules = studentProgressRows.filter(
              (item) => item.status === ProgressStatus.COMPLETED,
            ).length;

            const inProgressModules = studentProgressRows.filter(
              (item) => item.status === ProgressStatus.IN_PROGRESS,
            ).length;

            return {
              id: enrollment.user.id,
              name: `${enrollment.user.firstName} ${enrollment.user.lastName}`,
              email: enrollment.user.email,
              enrolledAt: enrollment.enrolledAt,
              averageProgress: studentAverageProgress,
              completedModules,
              inProgressModules,
            };
          });

        return {
          id: course.id,
          title: course.title,
          slug: course.slug,
          code: course.code,
          description: course.description,
          coverImage: course.coverImage,
          isPublished: course.isPublished,
          createdAt: course.createdAt,
          updatedAt: course.updatedAt,
          summary: {
            activeStudents: course.enrollments.length,
            totalEnrollments: course._count.enrollments,
            totalModules: course.modules.length,
            totalUnits,
            totalResources: course._count.resources,
            totalThreads: course._count.threads,
            totalProjects: course._count.projects,
            averageProgress,
            averageMastery,
            completedRows,
            remedialRows,
          },
          modules,
          studentsPreview,
        };
      }),
    );

    const summary = {
      totalCourses: courseData.length,
      publishedCourses: courseData.filter((course) => course.isPublished)
        .length,
      draftCourses: courseData.filter((course) => !course.isPublished).length,
      totalStudents: courseData.reduce(
        (sum, course) => sum + course.summary.activeStudents,
        0,
      ),
      totalModules: courseData.reduce(
        (sum, course) => sum + course.summary.totalModules,
        0,
      ),
      totalUnits: courseData.reduce(
        (sum, course) => sum + course.summary.totalUnits,
        0,
      ),
      averageProgress:
        courseData.length > 0
          ? Math.round(
              courseData.reduce(
                (sum, course) => sum + course.summary.averageProgress,
                0,
              ) / courseData.length,
            )
          : 0,
    };

    return NextResponse.json(
      {
        success: true,
        message: "Lecturer courses fetched successfully",
        data: {
          lecturer: {
            id: lecturer.id,
            name: `${lecturer.firstName} ${lecturer.lastName}`,
            email: lecturer.email,
          },
          summary,
          courses: courseData,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/lecturers/[userId]/courses error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch lecturer courses",
      },
      { status: 500 },
    );
  }
}
