/** @format */

import { NextRequest, NextResponse } from "next/server";
import { EnrollmentStatus, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    threadId: string;
  }>;
};

export async function GET(_: NextRequest, { params }: Params) {
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
          message: "Lecturer can only monitor forums from their own courses",
        },
        { status: 403 },
      );
    }

    const course = await prisma.course.findFirst({
      where: { slug, lecturerId: userId },
      select: { id: true, title: true, slug: true },
    });

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          message: "Course not found or you are not assigned to this course",
        },
        { status: 404 },
      );
    }

    const thread = await prisma.discussionThread.findFirst({
      where: { id: threadId, courseId: course.id },
      select: {
        id: true,
        title: true,
        description: true,
        prompt: true,
        status: true,
        isLocked: true,
        isPinned: true,
        createdAt: true,
        module: { select: { id: true, title: true } },
        microUnit: { select: { id: true, title: true } },
      },
    });

    if (!thread) {
      return NextResponse.json(
        { success: false, message: "Forum not found in this course" },
        { status: 404 },
      );
    }

    const posts = await prisma.discussionPost.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        parentId: true,
        status: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: course.id, status: EnrollmentStatus.ACTIVE },
      select: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Hitung jumlah post per mahasiswa
    const postCountByStudent = new Map<string, number>();
    for (const post of posts) {
      if (post.author.role === Role.STUDENT) {
        postCountByStudent.set(
          post.author.id,
          (postCountByStudent.get(post.author.id) ?? 0) + 1,
        );
      }
    }

    const participants = enrollments.map((enrollment) => ({
      id: enrollment.user.id,
      firstName: enrollment.user.firstName,
      lastName: enrollment.user.lastName,
      postCount: postCountByStudent.get(enrollment.user.id) ?? 0,
    }));

    const activeStudents = participants.filter((p) => p.postCount > 0).length;
    const silentStudents = participants.filter((p) => p.postCount === 0).length;

    const aiUsageCount = await prisma.aIResponseLog.count({
      where: {
        courseId: course.id,
        interactionType: "DELIBERATION_PROMPT",
        metadata: { path: ["threadId"], equals: thread.id },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Forum monitoring data fetched successfully",
        data: {
          course,
          thread,
          posts,
          participants: participants.sort((a, b) => b.postCount - a.postCount),
          stats: {
            totalPosts: posts.length,
            totalStudents: participants.length,
            activeStudents,
            silentStudents,
            aiUsageCount,
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "GET /api/lecturers/[userId]/courses/[slug]/forums/[threadId]/monitor error:",
      error,
    );

    return NextResponse.json(
      { success: false, message: "Failed to fetch forum monitoring data" },
      { status: 500 },
    );
  }
}
