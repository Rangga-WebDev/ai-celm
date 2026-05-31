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
    unitId: string;
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

async function getOwnedModule(
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
    return null;
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
      courseId: true,
    },
  });

  return targetModule;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug, moduleId, unitId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lecturer can only update units from their own courses",
        },
        { status: 403 },
      );
    }

    const targetModule = await getOwnedModule(userId, slug, moduleId);

    if (!targetModule) {
      return NextResponse.json(
        {
          success: false,
          message: "Course or module not found",
        },
        { status: 404 },
      );
    }

    const targetUnit = await prisma.microUnit.findFirst({
      where: {
        id: unitId,
        moduleId: targetModule.id,
      },
      select: {
        id: true,
      },
    });

    if (!targetUnit) {
      return NextResponse.json(
        {
          success: false,
          message: "Micro unit not found in this module",
        },
        { status: 404 },
      );
    }

    const body = await request.json();

    const title = String(body.title ?? "").trim();
    const rawSlug = String(body.slug ?? "").trim();
    const description = optionalText(body.description);
    const content = optionalText(body.content);
    const order = toPositiveInt(body.order, 1);
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

    const slugOwner = await prisma.microUnit.findUnique({
      where: {
        moduleId_slug: {
          moduleId: targetModule.id,
          slug: unitSlug,
        },
      },
      select: {
        id: true,
      },
    });

    if (slugOwner && slugOwner.id !== unitId) {
      return NextResponse.json(
        {
          success: false,
          message: "Micro unit slug already used by another unit",
        },
        { status: 409 },
      );
    }

    const orderOwner = await prisma.microUnit.findUnique({
      where: {
        moduleId_order: {
          moduleId: targetModule.id,
          order,
        },
      },
      select: {
        id: true,
      },
    });

    if (orderOwner && orderOwner.id !== unitId) {
      return NextResponse.json(
        {
          success: false,
          message: "Micro unit order already used by another unit",
        },
        { status: 409 },
      );
    }

    const updatedUnit = await prisma.microUnit.update({
      where: {
        id: unitId,
      },
      data: {
        title,
        slug: unitSlug,
        description,
        content,
        order,
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
        message: "Micro unit updated successfully",
        data: updatedUnit,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "PATCH /api/lecturers/[userId]/courses/[slug]/modules/[moduleId]/units/[unitId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update micro unit",
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

    const { userId, slug, moduleId, unitId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lecturer can only delete units from their own courses",
        },
        { status: 403 },
      );
    }

    const targetModule = await getOwnedModule(userId, slug, moduleId);

    if (!targetModule) {
      return NextResponse.json(
        {
          success: false,
          message: "Course or module not found",
        },
        { status: 404 },
      );
    }

    const targetUnit = await prisma.microUnit.findFirst({
      where: {
        id: unitId,
        moduleId: targetModule.id,
      },
      select: {
        id: true,
      },
    });

    if (!targetUnit) {
      return NextResponse.json(
        {
          success: false,
          message: "Micro unit not found in this module",
        },
        { status: 404 },
      );
    }

    await prisma.microUnit.delete({
      where: {
        id: unitId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Micro unit deleted successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "DELETE /api/lecturers/[userId]/courses/[slug]/modules/[moduleId]/units/[unitId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete micro unit",
      },
      { status: 500 },
    );
  }
}
