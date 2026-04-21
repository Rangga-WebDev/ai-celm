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
  }>;
};

export async function GET(_: Request, { params }: Params) {
  try {
    const { userId } = await params;

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
              },
            },
          },
        },
      },
    });

    const courseData = await Promise.all(
      courses.map(async (course) => {
        const moduleIds = course.modules.map((module) => module.id);
        const activeStudentIds = course.enrollments.map(
          (enrollment) => enrollment.userId,
        );

        const moduleProgresses =
          moduleIds.length > 0 && activeStudentIds.length > 0
            ? await prisma.moduleProgress.findMany({
                where: {
                  moduleId: { in: moduleIds },
                  userId: { in: activeStudentIds },
                },
                select: {
                  userId: true,
                  moduleId: true,
                  status: true,
                  progressPercent: true,
                  masteryScore: true,
                  isPassed: true,
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

        const averageMastery =
          moduleProgresses.filter((item) => item.masteryScore !== null).length >
          0
            ? Number(
                (
                  moduleProgresses
                    .filter((item) => item.masteryScore !== null)
                    .reduce((sum, item) => sum + (item.masteryScore ?? 0), 0) /
                  moduleProgresses.filter((item) => item.masteryScore !== null)
                    .length
                ).toFixed(2),
              )
            : null;

        const studentRows = course.enrollments.map((enrollment) => {
          const studentModuleProgresses = moduleProgresses.filter(
            (item) => item.userId === enrollment.userId,
          );

          const completedModules = studentModuleProgresses.filter(
            (item) => item.status === ProgressStatus.COMPLETED,
          ).length;

          const inProgressModules = studentModuleProgresses.filter(
            (item) => item.status === ProgressStatus.IN_PROGRESS,
          ).length;

          const studentAverageProgress =
            studentModuleProgresses.length > 0
              ? Math.round(
                  studentModuleProgresses.reduce(
                    (sum, item) => sum + item.progressPercent,
                    0,
                  ) / studentModuleProgresses.length,
                )
              : 0;

          return {
            id: enrollment.user.id,
            name: `${enrollment.user.firstName} ${enrollment.user.lastName}`,
            email: enrollment.user.email,
            enrolledAt: enrollment.enrolledAt,
            progress: {
              completedModules,
              inProgressModules,
              totalModules: course.modules.length,
              averageProgress: studentAverageProgress,
            },
          };
        });

        const completedStudents = studentRows.filter(
          (student) =>
            student.progress.totalModules > 0 &&
            student.progress.completedModules === student.progress.totalModules,
        ).length;

        return {
          id: course.id,
          title: course.title,
          slug: course.slug,
          code: course.code,
          description: course.description,
          isPublished: course.isPublished,
          totalStudents: course.enrollments.length,
          totalModules: course.modules.length,
          totalUnits: course.modules.reduce(
            (sum, module) => sum + module.units.length,
            0,
          ),
          averageProgress,
          averageMastery,
          completedStudents,
          students: studentRows,
        };
      }),
    );

    const totalCourses = courseData.length;
    const totalStudents = courseData.reduce(
      (sum, course) => sum + course.totalStudents,
      0,
    );
    const totalModules = courseData.reduce(
      (sum, course) => sum + course.totalModules,
      0,
    );
    const totalUnits = courseData.reduce(
      (sum, course) => sum + course.totalUnits,
      0,
    );

    const averageCourseProgress =
      courseData.length > 0
        ? Math.round(
            courseData.reduce(
              (sum, course) => sum + course.averageProgress,
              0,
            ) / courseData.length,
          )
        : 0;

    return NextResponse.json(
      {
        success: true,
        message: "Lecturer dashboard fetched successfully",
        data: {
          lecturer: {
            id: lecturer.id,
            name: `${lecturer.firstName} ${lecturer.lastName}`,
            email: lecturer.email,
          },
          summary: {
            totalCourses,
            totalStudents,
            totalModules,
            totalUnits,
            averageCourseProgress,
          },
          courses: courseData,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/lecturers/[userId]/dashboard error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch lecturer dashboard",
      },
      { status: 500 },
    );
  }
}
