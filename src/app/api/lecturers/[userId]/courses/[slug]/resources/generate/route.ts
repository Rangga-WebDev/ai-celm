/** @format */

import { NextRequest, NextResponse } from "next/server";
import {
  AIInteractionType,
  MaterialStatus,
  Role,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { isAiEnabled } from "@/lib/ai/openai";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { generateResourceArticle } from "@/lib/ai/resource-article-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
  }>;
};

const MIN_MATERIAL_CHARS = 200;

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 },
      );
    }

    const course = await prisma.course.findFirst({
      where: { slug, lecturerId: userId },
      select: { id: true, title: true },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, message: "Kelas tidak ditemukan." },
        { status: 404 },
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

    const body = (await request.json().catch(() => null)) as {
      materialId?: unknown;
      focus?: unknown;
    } | null;

    const materialId = String(body?.materialId ?? "").trim();
    const focus = String(body?.focus ?? "").trim() || null;

    if (!materialId) {
      return NextResponse.json(
        { success: false, message: "Pilih materi PDF sumber terlebih dahulu." },
        { status: 400 },
      );
    }

    const material = await prisma.courseMaterial.findFirst({
      where: { id: materialId, courseId: course.id },
      select: {
        id: true,
        title: true,
        status: true,
        extractedText: true,
      },
    });

    if (!material) {
      return NextResponse.json(
        { success: false, message: "Materi tidak ditemukan di kelas ini." },
        { status: 404 },
      );
    }

    if (
      material.status !== MaterialStatus.READY ||
      !material.extractedText ||
      material.extractedText.trim().length < MIN_MATERIAL_CHARS
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Materi belum punya teks yang cukup. Pastikan materi PDF berhasil diproses.",
        },
        { status: 409 },
      );
    }

    const [cplMappings, cpmks] = await Promise.all([
      prisma.courseCPL.findMany({
        where: { courseId: course.id },
        select: { cpl: { select: { code: true, statement: true } } },
      }),
      prisma.cPMK.findMany({
        where: { courseId: course.id },
        orderBy: { order: "asc" },
        select: { code: true, statement: true },
      }),
    ]);

    const result = await generateResourceArticle({
      courseTitle: course.title,
      materialTitle: material.title,
      materialText: material.extractedText,
      focus,
      cpls: cplMappings.map((item) => ({
        code: item.cpl.code,
        statement: item.cpl.statement,
      })),
      cpmks: cpmks.map((item) => ({
        code: item.code,
        statement: item.statement,
      })),
    });

    await prisma.aIResponseLog.create({
      data: {
        userId,
        courseId: course.id,
        interactionType: AIInteractionType.SUMMARY,
        prompt: result.promptText,
        response: result.rawResponse,
        modelName: result.modelName,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: result.truncated
          ? "Artikel dibuat AI (materi panjang dipotong sebagian)."
          : "Artikel bahan belajar berhasil dibuat AI.",
        data: {
          title: result.title,
          description: result.description,
          content: result.content,
          sourceMaterialId: material.id,
          modelName: result.modelName,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST resources generate error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal membuat artikel bahan belajar." },
      { status: 500 },
    );
  }
}
