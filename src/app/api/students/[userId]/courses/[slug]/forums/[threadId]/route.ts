/** @format */

import { NextRequest, NextResponse } from "next/server";
import {
  DiscussionPostStatus,
  DiscussionThreadStatus,
  EnrollmentStatus,
  Role,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { discussionPostSchema } from "@/lib/validators/forum.schema";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    threadId: string;
  }>;
};

const postSelect = {
  id: true,
  content: true,
  parentId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  },
} as const;

async function resolveStudentThread({
  userId,
  slug,
  threadId,
}: {
  userId: string;
  slug: string;
  threadId: string;
}) {
  const course = await prisma.course.findFirst({
    where: {
      slug,
      isPublished: true,
    },
    select: {
      id: true,
      title: true,
      slug: true,
    },
  });

  if (!course) {
    return { error: "Course not found", status: 404 as const };
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId,
      courseId: course.id,
      status: EnrollmentStatus.ACTIVE,
    },
    select: {
      id: true,
    },
  });

  if (!enrollment) {
    return {
      error: "You are not enrolled in this course",
      status: 403 as const,
    };
  }

  const thread = await prisma.discussionThread.findFirst({
    where: {
      id: threadId,
      courseId: course.id,
      status: DiscussionThreadStatus.OPEN,
    },
    select: {
      id: true,
      title: true,
      description: true,
      prompt: true,
      isLocked: true,
      module: {
        select: { id: true, title: true },
      },
      microUnit: {
        select: { id: true, title: true },
      },
      createdBy: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
    },
  });

  if (!thread) {
    return { error: "Forum thread not found", status: 404 as const };
  }

  return { course, thread, error: null };
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.STUDENT]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug, threadId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Student can only access their own forums",
        },
        { status: 403 },
      );
    }

    const resolved = await resolveStudentThread({ userId, slug, threadId });

    if (resolved.error) {
      return NextResponse.json(
        { success: false, message: resolved.error },
        { status: resolved.status },
      );
    }

    const posts = await prisma.discussionPost.findMany({
      where: {
        threadId,
        status: DiscussionPostStatus.VISIBLE,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: postSelect,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Forum thread fetched successfully",
        data: {
          course: resolved.course,
          thread: resolved.thread,
          posts,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "GET /api/students/[userId]/courses/[slug]/forums/[threadId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch forum thread",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.STUDENT]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug, threadId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Student can only post as themselves",
        },
        { status: 403 },
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = discussionPostSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validasi gagal",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const resolved = await resolveStudentThread({ userId, slug, threadId });

    if (resolved.error || !resolved.thread) {
      return NextResponse.json(
        { success: false, message: resolved.error ?? "Forum thread not found" },
        { status: resolved.status ?? 404 },
      );
    }

    if (resolved.thread.isLocked) {
      return NextResponse.json(
        {
          success: false,
          message: "Forum ini sedang dikunci untuk diskusi baru",
        },
        { status: 409 },
      );
    }

    const { content, parentId } = parsed.data;

    if (parentId) {
      const parentPost = await prisma.discussionPost.findFirst({
        where: {
          id: parentId,
          threadId,
          status: DiscussionPostStatus.VISIBLE,
        },
        select: {
          id: true,
        },
      });

      if (!parentPost) {
        return NextResponse.json(
          {
            success: false,
            message: "Balasan yang dituju tidak ditemukan",
          },
          { status: 404 },
        );
      }
    }

    const post = await prisma.discussionPost.create({
      data: {
        threadId,
        authorId: userId,
        parentId: parentId ?? null,
        content,
      },
      select: postSelect,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Balasan terkirim",
        data: {
          post,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/students/[userId]/courses/[slug]/forums/[threadId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create forum post",
      },
      { status: 500 },
    );
  }
}
