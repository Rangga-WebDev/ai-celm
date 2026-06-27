/** @format */

import { NextRequest, NextResponse } from "next/server";
import { ModuleStatus, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    moduleId: string;
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

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(1, Math.round(parsed));
}

function toNullablePositiveInt(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(1, Math.round(parsed));
}

function toMasteryThreshold(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 75;
  }

  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function isValidModuleStatus(value: unknown): value is ModuleStatus {
  return (
    value === ModuleStatus.DRAFT ||
    value === ModuleStatus.PUBLISHED ||
    value === ModuleStatus.ARCHIVED
  );
}

async function getOwnedCourseAndModule(
  userId: string,
  courseSlug: string,
  moduleId: string,
) {
  const course = await prisma.course.findFirst({
    where: {
      slug: courseSlug,
      lecturerId: userId,
    },
    select: {
      id: true,
      title: true,
      slug: true,
    },
  });

  if (!course) {
    return {
      course: null,
      module: null,
    };
  }

  const targetModule = await prisma.module.findFirst({
    where: {
      id: moduleId,
      courseId: course.id,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      order: true,
      estimatedMinutes: true,
      status: true,
      isLocked: true,
      unlockRule: true,
      masteryThreshold: true,
      courseId: true,
    },
  });

  return {
    course,
    module: targetModule,
  };
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug, moduleId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lecturer can only access their own course modules",
        },
        { status: 403 },
      );
    }

    const { course, module: targetModule } = await getOwnedCourseAndModule(
      userId,
      slug,
      moduleId,
    );

    if (!course || !targetModule) {
      return NextResponse.json(
        {
          success: false,
          message: "Course or module not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Module fetched successfully",
        data: {
          course,
          module: targetModule,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "GET /api/lecturers/[userId]/courses/[slug]/modules/[moduleId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch module",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug, moduleId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lecturer can only update their own course modules",
        },
        { status: 403 },
      );
    }

    const { course, module: targetModule } = await getOwnedCourseAndModule(
      userId,
      slug,
      moduleId,
    );

    if (!course || !targetModule) {
      return NextResponse.json(
        {
          success: false,
          message: "Course or module not found",
        },
        { status: 404 },
      );
    }

    const body = await request.json();

    const title = String(body.title ?? "").trim();
    const rawSlug = String(body.slug ?? "").trim();
    const description = optionalText(body.description);
    const estimatedMinutes = toNullablePositiveInt(body.estimatedMinutes);
    const statusInput = body.status ?? targetModule.status;
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

    const slugOwner = await prisma.module.findUnique({
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

    if (slugOwner && slugOwner.id !== moduleId) {
      return NextResponse.json(
        {
          success: false,
          message: "Module slug already used by another module",
        },
        { status: 409 },
      );
    }

    const order = toPositiveInt(body.order, targetModule.order);

    const orderOwner = await prisma.module.findUnique({
      where: {
        courseId_order: {
          courseId: course.id,
          order,
        },
      },
      select: {
        id: true,
      },
    });

    if (orderOwner && orderOwner.id !== moduleId) {
      return NextResponse.json(
        {
          success: false,
          message: "Module order already used by another module",
        },
        { status: 409 },
      );
    }

    const updatedModule = await prisma.module.update({
      where: {
        id: moduleId,
      },
      data: {
        title,
        slug: moduleSlug,
        description,
        order,
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
        message: "Module updated successfully",
        data: updatedModule,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "PATCH /api/lecturers/[userId]/courses/[slug]/modules/[moduleId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update module",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug, moduleId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lecturer can only delete their own course modules",
        },
        { status: 403 },
      );
    }

    const { course, module: targetModule } = await getOwnedCourseAndModule(
      userId,
      slug,
      moduleId,
    );

    if (!course || !targetModule) {
      return NextResponse.json(
        {
          success: false,
          message: "Course or module not found",
        },
        { status: 404 },
      );
    }

    await prisma.module.delete({
      where: {
        id: moduleId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Module deleted successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "DELETE /api/lecturers/[userId]/courses/[slug]/modules/[moduleId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete module",
      },
      { status: 500 },
    );
  }
}
