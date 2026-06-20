/** @format */

import { NextRequest, NextResponse } from "next/server";
import { AIInteractionType, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { isAiEnabled } from "@/lib/ai/openai";
import { generateCerAssignmentDraft } from "@/lib/ai/cer-assignment-assist";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
  }>;
};

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
          message: "Anda hanya dapat menyusun tugas untuk kelas Anda sendiri.",
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

    const course = await prisma.course.findFirst({
      where: {
        slug,
        lecturerId: userId,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          message: "Kelas tidak ditemukan atau bukan milik Anda.",
        },
        { status: 404 },
      );
    }

    const body = (await request.json().catch(() => null)) as {
      topic?: unknown;
      targetTitle?: unknown;
      notes?: unknown;
    } | null;

    const topic = String(body?.topic ?? "").trim();

    if (topic.length < 4) {
      return NextResponse.json(
        {
          success: false,
          message: "Tuliskan topik/isu minimal 4 karakter.",
        },
        { status: 400 },
      );
    }

    const targetTitle = String(body?.targetTitle ?? "").trim() || null;
    const notes = String(body?.notes ?? "").trim() || null;

    let result;
    try {
      result = await generateCerAssignmentDraft({
        courseTitle: course.title,
        topic: topic.slice(0, 600),
        targetTitle: targetTitle ? targetTitle.slice(0, 300) : null,
        notes: notes ? notes.slice(0, 600) : null,
      });
    } catch (aiError) {
      console.error("CER assignment assist error:", aiError);
      return NextResponse.json(
        {
          success: false,
          message:
            "AI gagal menyusun draf tugas. Coba lagi atau ubah topiknya.",
        },
        { status: 502 },
      );
    }

    await prisma.aIResponseLog.create({
      data: {
        userId,
        courseId: course.id,
        interactionType: AIInteractionType.RUBRIC_ASSIST,
        prompt: result.promptText,
        response: result.rawResponse,
        modelName: result.modelName,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        metadata: {
          kind: "cer-assignment-assist",
          topic: topic.slice(0, 200),
        },
      },
      select: { id: true },
    });

    return NextResponse.json({
      success: true,
      message: "Draf tugas argumentasi berhasil disusun.",
      data: {
        draft: result.draft,
      },
    });
  } catch (error) {
    console.error("CER assignment assist route error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat menyusun draf tugas.",
      },
      { status: 500 },
    );
  }
}
