/** @format */

import { NextRequest, NextResponse } from "next/server";
import {
  AIInteractionType,
  Role,
  SubmissionStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { isAiEnabled } from "@/lib/ai/openai";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { generateCerGradingAssist } from "@/lib/ai/cer-grading-assist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    assignmentId: string;
    submissionId: string;
  }>;
};

function rubricToText(rubric: unknown): string | null {
  if (!rubric) {
    return null;
  }
  if (typeof rubric === "string") {
    return rubric.slice(0, 2000);
  }
  try {
    return JSON.stringify(rubric).slice(0, 2000);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug, assignmentId, submissionId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Anda hanya dapat menilai jawaban di kelas Anda sendiri.",
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

    const submission = await prisma.cerSubmission.findFirst({
      where: {
        id: submissionId,
        assignmentId,
        assignment: {
          id: assignmentId,
          course: {
            slug,
            lecturerId: userId,
          },
        },
      },
      select: {
        id: true,
        claim: true,
        evidence: true,
        reasoning: true,
        status: true,
        assignment: {
          select: {
            id: true,
            title: true,
            prompt: true,
            claimQuestion: true,
            evidenceQuestion: true,
            reasoningQuestion: true,
            rubric: true,
            courseId: true,
            moduleId: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        {
          success: false,
          message: "Jawaban tidak ditemukan di kelas Anda.",
        },
        { status: 404 },
      );
    }

    if (submission.status === SubmissionStatus.DRAFT) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mahasiswa belum mengumpulkan jawaban ini, belum bisa dinilai.",
        },
        { status: 409 },
      );
    }

    let result;
    try {
      result = await generateCerGradingAssist({
        assignmentTitle: submission.assignment.title,
        prompt: submission.assignment.prompt,
        claimQuestion: submission.assignment.claimQuestion,
        evidenceQuestion: submission.assignment.evidenceQuestion,
        reasoningQuestion: submission.assignment.reasoningQuestion,
        rubric: rubricToText(submission.assignment.rubric),
        claim: submission.claim ?? "",
        evidence: submission.evidence ?? "",
        reasoning: submission.reasoning ?? "",
      });
    } catch (aiError) {
      console.error("CER grading assist error:", aiError);
      return NextResponse.json(
        {
          success: false,
          message: "AI gagal menyusun saran penilaian. Coba lagi.",
        },
        { status: 502 },
      );
    }

    await prisma.aIResponseLog.create({
      data: {
        userId,
        courseId: submission.assignment.courseId,
        moduleId: submission.assignment.moduleId,
        interactionType: AIInteractionType.CER_FEEDBACK,
        prompt: result.promptText,
        response: result.rawResponse,
        modelName: result.modelName,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        metadata: {
          kind: "cer-grading-assist",
          submissionId,
          assignmentId,
        },
      },
      select: { id: true },
    });

    return NextResponse.json({
      success: true,
      message: "Saran penilaian berhasil disusun.",
      data: {
        assist: result.assist,
      },
    });
  } catch (error) {
    console.error("CER grading assist route error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal menyusun saran penilaian.",
      },
      { status: 500 },
    );
  }
}
