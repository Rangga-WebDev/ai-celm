/** @format */

import { NextRequest, NextResponse } from "next/server";
import {
  AIInteractionType,
  DiscussionThreadStatus,
  EnrollmentStatus,
  Role,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { isAiEnabled } from "@/lib/ai/openai";
import { generateForumDeliberation } from "@/lib/ai/forum-deliberation";
import { forumDeliberationSchema } from "@/lib/validators/ai.schema";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    threadId: string;
  }>;
};

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
          message: "Student can only request feedback for their own forums",
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

    const json = await request.json().catch(() => null);
    const parsed = forumDeliberationSchema.safeParse(json);

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

    const course = await prisma.course.findFirst({
      where: { slug, isPublished: true },
      select: { id: true },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, message: "Course not found" },
        { status: 404 },
      );
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        courseId: course.id,
        status: EnrollmentStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!enrollment) {
      return NextResponse.json(
        { success: false, message: "You are not enrolled in this course" },
        { status: 403 },
      );
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
        prompt: true,
        moduleId: true,
        microUnitId: true,
      },
    });

    if (!thread) {
      return NextResponse.json(
        { success: false, message: "Forum thread not found" },
        { status: 404 },
      );
    }

    let result;
    try {
      result = await generateForumDeliberation({
        threadTitle: thread.title,
        threadPrompt: thread.prompt,
        draft: parsed.data.draft,
      });
    } catch (aiError) {
      console.error("Forum deliberation generation failed:", aiError);
      return NextResponse.json(
        {
          success: false,
          message:
            "Gagal menghasilkan pertanyaan reflektif. Coba lagi beberapa saat.",
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
        interactionType: AIInteractionType.DELIBERATION_PROMPT,
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
        message: "Pertanyaan reflektif berhasil dibuat",
        data: {
          deliberation: result.deliberation,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "POST /api/students/[userId]/courses/[slug]/forums/[threadId]/ai-deliberation error:",
      error,
    );

    return NextResponse.json(
      { success: false, message: "Failed to generate deliberation prompt" },
      { status: 500 },
    );
  }
}
