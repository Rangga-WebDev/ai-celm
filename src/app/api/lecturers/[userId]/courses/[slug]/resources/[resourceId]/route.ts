/** @format */

import { NextRequest, NextResponse } from "next/server";
import { ResourceType, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    resourceId: string;
  }>;
};

type TargetType = "COURSE" | "MODULE" | "UNIT";

const resourceTypeOptions = Object.values(ResourceType);

function isValidResourceType(value: unknown): value is ResourceType {
  return (
    typeof value === "string" &&
    resourceTypeOptions.includes(value as ResourceType)
  );
}

function isValidTargetType(value: unknown): value is TargetType {
  return value === "COURSE" || value === "MODULE" || value === "UNIT";
}

function optionalText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function toNullableInt(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(1, Math.round(parsed));
}

async function getOwnedCourse(userId: string, slug: string) {
  return prisma.course.findFirst({
    where: {
      slug,
      lecturerId: userId,
    },
    select: {
      id: true,
      title: true,
      slug: true,
    },
  });
}

async function getOwnedResource(resourceId: string, courseId: string) {
  return prisma.learningResource.findFirst({
    where: {
      id: resourceId,
      OR: [
        {
          courseId,
        },
        {
          module: {
            courseId,
          },
        },
        {
          microUnit: {
            module: {
              courseId,
            },
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });
}

async function resolveResourceTarget({
  courseId,
  targetType,
  moduleId,
  microUnitId,
}: {
  courseId: string;
  targetType: TargetType;
  moduleId: string | null;
  microUnitId: string | null;
}) {
  if (targetType === "COURSE") {
    return {
      courseId,
      moduleId: null,
      microUnitId: null,
      error: null,
    };
  }

  if (targetType === "MODULE") {
    if (!moduleId) {
      return {
        courseId: null,
        moduleId: null,
        microUnitId: null,
        error: "Module is required for module-level resource",
      };
    }

    const targetModule = await prisma.module.findFirst({
      where: {
        id: moduleId,
        courseId,
      },
      select: {
        id: true,
      },
    });

    if (!targetModule) {
      return {
        courseId: null,
        moduleId: null,
        microUnitId: null,
        error: "Selected module is not found in this course",
      };
    }

    return {
      courseId,
      moduleId: targetModule.id,
      microUnitId: null,
      error: null,
    };
  }

  if (!microUnitId) {
    return {
      courseId: null,
      moduleId: null,
      microUnitId: null,
      error: "Micro-unit is required for unit-level resource",
    };
  }

  const targetUnit = await prisma.microUnit.findFirst({
    where: {
      id: microUnitId,
      module: {
        courseId,
      },
    },
    select: {
      id: true,
      moduleId: true,
    },
  });

  if (!targetUnit) {
    return {
      courseId: null,
      moduleId: null,
      microUnitId: null,
      error: "Selected micro-unit is not found in this course",
    };
  }

  return {
    courseId,
    moduleId: targetUnit.moduleId,
    microUnitId: targetUnit.id,
    error: null,
  };
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug, resourceId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lecturer can only update resources from their own courses",
        },
        { status: 403 },
      );
    }

    const course = await getOwnedCourse(userId, slug);

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          message: "Course not found or you are not assigned to this course",
        },
        { status: 404 },
      );
    }

    const ownedResource = await getOwnedResource(resourceId, course.id);

    if (!ownedResource) {
      return NextResponse.json(
        {
          success: false,
          message: "Resource not found in this course",
        },
        { status: 404 },
      );
    }

    const body = await request.json();

    const title = String(body.title ?? "").trim();
    const description = optionalText(body.description);
    const url = String(body.url ?? "").trim();
    const type = body.type ?? ResourceType.LINK;
    const targetType = body.targetType ?? "COURSE";
    const moduleId = optionalText(body.moduleId);
    const microUnitId = optionalText(body.microUnitId);
    const sortOrder = toNullableInt(body.sortOrder);

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message: "Resource title is required",
        },
        { status: 400 },
      );
    }

    if (!url) {
      return NextResponse.json(
        {
          success: false,
          message: "Resource URL is required",
        },
        { status: 400 },
      );
    }

    if (!isValidResourceType(type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid resource type is required",
        },
        { status: 400 },
      );
    }

    if (!isValidTargetType(targetType)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid target type is required",
        },
        { status: 400 },
      );
    }

    const target = await resolveResourceTarget({
      courseId: course.id,
      targetType,
      moduleId,
      microUnitId,
    });

    if (target.error) {
      return NextResponse.json(
        {
          success: false,
          message: target.error,
        },
        { status: 400 },
      );
    }

    const updatedResource = await prisma.learningResource.update({
      where: {
        id: resourceId,
      },
      data: {
        courseId: target.courseId,
        moduleId: target.moduleId,
        microUnitId: target.microUnitId,
        title,
        description,
        type,
        url,
        sortOrder,
        uploadedById: userId,
      },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            slug: true,
            order: true,
          },
        },
        microUnit: {
          select: {
            id: true,
            title: true,
            slug: true,
            order: true,
            moduleId: true,
            unitType: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Learning resource updated successfully",
        data: updatedResource,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "PATCH /api/lecturers/[userId]/courses/[slug]/resources/[resourceId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update learning resource",
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

    const { userId, slug, resourceId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lecturer can only delete resources from their own courses",
        },
        { status: 403 },
      );
    }

    const course = await getOwnedCourse(userId, slug);

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          message: "Course not found or you are not assigned to this course",
        },
        { status: 404 },
      );
    }

    const ownedResource = await getOwnedResource(resourceId, course.id);

    if (!ownedResource) {
      return NextResponse.json(
        {
          success: false,
          message: "Resource not found in this course",
        },
        { status: 404 },
      );
    }

    await prisma.learningResource.delete({
      where: {
        id: resourceId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Learning resource deleted successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "DELETE /api/lecturers/[userId]/courses/[slug]/resources/[resourceId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete learning resource",
      },
      { status: 500 },
    );
  }
}
