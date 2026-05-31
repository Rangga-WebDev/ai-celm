/** @format */

import { NextRequest, NextResponse } from "next/server";
import { Role, UnitType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    moduleId: string;
  }>;
};

const unitTypeOptions = Object.values(UnitType);

function isValidUnitType(value: unknown): value is UnitType {
  return (
    typeof value === "string" && unitTypeOptions.includes(value as UnitType)
  );
}

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
      code: true,
      description: true,
      isPublished: true,
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
      status: true,
      isLocked: true,
      estimatedMinutes: true,
      masteryThreshold: true,
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
          message: "Lecturer can only access units from their own courses",
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

    const units = await prisma.microUnit.findMany({
      where: {
        moduleId: targetModule.id,
      },
      orderBy: {
        order: "asc",
      },
      include: {
        _count: {
          select: {
            progresses: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Micro units fetched successfully",
        data: {
          course,
          module: targetModule,
          units,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "GET /api/lecturers/[userId]/courses/[slug]/modules/[moduleId]/units error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch micro units",
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

    const { userId, slug, moduleId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lecturer can only create units for their own courses",
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
    const content = optionalText(body.content);
    const estimatedMinutes = toNullablePositiveInt(body.estimatedMinutes);
    const unitTypeInput = body.unitType ?? UnitType.LESSON;
    const isRequired =
      body.isRequired === undefined ? true : Boolean(body.isRequired);
    const isLocked = Boolean(body.isLocked);
    const masteryThreshold = toMasteryThreshold(body.masteryThreshold);

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message: "Micro unit title is required",
        },
        { status: 400 },
      );
    }

    if (!isValidUnitType(unitTypeInput)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid micro unit type is required",
        },
        { status: 400 },
      );
    }

    const unitSlug = rawSlug ? slugify(rawSlug) : slugify(title);

    if (!unitSlug) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid micro unit slug is required",
        },
        { status: 400 },
      );
    }

    const existingSlug = await prisma.microUnit.findUnique({
      where: {
        moduleId_slug: {
          moduleId: module.id,
          slug: unitSlug,
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
          message: "Micro unit slug already exists in this module",
        },
        { status: 409 },
      );
    }

    const lastUnit = await prisma.microUnit.findFirst({
      where: {
        moduleId: module.id,
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
        ? (lastUnit?.order ?? 0) + 1
        : toPositiveInt(body.order, (lastUnit?.order ?? 0) + 1);

    const existingOrder = await prisma.microUnit.findUnique({
      where: {
        moduleId_order: {
          moduleId: module.id,
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
          message: "Micro unit order already exists in this module",
        },
        { status: 409 },
      );
    }

    const unit = await prisma.microUnit.create({
      data: {
        moduleId: module.id,
        title,
        slug: unitSlug,
        description,
        content,
        order: requestedOrder,
        estimatedMinutes,
        unitType: unitTypeInput,
        isRequired,
        isLocked,
        masteryThreshold,
      },
      include: {
        _count: {
          select: {
            progresses: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Micro unit created successfully",
        data: unit,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/lecturers/[userId]/courses/[slug]/modules/[moduleId]/units error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create micro unit",
      },
      { status: 500 },
    );
  }
}
