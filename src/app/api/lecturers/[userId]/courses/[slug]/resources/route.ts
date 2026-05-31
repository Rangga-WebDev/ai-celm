/** @format */

import { NextRequest, NextResponse } from "next/server";
import { ResourceType, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
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
      code: true,
      description: true,
      isPublished: true,
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
          message: "Lecturer can only access resources from their own courses",
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

    const [modules, resources] = await Promise.all([
      prisma.module.findMany({
        where: {
          courseId: course.id,
        },
        orderBy: {
          order: "asc",
        },
        select: {
          id: true,
          title: true,
          slug: true,
          order: true,
          status: true,
          units: {
            orderBy: {
              order: "asc",
            },
            select: {
              id: true,
              title: true,
              slug: true,
              order: true,
              unitType: true,
              moduleId: true,
            },
          },
        },
      }),

      prisma.learningResource.findMany({
        where: {
          OR: [
            {
              courseId: course.id,
            },
            {
              module: {
                courseId: course.id,
              },
            },
            {
              microUnit: {
                module: {
                  courseId: course.id,
                },
              },
            },
          ],
        },
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            createdAt: "desc",
          },
        ],
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
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        message: "Learning resources fetched successfully",
        data: {
          course,
          modules,
          resources,
          resourceTypes: resourceTypeOptions,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "GET /api/lecturers/[userId]/courses/[slug]/resources error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch learning resources",
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
          message: "Lecturer can only create resources for their own courses",
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

    const resource = await prisma.learningResource.create({
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
        message: "Learning resource created successfully",
        data: resource,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/lecturers/[userId]/courses/[slug]/resources error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create learning resource",
      },
      { status: 500 },
    );
  }
}
