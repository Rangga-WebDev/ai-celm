/** @format */

import { NextRequest, NextResponse } from "next/server";
import {
  AIInteractionType,
  EnrollmentStatus,
  Role,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { isAiEnabled } from "@/lib/ai/openai";
import { retrieveRelevantChunks } from "@/lib/ai/material-retrieval";
import { answerMaterialQuestion } from "@/lib/ai/material-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
  }>;
};

type HistoryItem = { role: "user" | "assistant"; content: string };

function sanitizeHistory(value: unknown): HistoryItem[] {
  if (!Array.isArray(value)) return [];
  const result: HistoryItem[] = [];
  for (const item of value) {
    if (
      item &&
      typeof item === "object" &&
      (item as { role?: unknown }).role &&
      typeof (item as { content?: unknown }).content === "string"
    ) {
      const role = (item as { role: unknown }).role;
      const content = ((item as { content: string }).content || "").trim();
      if ((role === "user" || role === "assistant") && content.length > 0) {
        result.push({ role, content: content.slice(0, 2000) });
      }
    }
  }
  return result.slice(-6);
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.STUDENT]);
    if (auth.response) return auth.response;

    const { userId, slug } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 },
      );
    }

    if (!isAiEnabled()) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Asisten belajar belum aktif. Hubungi dosen atau admin Anda.",
        },
        { status: 503 },
      );
    }

    const course = await prisma.course.findFirst({
      where: { slug, isPublished: true },
      select: { id: true, title: true },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, message: "Mata kuliah tidak ditemukan." },
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
        { success: false, message: "Anda belum terdaftar di kelas ini." },
        { status: 403 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Permintaan tidak valid." },
        { status: 400 },
      );
    }

    const question = String(
      (body as { question?: unknown })?.question ?? "",
    ).trim();
    const history = sanitizeHistory((body as { history?: unknown })?.history);

    if (question.length < 3) {
      return NextResponse.json(
        { success: false, message: "Tuliskan pertanyaan terlebih dahulu." },
        { status: 400 },
      );
    }

    // Basis pengetahuan: materi yang bahan belajarnya sudah diterbitkan dosen.
    const materials = await prisma.courseMaterial.findMany({
      where: {
        courseId: course.id,
        extractedText: { not: null },
        studyKit: { isPublished: true },
      },
      select: { id: true, title: true, extractedText: true },
    });

    const sources = materials
      .filter((m) => (m.extractedText ?? "").trim().length > 0)
      .map((m) => ({
        materialId: m.id,
        materialTitle: m.title,
        text: m.extractedText as string,
      }));

    if (sources.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          answer:
            "Maaf, belum ada materi yang tersedia untuk dijadikan rujukan. Silakan tanyakan kepada dosen Anda.",
          usedMaterials: [],
        },
      });
    }

    const chunks = retrieveRelevantChunks(sources, question, 4);

    let result;
    try {
      result = await answerMaterialQuestion({
        courseTitle: course.title,
        question,
        chunks,
        history,
      });
    } catch (aiError) {
      console.error("Material chat failed:", aiError);
      return NextResponse.json(
        {
          success: false,
          message:
            "Asisten belajar sedang sibuk. Coba lagi beberapa saat lagi.",
        },
        { status: 502 },
      );
    }

    await prisma.aIResponseLog.create({
      data: {
        userId,
        courseId: course.id,
        interactionType: AIInteractionType.RECOMMENDATION,
        prompt: question,
        response: result.answer,
        modelName: result.modelName,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        metadata: {
          kind: "material-chat",
          usedMaterials: result.usedMaterials.map((m) => m.materialId),
        },
      },
      select: { id: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        answer: result.answer,
        usedMaterials: result.usedMaterials,
      },
    });
  } catch (error) {
    console.error("POST material chat error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memproses pertanyaan." },
      { status: 500 },
    );
  }
}
