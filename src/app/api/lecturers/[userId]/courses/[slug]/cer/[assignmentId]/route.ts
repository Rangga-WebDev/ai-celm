/** @format */

import { NextRequest, NextResponse } from "next/server";
import { CerAssignmentStatus, Prisma, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    assignmentId: string;
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
    },
  });
}

async function getOwnedAssignment(assignmentId: string, courseId: string) {
  return prisma.cerAssignment.findFirst({
    where: {
      id: assignmentId,
      courseId,
    },
    select: {
      id: true,
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

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug, assignmentId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Lecturer can only update CER assignments from their own courses",
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

    const ownedAssignment = await getOwnedAssignment(assignmentId, course.id);

    if (!ownedAssignment) {
      return NextResponse.json(
        {
          success: false,
          message: "CER assignment not found in this course",
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

    const slugOwner = await prisma.cerAssignment.findUnique({
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

    if (slugOwner && slugOwner.id !== assignmentId) {
      return NextResponse.json(
        {
          success: false,
          message: "CER assignment slug already used by another assignment",
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

    const updatedAssignment = await prisma.cerAssignment.update({
      where: {
        id: assignmentId,
      },
      data: {
        moduleId: target.moduleId,
        microUnitId: target.microUnitId,
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
        message: "CER assignment updated successfully",
        data: updatedAssignment,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "PATCH /api/lecturers/[userId]/courses/[slug]/cer/[assignmentId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update CER assignment",
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

    const { userId, slug, assignmentId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Lecturer can only delete CER assignments from their own courses",
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

    const ownedAssignment = await getOwnedAssignment(assignmentId, course.id);

    if (!ownedAssignment) {
      return NextResponse.json(
        {
          success: false,
          message: "CER assignment not found in this course",
        },
        { status: 404 },
      );
    }

    await prisma.cerAssignment.delete({
      where: {
        id: assignmentId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "CER assignment deleted successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "DELETE /api/lecturers/[userId]/courses/[slug]/cer/[assignmentId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete CER assignment",
      },
      { status: 500 },
    );
  }
}
