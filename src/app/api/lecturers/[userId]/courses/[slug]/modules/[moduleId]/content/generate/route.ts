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
import {
  buildRawModuleContentFromText,
  generateModuleContent,
} from "@/lib/ai/module-content-generator";
import { syncModuleContentUnit } from "@/lib/materials/module-content-unit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    moduleId: string;
  }>;
};

const MIN_MATERIAL_CHARS = 200;

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug, moduleId } = await params;

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

    const targetModule = await prisma.module.findFirst({
      where: { id: moduleId, courseId: course.id },
      select: { id: true, title: true, description: true },
    });

    if (!targetModule) {
      return NextResponse.json(
        { success: false, message: "Modul tidak ditemukan." },
        { status: 404 },
      );
    }

    const body = (await request.json().catch(() => null)) as {
      materialId?: unknown;
      mode?: unknown;
    } | null;

    const materialId = String(body?.materialId ?? "").trim();
    const mode = body?.mode === "raw" ? "raw" : "ai";

    if (!materialId) {
      return NextResponse.json(
        { success: false, message: "Pilih materi PDF sumber terlebih dahulu." },
        { status: 400 },
      );
    }

    if (mode === "ai" && !isAiEnabled()) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Fitur AI belum aktif. Hubungi admin untuk mengatur OPENAI_API_KEY.",
        },
        { status: 503 },
      );
    }

    // Prasyarat AI: kurikulum + CPL wajib lengkap agar modul selaras capaian.
    let cplContext: Array<{ code: string; statement: string }> = [];
    let cpmkContext: Array<{ code: string; statement: string }> = [];
    if (mode === "ai") {
      const [cplMappings, cpmks, curriculumReady] = await Promise.all([
        prisma.courseCPL.findMany({
          where: { courseId: course.id },
          select: { cpl: { select: { code: true, statement: true } } },
        }),
        prisma.cPMK.findMany({
          where: { courseId: course.id },
          orderBy: { order: "asc" },
          select: { code: true, statement: true },
        }),
        prisma.courseMaterial.findFirst({
          where: {
            courseId: course.id,
            category: MaterialCategory.CURRICULUM,
            status: MaterialStatus.READY,
          },
          select: { id: true },
        }),
      ]);

      if (cplMappings.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Tetapkan minimal satu CPL pada menu Kurikulum & CPMK sebelum membuat modul dengan AI.",
          },
          { status: 409 },
        );
      }

      if (!curriculumReady) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Unggah dokumen kurikulum yang berhasil diproses pada menu Kurikulum & CPMK sebelum membuat modul dengan AI.",
          },
          { status: 409 },
        );
      }

      cplContext = cplMappings.map((item) => ({
        code: item.cpl.code,
        statement: item.cpl.statement,
      }));
      cpmkContext = cpmks.map((item) => ({
        code: item.code,
        statement: item.statement,
      }));
    }

    if (mode === "ai") {
      const limited = await enforceAiRateLimit(auth.user.id);
      if (limited.response) return limited.response;
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

    if (mode === "raw") {
      const content = buildRawModuleContentFromText(
        targetModule.title,
        material.extractedText,
      );

      await prisma.module.update({
        where: { id: targetModule.id },
        data: {
          learningContent: content,
          contentGeneratedByAi: false,
          contentSourceMaterialId: material.id,
          contentUpdatedAt: new Date(),
        },
      });

      await syncModuleContentUnit(targetModule.id, targetModule.title, content);

      return NextResponse.json(
        {
          success: true,
          message: "Konten modul dibuat dari teks PDF.",
          data: { content, generatedByAi: false },
        },
        { status: 200 },
      );
    }

    const result = await generateModuleContent({
      courseTitle: course.title,
      moduleTitle: targetModule.title,
      moduleDescription: targetModule.description,
      materialTitle: material.title,
      materialText: material.extractedText,
      cpls: cplContext,
      cpmks: cpmkContext,
    });

    await prisma.module.update({
      where: { id: targetModule.id },
      data: {
        learningContent: result.content,
        contentGeneratedByAi: true,
        contentSourceMaterialId: material.id,
        contentUpdatedAt: new Date(),
      },
    });

    await syncModuleContentUnit(
      targetModule.id,
      targetModule.title,
      result.content,
    );

    await prisma.aIResponseLog.create({
      data: {
        userId,
        courseId: course.id,
        moduleId: targetModule.id,
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
          ? "Konten modul dibuat AI (materi panjang dipotong sebagian)."
          : "Konten modul berhasil dibuat AI.",
        data: { content: result.content, generatedByAi: true },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST module content generate error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal membuat konten modul." },
      { status: 500 },
    );
  }
}
