/** @format */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_: Request, { params }: Params) {
  try {
    const { slug } = await params;

    const course = await prisma.course.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        slug: true,
        modules: {
          orderBy: {
            order: "asc",
          },
          include: {
            units: {
              orderBy: {
                order: "asc",
              },
              select: {
                id: true,
              },
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

    const result = course.modules.map((module) => ({
      id: module.id,
      title: module.title,
      slug: module.slug,
      description: module.description,
      order: module.order,
      estimatedMinutes: module.estimatedMinutes,
      status: module.status,
      isLocked: module.isLocked,
      masteryThreshold: module.masteryThreshold,
      totalUnits: module.units.length,
      createdAt: module.createdAt,
      updatedAt: module.updatedAt,
    }));

    return NextResponse.json(
      {
        success: true,
        message: "Modules fetched successfully",
        data: {
          courseId: course.id,
          courseTitle: course.title,
          courseSlug: course.slug,
          modules: result,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/courses/[slug]/modules error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch modules",
      },
      { status: 500 },
    );
  }
}
