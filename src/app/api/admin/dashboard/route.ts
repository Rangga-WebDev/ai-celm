/** @format */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  EnrollmentStatus,
  ModuleStatus,
  Role,
} from "@/generated/prisma/client";

export async function GET() {
  try {
    const [
      totalStudents,
      totalLecturers,
      totalAdmins,
      totalCourses,
      publishedCourses,
      unpublishedCourses,
      totalEnrollments,
      activeEnrollments,
      totalModules,
      publishedModules,
      totalUnits,
      latestCourses,
      latestLecturers,
      latestStudents,
    ] = await Promise.all([
      prisma.user.count({
        where: { role: Role.STUDENT },
      }),
      prisma.user.count({
        where: { role: Role.LECTURER },
      }),
      prisma.user.count({
        where: { role: Role.ADMIN },
      }),
      prisma.course.count(),
      prisma.course.count({
        where: { isPublished: true },
      }),
      prisma.course.count({
        where: { isPublished: false },
      }),
      prisma.enrollment.count(),
      prisma.enrollment.count({
        where: { status: EnrollmentStatus.ACTIVE },
      }),
      prisma.module.count(),
      prisma.module.count({
        where: { status: ModuleStatus.PUBLISHED },
      }),
      prisma.microUnit.count(),
      prisma.course.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
        include: {
          lecturer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          enrollments: {
            where: {
              status: EnrollmentStatus.ACTIVE,
            },
            select: {
              id: true,
            },
          },
          modules: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      }),
      prisma.user.findMany({
        where: {
          role: Role.LECTURER,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          createdAt: true,
          taughtCourses: {
            select: {
              id: true,
            },
          },
        },
      }),
      prisma.user.findMany({
        where: {
          role: Role.STUDENT,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          createdAt: true,
          enrollments: {
            where: {
              status: EnrollmentStatus.ACTIVE,
            },
            select: {
              id: true,
            },
          },
        },
      }),
    ]);

    const courses = latestCourses.map((course) => {
      const publishedModuleCount = course.modules.filter(
        (module) => module.status === ModuleStatus.PUBLISHED,
      ).length;

      return {
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
        totalEnrollments: course.enrollments.length,
        totalModules: course.modules.length,
        publishedModules: publishedModuleCount,
        createdAt: course.createdAt,
      };
    });

    const lecturers = latestLecturers.map((lecturer) => ({
      id: lecturer.id,
      name: `${lecturer.firstName} ${lecturer.lastName}`,
      email: lecturer.email,
      totalCourses: lecturer.taughtCourses.length,
      createdAt: lecturer.createdAt,
    }));

    const students = latestStudents.map((student) => ({
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      email: student.email,
      activeEnrollments: student.enrollments.length,
      createdAt: student.createdAt,
    }));

    return NextResponse.json(
      {
        success: true,
        message: "Admin dashboard fetched successfully",
        data: {
          summary: {
            totalStudents,
            totalLecturers,
            totalAdmins,
            totalCourses,
            publishedCourses,
            unpublishedCourses,
            totalEnrollments,
            activeEnrollments,
            totalModules,
            publishedModules,
            totalUnits,
          },
          courses,
          lecturers,
          students,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/admin/dashboard error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch admin dashboard",
      },
      { status: 500 },
    );
  }
}
