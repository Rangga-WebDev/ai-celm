/** @format */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      where: {
        isPublished: true,
      },
      orderBy: {
        createdAt: "desc",
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
        modules: {
          select: {
            id: true,
          },
        },
        enrollments: {
          select: {
            id: true,
          },
        },
      },
    });

    const result = courses.map((course) => ({
      id: course.id,
      title: course.title,
      slug: course.slug,
      code: course.code,
      description: course.description,
      coverImage: course.coverImage,
      isPublished: course.isPublished,
      lecturer: course.lecturer
        ? {
            id: course.lecturer.id,
            name: `${course.lecturer.firstName} ${course.lecturer.lastName}`,
            email: course.lecturer.email,
          }
        : null,
      totalModules: course.modules.length,
      totalEnrollments: course.enrollments.length,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    }));

    return NextResponse.json(
      {
        success: true,
        message: "Courses fetched successfully",
        data: result,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/courses error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch courses",
      },
      { status: 500 },
    );
  }
}
