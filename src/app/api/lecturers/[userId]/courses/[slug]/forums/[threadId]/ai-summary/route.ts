/** @format */

import { NextRequest, NextResponse } from "next/server";
import {
  AIInteractionType,
  DiscussionPostStatus,
  Role,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { isAiEnabled } from "@/lib/ai/openai";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { generateDiscussionSummary } from "@/lib/ai/discussion-summary";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    threadId: string;
  }>;
};

function roleLabel(role: string) {
  if (role === "LECTURER") return "Dosen";
  if (role === "ADMIN") return "Admin";
  return "Mahasiswa";
}

export async function POST(_: NextRequest, { params }: Params) {
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
          message: "Lecturer can only summarize forums from their own courses",
        },
        { status: 403 },
      );
    }

    if (!isAiEnabled()) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Fitur AI belum aktif. Hubungi admin untuk mengatur OPENAI_API_KEY.",
        },
        { status: 503 },
      );
    }

    const limited = await enforceAiRateLimit(auth.user.id);
    if (limited.response) return limited.response;

    const course = await prisma.course.findFirst({
      where: { slug, lecturerId: userId },
      select: { id: true },
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
        prompt: true,
        moduleId: true,
        microUnitId: true,
      },
    });

    if (!thread) {
      return NextResponse.json(
        { success: false, message: "Forum not found in this course" },
        { status: 404 },
      );
    }

    const posts = await prisma.discussionPost.findMany({
      where: { threadId: thread.id, status: DiscussionPostStatus.VISIBLE },
      orderBy: { createdAt: "asc" },
      select: {
        content: true,
        author: {
          select: { firstName: true, lastName: true, role: true },
        },
      },
    });

    if (posts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Belum ada diskusi untuk diringkas.",
        },
        { status: 400 },
      );
    }

    let result;
    try {
      result = await generateDiscussionSummary({
        threadTitle: thread.title,
        threadPrompt: thread.prompt,
        posts: posts.map((post) => ({
          authorName: `${post.author.firstName} ${post.author.lastName}`,
          authorRole: roleLabel(post.author.role),
          content: post.content,
        })),
      });
    } catch (aiError) {
      console.error("Discussion summary generation failed:", aiError);
      return NextResponse.json(
        {
          success: false,
          message:
            "Gagal menghasilkan ringkasan diskusi. Coba lagi beberapa saat.",
        },
        { status: 502 },
      );
    }

    await prisma.aIResponseLog.create({
      data: {
        userId,
        courseId: course.id,
        moduleId: thread.moduleId,
        microUnitId: thread.microUnitId,
        interactionType: AIInteractionType.SUMMARY,
        prompt: result.promptText,
        response: result.rawResponse,
        modelName: result.modelName,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        metadata: {
          threadId: thread.id,
        },
      },
      select: { id: true },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Ringkasan diskusi berhasil dibuat",
        data: {
          summary: result.summary,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "POST /api/lecturers/[userId]/courses/[slug]/forums/[threadId]/ai-summary error:",
      error,
    );

    return NextResponse.json(
      { success: false, message: "Failed to generate discussion summary" },
      { status: 500 },
    );
  }
}
