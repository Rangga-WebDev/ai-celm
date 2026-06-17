/** @format */

import { NextRequest, NextResponse } from "next/server";
import {
  AIInteractionType,
  CerAssignmentStatus,
  EnrollmentStatus,
  Role,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { isAiEnabled } from "@/lib/ai/openai";
import { generateCerFeedback } from "@/lib/ai/cer-feedback";
import { cerAiFeedbackSchema } from "@/lib/validators/ai.schema";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    assignmentId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.STUDENT]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug, assignmentId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Student can only request feedback for their own work",
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
    const parsed = cerAiFeedbackSchema.safeParse(json);

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

    const assignment = await prisma.cerAssignment.findFirst({
      where: {
        id: assignmentId,
        courseId: course.id,
        status: CerAssignmentStatus.ACTIVE,
      },
      select: {
        id: true,
        title: true,
        prompt: true,
        claimQuestion: true,
        evidenceQuestion: true,
        reasoningQuestion: true,
        moduleId: true,
        microUnitId: true,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "CER assignment not found" },
        { status: 404 },
      );
    }

    const { claim, evidence, reasoning } = parsed.data;

    let result;
    try {
      result = await generateCerFeedback({
        assignmentTitle: assignment.title,
        prompt: assignment.prompt,
        claimQuestion: assignment.claimQuestion,
        evidenceQuestion: assignment.evidenceQuestion,
        reasoningQuestion: assignment.reasoningQuestion,
        claim,
        evidence,
        reasoning,
      });
    } catch (aiError) {
      console.error("CER AI feedback generation failed:", aiError);
      return NextResponse.json(
        {
          success: false,
          message:
            "Gagal menghasilkan umpan balik AI. Coba lagi beberapa saat.",
        },
        { status: 502 },
      );
    }

    const log = await prisma.aIResponseLog.create({
      data: {
        userId,
        courseId: course.id,
        moduleId: assignment.moduleId,
        microUnitId: assignment.microUnitId,
        interactionType: AIInteractionType.CER_FEEDBACK,
        prompt: result.promptText,
        response: result.rawResponse,
        modelName: result.modelName,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        metadata: {
          assignmentId: assignment.id,
        },
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Umpan balik AI berhasil dibuat",
        data: {
          feedback: result.feedback,
          log,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "POST /api/students/[userId]/courses/[slug]/cer/[assignmentId]/ai-feedback error:",
      error,
    );

    return NextResponse.json(
      { success: false, message: "Failed to generate AI feedback" },
      { status: 500 },
    );
  }
}
