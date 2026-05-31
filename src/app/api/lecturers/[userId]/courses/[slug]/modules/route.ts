/** @format */

import { NextRequest, NextResponse } from "next/server";
import { ModuleStatus, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
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

function toPositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.round(parsed));
}

function toNullablePositiveInt(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(1, Math.round(parsed));
}

function toMasteryThreshold(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 75;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function isValidModuleStatus(value: unknown): value is ModuleStatus {
  return (
    value === ModuleStatus.DRAFT ||
    value === ModuleStatus.PUBLISHED ||
    value === ModuleStatus.ARCHIVED
  );
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lecturer can only access their own course modules",
        },
        { status: 403 },
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
        modules: {
          orderBy: {
            order: "asc",
          },
          include: {
            _count: {
              select: {
                units: true,
                progresses: true,
              },
            },
            units: {
              orderBy: {
                order: "asc",
              },
              select: {
                id: true,
                title: true,
                slug: true,
                unitType: true,
                order: true,
                isLocked: true,
                estimatedMinutes: true,
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

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          message: "Course not found or you are not assigned to this course",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Course modules fetched successfully",
        data: {
          course: {
            id: course.id,
            title: course.title,
            slug: course.slug,
            code: course.code,
            description: course.description,
            isPublished: course.isPublished,
            lecturer: course.lecturer,
            counts: course._count,
          },
          modules: course.modules,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "GET /api/lecturers/[userId]/courses/[slug]/modules error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch modules",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lecturer can only create modules for their own courses",
        },
        { status: 403 },
      );
    }

    const course = await prisma.course.findFirst({
      where: {
        slug,
        lecturerId: userId,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          message: "Course not found or you are not assigned to this course",
        },
        { status: 404 },
      );
    }

    const body = await request.json();

    const title = String(body.title ?? "").trim();
    const rawSlug = String(body.slug ?? "").trim();
    const description = optionalText(body.description);
    const estimatedMinutes = toNullablePositiveInt(body.estimatedMinutes);
    const statusInput = body.status ?? ModuleStatus.DRAFT;
    const isLocked = Boolean(body.isLocked);
    const unlockRule = optionalText(body.unlockRule);
    const masteryThreshold = toMasteryThreshold(body.masteryThreshold);

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message: "Module title is required",
        },
        { status: 400 },
      );
    }

    if (!isValidModuleStatus(statusInput)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid module status is required",
        },
        { status: 400 },
      );
    }

    const moduleSlug = rawSlug ? slugify(rawSlug) : slugify(title);

    if (!moduleSlug) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid module slug is required",
        },
        { status: 400 },
      );
    }

    const existingSlug = await prisma.module.findUnique({
      where: {
        courseId_slug: {
          courseId: course.id,
          slug: moduleSlug,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingSlug) {
      return NextResponse.json(
        {
          success: false,
          message: "Module slug already exists in this course",
        },
        { status: 409 },
      );
    }

    const lastModule = await prisma.module.findFirst({
      where: {
        courseId: course.id,
      },
      orderBy: {
        order: "desc",
      },
      select: {
        order: true,
      },
    });

    const requestedOrder =
      body.order === null || body.order === undefined || body.order === ""
        ? (lastModule?.order ?? 0) + 1
        : toPositiveInt(body.order, (lastModule?.order ?? 0) + 1);

    const existingOrder = await prisma.module.findUnique({
      where: {
        courseId_order: {
          courseId: course.id,
          order: requestedOrder,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingOrder) {
      return NextResponse.json(
        {
          success: false,
          message: "Module order already exists in this course",
        },
        { status: 409 },
      );
    }

    const createdModule = await prisma.module.create({
      data: {
        courseId: course.id,
        title,
        slug: moduleSlug,
        description,
        order: requestedOrder,
        estimatedMinutes,
        status: statusInput,
        isLocked,
        unlockRule: unlockRule ?? undefined,
        masteryThreshold,
      },
      include: {
        _count: {
          select: {
            units: true,
            progresses: true,
          },
        },
        units: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Module created successfully",
        data: createdModule,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/lecturers/[userId]/courses/[slug]/modules error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create module",
      },
      { status: 500 },
    );
  }
}
