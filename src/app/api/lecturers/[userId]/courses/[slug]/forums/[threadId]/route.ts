/** @format */

import { NextRequest, NextResponse } from "next/server";
import { DiscussionThreadStatus, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    threadId: string;
  }>;
};

type TargetType = "COURSE" | "MODULE" | "UNIT";

const threadStatusOptions = Object.values(DiscussionThreadStatus);

function isValidThreadStatus(value: unknown): value is DiscussionThreadStatus {
  return (
    typeof value === "string" &&
    threadStatusOptions.includes(value as DiscussionThreadStatus)
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

async function getOwnedThread(threadId: string, courseId: string) {
  return prisma.discussionThread.findFirst({
    where: {
      id: threadId,
      courseId,
    },
    select: {
      id: true,
    },
  });
}

async function resolveForumTarget({
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
        error: "Module is required for module-level forum",
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
      error: "Micro-unit is required for unit-level forum",
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

    const { userId, slug, threadId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lecturer can only update forums from their own courses",
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

    const ownedThread = await getOwnedThread(threadId, course.id);

    if (!ownedThread) {
      return NextResponse.json(
        {
          success: false,
          message: "Forum not found in this course",
        },
        { status: 404 },
      );
    }

    const body = await request.json();

    const title = String(body.title ?? "").trim();
    const rawSlug = String(body.slug ?? "").trim();
    const description = optionalText(body.description);
    const prompt = optionalText(body.prompt);
    const status = body.status ?? DiscussionThreadStatus.DRAFT;
    const targetType = body.targetType ?? "COURSE";
    const moduleId = optionalText(body.moduleId);
    const microUnitId = optionalText(body.microUnitId);
    const isPinned = Boolean(body.isPinned);
    const isLocked = Boolean(body.isLocked);

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message: "Forum title is required",
        },
        { status: 400 },
      );
    }

    if (!isValidThreadStatus(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid forum status is required",
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

    const threadSlug = rawSlug ? slugify(rawSlug) : slugify(title);

    const slugOwner = await prisma.discussionThread.findUnique({
      where: {
        courseId_slug: {
          courseId: course.id,
          slug: threadSlug,
        },
      },
      select: {
        id: true,
      },
    });

    if (slugOwner && slugOwner.id !== threadId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forum slug already used by another thread",
        },
        { status: 409 },
      );
    }

    const target = await resolveForumTarget({
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

    const updatedThread = await prisma.discussionThread.update({
      where: {
        id: threadId,
      },
      data: {
        moduleId: target.moduleId,
        microUnitId: target.microUnitId,
        title,
        slug: threadSlug,
        description,
        prompt,
        status,
        isPinned,
        isLocked,
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
        posts: {
          orderBy: {
            createdAt: "desc",
          },
          take: 3,
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            posts: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Discussion forum updated successfully",
        data: updatedThread,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "PATCH /api/lecturers/[userId]/courses/[slug]/forums/[threadId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update discussion forum",
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

    const { userId, slug, threadId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lecturer can only delete forums from their own courses",
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

    const ownedThread = await getOwnedThread(threadId, course.id);

    if (!ownedThread) {
      return NextResponse.json(
        {
          success: false,
          message: "Forum not found in this course",
        },
        { status: 404 },
      );
    }

    await prisma.discussionThread.delete({
      where: {
        id: threadId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Discussion forum deleted successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "DELETE /api/lecturers/[userId]/courses/[slug]/forums/[threadId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete discussion forum",
      },
      { status: 500 },
    );
  }
}
