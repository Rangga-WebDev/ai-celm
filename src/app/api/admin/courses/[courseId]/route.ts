/** @format */

import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

type Params = {
  params: Promise<{
    courseId: string;
  }>;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function optionalText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

async function validateLecturer(lecturerId: string | null) {
  if (!lecturerId) return null;

  const lecturer = await prisma.user.findUnique({
    where: { id: lecturerId },
    select: {
      id: true,
      role: true,
    },
  });

  if (!lecturer || lecturer.role !== Role.LECTURER) {
    return null;
  }

  return lecturer.id;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.ADMIN]);

    if (auth.response) {
      return auth.response;
    }

    const { courseId } = await params;
    const body = await request.json();

    const title = String(body.title ?? "").trim();
    const rawSlug = String(body.slug ?? "").trim();
    const code = optionalText(body.code);
    const description = optionalText(body.description);
    const coverImage = optionalText(body.coverImage);
    const lecturerIdInput = optionalText(body.lecturerId);
    const isPublished = Boolean(body.isPublished);

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message: "Course title is required",
        },
        { status: 400 },
      );
    }

    const targetCourse = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
      select: {
        id: true,
      },
    });

    if (!targetCourse) {
      return NextResponse.json(
        {
          success: false,
          message: "Course not found",
        },
        { status: 404 },
      );
    }

    const slug = rawSlug ? slugify(rawSlug) : slugify(title);

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid course slug is required",
        },
        { status: 400 },
      );
    }

    const slugOwner = await prisma.course.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    });

    if (slugOwner && slugOwner.id !== courseId) {
      return NextResponse.json(
        {
          success: false,
          message: "Course slug already used by another course",
        },
        { status: 409 },
      );
    }

    const lecturerId = await validateLecturer(lecturerIdInput);

    if (lecturerIdInput && !lecturerId) {
      return NextResponse.json(
        {
          success: false,
          message: "Selected lecturer is invalid",
        },
        { status: 400 },
      );
    }

    const updatedCourse = await prisma.course.update({
      where: {
        id: courseId,
      },
      data: {
        title,
        slug,
        code,
        description,
        coverImage,
        lecturerId,
        isPublished,
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

    return NextResponse.json(
      {
        success: true,
        message: "Course updated successfully",
        data: updatedCourse,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("PATCH /api/admin/courses/[courseId] error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update course",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.ADMIN]);

    if (auth.response) {
      return auth.response;
    }

    const { courseId } = await params;

    const targetCourse = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
      select: {
        id: true,
      },
    });

    if (!targetCourse) {
      return NextResponse.json(
        {
          success: false,
          message: "Course not found",
        },
        { status: 404 },
      );
    }

    await prisma.course.delete({
      where: {
        id: courseId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Course deleted successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("DELETE /api/admin/courses/[courseId] error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete course",
      },
      { status: 500 },
    );
  }
}
