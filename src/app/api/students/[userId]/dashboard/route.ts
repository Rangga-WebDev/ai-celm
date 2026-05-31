/** @format */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  EnrollmentStatus,
  Role,
  ProgressStatus,
} from "@/generated/prisma/client";
import { requireUser, forbiddenResponse } from "@/lib/api-guard";

type Params = {
  params: Promise<{
    userId: string;
  }>;
};

export async function GET(_: Request, { params }: Params) {
  try {
    const { userId } = await params;

    const auth = await requireUser([Role.STUDENT, Role.ADMIN]);

    if (auth.response) {
      return auth.response;
    }

    const currentUser = auth.user;

    if (currentUser.role === Role.STUDENT && currentUser.id !== userId) {
      return forbiddenResponse("Student can only access their own dashboard");
    }

    const targetUserId =
      currentUser.role === Role.ADMIN ? userId : currentUser.id;

    const student = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    if (!student || student.role !== Role.STUDENT) {
      return NextResponse.json(
        {
          success: false,
          message: "Student not found",
        },
        { status: 404 },
      );
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: targetUserId,
        status: EnrollmentStatus.ACTIVE,
      },
      include: {
        course: {
          include: {
            lecturer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            modules: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                slug: true,
                order: true,
                estimatedMinutes: true,
              },
            },
          },
        },
      },
      orderBy: {
        enrolledAt: "desc",
      },
    });

    const allModuleIds = enrollments.flatMap((enrollment) =>
      enrollment.course.modules.map((module) => module.id),
    );

    const moduleProgresses =
      allModuleIds.length > 0
        ? await prisma.moduleProgress.findMany({
            where: {
              userId: targetUserId,
              moduleId: { in: allModuleIds },
            },
            select: {
              moduleId: true,
              status: true,
              progressPercent: true,
              masteryScore: true,
              isPassed: true,
              remedialRequired: true,
              lastAccessedAt: true,
              completedAt: true,
            },
          })
        : [];

    const moduleProgressMap = new Map(
      moduleProgresses.map((item) => [item.moduleId, item]),
    );

    const courses = enrollments.map((enrollment) => {
      const { course } = enrollment;

      const totalModules = course.modules.length;

      const completedModules = course.modules.filter((module) => {
        const progress = moduleProgressMap.get(module.id);
        return progress?.status === ProgressStatus.COMPLETED;
      }).length;

      const inProgressModules = course.modules.filter((module) => {
        const progress = moduleProgressMap.get(module.id);
        return progress?.status === ProgressStatus.IN_PROGRESS;
      }).length;

      const overallProgress =
        totalModules > 0
          ? Math.round((completedModules / totalModules) * 100)
          : 0;

      const nextModule =
        course.modules.find((module) => {
          const progress = moduleProgressMap.get(module.id);
          return !progress || progress.status !== ProgressStatus.COMPLETED;
        }) ?? null;

      return {
        enrollmentId: enrollment.id,
        enrolledAt: enrollment.enrolledAt,
        course: {
          id: course.id,
          title: course.title,
          slug: course.slug,
          code: course.code,
          description: course.description,
          coverImage: course.coverImage,
          lecturer: course.lecturer
            ? {
                id: course.lecturer.id,
                name: `${course.lecturer.firstName} ${course.lecturer.lastName}`,
                email: course.lecturer.email,
              }
            : null,
          summary: {
            totalModules,
            completedModules,
            inProgressModules,
            overallProgress,
          },
          nextModule: nextModule
            ? {
                id: nextModule.id,
                title: nextModule.title,
                slug: nextModule.slug,
                order: nextModule.order,
              }
            : null,
        },
      };
    });

    const totalCourses = courses.length;
    const completedCourses = courses.filter(
      (item) => item.course.summary.overallProgress === 100,
    ).length;

    return NextResponse.json(
      {
        success: true,
        message: "Student dashboard fetched successfully",
        data: {
          student: {
            id: student.id,
            name: `${student.firstName} ${student.lastName}`,
            email: student.email,
          },
          summary: {
            totalCourses,
            completedCourses,
            activeCourses: totalCourses - completedCourses,
          },
          courses,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/students/[userId]/dashboard error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch student dashboard",
      },
      { status: 500 },
    );
  }
}
