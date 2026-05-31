/** @format */

import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser([Role.ADMIN]);

    if (auth.response) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "ALL";
    const lecturerId = searchParams.get("lecturerId")?.trim() ?? "";

    const courses = await prisma.course.findMany({
      where: {
        AND: [
          q
            ? {
                OR: [
                  { title: { contains: q, mode: "insensitive" } },
                  { slug: { contains: q, mode: "insensitive" } },
                  { code: { contains: q, mode: "insensitive" } },
                  { description: { contains: q, mode: "insensitive" } },
                ],
              }
            : {},
          status === "PUBLISHED"
            ? { isPublished: true }
            : status === "DRAFT"
              ? { isPublished: false }
              : {},
          lecturerId ? { lecturerId } : {},
        ],
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

    const lecturers = await prisma.user.findMany({
      where: {
        role: Role.LECTURER,
      },
      orderBy: [
        {
          firstName: "asc",
        },
        {
          lastName: "asc",
        },
      ],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Courses fetched successfully",
        data: {
          courses,
          lecturers,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/admin/courses error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch courses",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser([Role.ADMIN]);

    if (auth.response) {
      return auth.response;
    }

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

    const existingCourse = await prisma.course.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingCourse) {
      return NextResponse.json(
        {
          success: false,
          message: "Course slug already exists",
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

    const course = await prisma.course.create({
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
        message: "Course created successfully",
        data: course,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/admin/courses error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create course",
      },
      { status: 500 },
    );
  }
}
