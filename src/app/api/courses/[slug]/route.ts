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
          orderBy: {
            order: "asc",
          },
          include: {
            cplMappings: {
              include: {
                cpl: true,
              },
            },
            subCpmks: {
              orderBy: {
                order: "asc",
              },
            },
          },
        },
        resources: {
          orderBy: {
            createdAt: "asc",
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

    return NextResponse.json(
      {
        success: true,
        message: "Course detail fetched successfully",
        data: {
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
          rps: course.rps,
          cpls: course.cplMappings.map((item) => item.cpl),
          cpmks: course.cpmks,
          resources: course.resources,
          createdAt: course.createdAt,
          updatedAt: course.updatedAt,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/courses/[slug] error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch course detail",
      },
      { status: 500 },
    );
  }
}
