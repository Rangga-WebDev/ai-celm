/** @format */

import { NextRequest, NextResponse } from "next/server";
import { CerAssignmentStatus, Prisma, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
  }>;
};

type TargetType = "COURSE" | "MODULE" | "UNIT";

const cerStatusOptions = Object.values(CerAssignmentStatus);

function isValidCerStatus(value: unknown): value is CerAssignmentStatus {
  return (
    typeof value === "string" &&
    cerStatusOptions.includes(value as CerAssignmentStatus)
  );
}

function isValidTargetType(value: unknown): value is TargetType {
  return value === "COURSE" || value === "MODULE" || value === "UNIT";
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

function parseDate(value: unknown) {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function buildRubric(rubricText: string | null) {
  if (!rubricText) {
    return Prisma.JsonNull;
  }

  return {
    note: rubricText,
  };
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

async function resolveCerTarget({
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
      moduleId: null,
      microUnitId: null,
      error: null,
    };
  }

  if (targetType === "MODULE") {
    if (!moduleId) {
      return {
        moduleId: null,
        microUnitId: null,
        error: "Module is required for module-level CER assignment",
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
        moduleId: null,
        microUnitId: null,
        error: "Selected module is not found in this course",
      };
    }

    return {
      moduleId: targetModule.id,
      microUnitId: null,
      error: null,
    };
  }

  if (!microUnitId) {
    return {
      moduleId: null,
      microUnitId: null,
      error: "Micro-unit is required for unit-level CER assignment",
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
      moduleId: null,
      microUnitId: null,
      error: "Selected micro-unit is not found in this course",
    };
  }

  return {
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
          message:
            "Lecturer can only access CER assignments from their own courses",
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

    const [modules, assignments] = await Promise.all([
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

      prisma.cerAssignment.findMany({
        where: {
          courseId: course.id,
        },
        orderBy: [
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
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              submissions: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        message: "CER assignments fetched successfully",
        data: {
          course,
          modules,
          assignments,
          statuses: cerStatusOptions,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "GET /api/lecturers/[userId]/courses/[slug]/cer error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch CER assignments",
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
          message:
            "Lecturer can only create CER assignments for their own courses",
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
    const rawSlug = String(body.slug ?? "").trim();
    const description = optionalText(body.description);
    const prompt = String(body.prompt ?? "").trim();
    const claimQuestion = optionalText(body.claimQuestion);
    const evidenceQuestion = optionalText(body.evidenceQuestion);
    const reasoningQuestion = optionalText(body.reasoningQuestion);
    const rubricText = optionalText(body.rubricText);
    const dueAt = parseDate(body.dueAt);
    const status = body.status ?? CerAssignmentStatus.DRAFT;
    const targetType = body.targetType ?? "COURSE";
    const moduleId = optionalText(body.moduleId);
    const microUnitId = optionalText(body.microUnitId);

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message: "CER assignment title is required",
        },
        { status: 400 },
      );
    }

    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          message: "CER prompt is required",
        },
        { status: 400 },
      );
    }

    if (!isValidCerStatus(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid CER status is required",
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

    const assignmentSlug = rawSlug ? slugify(rawSlug) : slugify(title);

    if (!assignmentSlug) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid CER assignment slug is required",
        },
        { status: 400 },
      );
    }

    const existingSlug = await prisma.cerAssignment.findUnique({
      where: {
        courseId_slug: {
          courseId: course.id,
          slug: assignmentSlug,
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
          message: "CER assignment slug already exists in this course",
        },
        { status: 409 },
      );
    }

    const target = await resolveCerTarget({
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

    const assignment = await prisma.cerAssignment.create({
      data: {
        courseId: course.id,
        moduleId: target.moduleId,
        microUnitId: target.microUnitId,
        createdById: userId,
        title,
        slug: assignmentSlug,
        description,
        prompt,
        claimQuestion,
        evidenceQuestion,
        reasoningQuestion,
        rubric: buildRubric(rubricText),
        dueAt,
        status,
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
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "CER assignment created successfully",
        data: assignment,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/lecturers/[userId]/courses/[slug]/cer error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create CER assignment",
      },
      { status: 500 },
    );
  }
}
