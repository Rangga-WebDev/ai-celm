/** @format */

import { NextRequest, NextResponse } from "next/server";
import { ProjectStatus, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    projectId: string;
  }>;
};

type TargetType = "COURSE" | "MODULE" | "UNIT";

const projectStatusOptions = Object.values(ProjectStatus);

function isValidProjectStatus(value: unknown): value is ProjectStatus {
  return (
    typeof value === "string" &&
    projectStatusOptions.includes(value as ProjectStatus)
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

  if (!text) return null;

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) return null;

  return date;
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

async function getOwnedProject(projectId: string, courseId: string) {
  return prisma.civicActionProject.findFirst({
    where: {
      id: projectId,
      courseId,
    },
    select: {
      id: true,
    },
  });
}

async function resolveProjectTarget({
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
        error: "Module is required for module-level project",
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
      error: "Micro-unit is required for unit-level project",
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

    const { userId, slug, projectId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lecturer can only update projects from their own courses",
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

    const ownedProject = await getOwnedProject(projectId, course.id);

    if (!ownedProject) {
      return NextResponse.json(
        {
          success: false,
          message: "Project not found in this course",
        },
        { status: 404 },
      );
    }

    const body = await request.json();

    const title = String(body.title ?? "").trim();
    const rawSlug = String(body.slug ?? "").trim();
    const description = optionalText(body.description);
    const instruction = optionalText(body.instruction);
    const objective = optionalText(body.objective);
    const outputType = optionalText(body.outputType);
    const dueAt = parseDate(body.dueAt);
    const status = body.status ?? ProjectStatus.DRAFT;
    const targetType = body.targetType ?? "COURSE";
    const moduleId = optionalText(body.moduleId);
    const microUnitId = optionalText(body.microUnitId);

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message: "Project title is required",
        },
        { status: 400 },
      );
    }

    if (!isValidProjectStatus(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid project status is required",
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

    const projectSlug = rawSlug ? slugify(rawSlug) : slugify(title);

    const slugOwner = await prisma.civicActionProject.findUnique({
      where: {
        courseId_slug: {
          courseId: course.id,
          slug: projectSlug,
        },
      },
      select: {
        id: true,
      },
    });

    if (slugOwner && slugOwner.id !== projectId) {
      return NextResponse.json(
        {
          success: false,
          message: "Project slug already used by another project",
        },
        { status: 409 },
      );
    }

    const target = await resolveProjectTarget({
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

    const updatedProject = await prisma.civicActionProject.update({
      where: {
        id: projectId,
      },
      data: {
        moduleId: target.moduleId,
        microUnitId: target.microUnitId,
        title,
        slug: projectSlug,
        description,
        instruction,
        objective,
        outputType,
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
        submissions: {
          orderBy: {
            updatedAt: "desc",
          },
          take: 3,
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
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
        message: "Civic action project updated successfully",
        data: updatedProject,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "PATCH /api/lecturers/[userId]/courses/[slug]/projects/[projectId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update civic action project",
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

    const { userId, slug, projectId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lecturer can only delete projects from their own courses",
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

    const ownedProject = await getOwnedProject(projectId, course.id);

    if (!ownedProject) {
      return NextResponse.json(
        {
          success: false,
          message: "Project not found in this course",
        },
        { status: 404 },
      );
    }

    await prisma.civicActionProject.delete({
      where: {
        id: projectId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Civic action project deleted successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "DELETE /api/lecturers/[userId]/courses/[slug]/projects/[projectId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete civic action project",
      },
      { status: 500 },
    );
  }
}
