/** @format */

import { NextRequest, NextResponse } from "next/server";
import {
  AIInteractionType,
  MaterialCategory,
  MaterialStatus,
  Role,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { isAiEnabled } from "@/lib/ai/openai";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { generateCpmk } from "@/lib/ai/cpmk-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
  }>;
};

const MIN_CURRICULUM_CHARS = 200;

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
      select: { id: true, title: true, description: true },
    });
    if (!course) {
      return NextResponse.json(
        { success: false, message: "Mata kuliah tidak ditemukan." },
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

    // Prasyarat: CPL sudah ditetapkan untuk mata kuliah ini.
    const cplMappings = await prisma.courseCPL.findMany({
      where: { courseId: course.id },
      select: {
        cpl: {
          select: { id: true, code: true, statement: true, domain: true },
        },
      },
    });

    if (cplMappings.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tetapkan minimal satu CPL terlebih dahulu sebelum membuat CPMK.",
        },
        { status: 409 },
      );
    }

    // Prasyarat: dokumen kurikulum sudah diunggah dan berhasil diproses.
    const body = (await request.json().catch(() => null)) as {
      materialId?: unknown;
    } | null;
    const requestedMaterialId = String(body?.materialId ?? "").trim();

    const curriculum = await prisma.courseMaterial.findFirst({
      where: {
        courseId: course.id,
        category: MaterialCategory.CURRICULUM,
        status: MaterialStatus.READY,
        ...(requestedMaterialId ? { id: requestedMaterialId } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, extractedText: true },
    });

    if (
      !curriculum ||
      !curriculum.extractedText ||
      curriculum.extractedText.trim().length < MIN_CURRICULUM_CHARS
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unggah dokumen kurikulum yang berhasil diproses terlebih dahulu.",
        },
        { status: 409 },
      );
    }

    const limited = await enforceAiRateLimit(auth.user.id);
    if (limited.response) return limited.response;

    const cplByCode = new Map(
      cplMappings.map((item) => [item.cpl.code.toUpperCase(), item.cpl.id]),
    );

    const result = await generateCpmk({
      courseTitle: course.title,
      courseDescription: course.description,
      cpls: cplMappings.map((item) => ({
        code: item.cpl.code,
        statement: item.cpl.statement,
        domain: item.cpl.domain,
      })),
      curriculumText: curriculum.extractedText,
    });

    if (result.cpmks.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "AI tidak menghasilkan CPMK. Coba lagi atau lengkapi CPL/kurikulum.",
        },
        { status: 422 },
      );
    }

    // Tentukan urutan awal berdasarkan CPMK yang sudah ada.
    const last = await prisma.cPMK.findFirst({
      where: { courseId: course.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    let nextOrder = (last?.order ?? 0) + 1;

    const existing = await prisma.cPMK.findMany({
      where: { courseId: course.id },
      select: { code: true },
    });
    const existingCodes = new Set(
      existing.map((item) => item.code.toUpperCase()),
    );

    const created: Array<{
      id: string;
      code: string;
      statement: string;
      order: number;
      cpls: Array<{ id: string; code: string }>;
    }> = [];
    let skipped = 0;

    for (const draft of result.cpmks) {
      const code = draft.code.toUpperCase();
      if (existingCodes.has(code)) {
        skipped += 1;
        continue;
      }
      existingCodes.add(code);

      const cplIds = draft.cplCodes
        .map((c) => cplByCode.get(c))
        .filter((id): id is string => Boolean(id));

      const cpmk = await prisma.cPMK.create({
        data: {
          courseId: course.id,
          code,
          statement: draft.statement,
          order: nextOrder,
          cplMappings:
            cplIds.length > 0
              ? { create: cplIds.map((cplId) => ({ cplId })) }
              : undefined,
        },
        select: {
          id: true,
          code: true,
          statement: true,
          order: true,
          cplMappings: {
            select: { cpl: { select: { id: true, code: true } } },
          },
        },
      });

      nextOrder += 1;
      created.push({
        id: cpmk.id,
        code: cpmk.code,
        statement: cpmk.statement,
        order: cpmk.order,
        cpls: cpmk.cplMappings.map((m) => ({
          id: m.cpl.id,
          code: m.cpl.code,
        })),
      });
    }

    await prisma.aIResponseLog.create({
      data: {
        userId,
        courseId: course.id,
        interactionType: AIInteractionType.RECOMMENDATION,
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
        message:
          skipped > 0
            ? `${created.length} CPMK dibuat AI (${skipped} dilewati karena kode sudah ada).`
            : `${created.length} CPMK berhasil dibuat AI.`,
        data: { created, skipped },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST CPMK generate error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal membuat CPMK dengan AI." },
      { status: 500 },
    );
  }
}
