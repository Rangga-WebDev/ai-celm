/** @format */

import { NextRequest, NextResponse } from "next/server";
import {
  AIInteractionType,
  MaterialStatus,
  Prisma,
  ProjectStatus,
  Role,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { isAiEnabled } from "@/lib/ai/openai";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { generateAssignmentFromMaterial } from "@/lib/ai/assignment-generator";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
  }>;
};

const MIN_MATERIAL_CHARS = 200;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Anda hanya dapat membuat tugas untuk kelas Anda sendiri.",
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
      select: { id: true, title: true },
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
      materialId?: unknown;
      moduleId?: unknown;
      examType?: unknown;
    } | null;

    const examTypeRaw = String(body?.examType ?? "NONE").toUpperCase();
    const examType: "NONE" | "UTS" | "UAS" =
      examTypeRaw === "UTS" || examTypeRaw === "UAS"
        ? (examTypeRaw as "UTS" | "UAS")
        : "NONE";

    const materialId = String(body?.materialId ?? "").trim();
    if (!materialId) {
      return NextResponse.json(
        {
          success: false,
          message: "Pilih materi sumber tugas terlebih dahulu.",
        },
        { status: 400 },
      );
    }

    const material = await prisma.courseMaterial.findFirst({
      where: { id: materialId, courseId: course.id },
      select: {
        id: true,
        title: true,
        moduleId: true,
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
            "Materi belum punya teks yang cukup untuk dibuatkan tugas. Pastikan materi berhasil diproses.",
        },
        { status: 409 },
      );
    }

    const requestedModuleId = String(body?.moduleId ?? "").trim();
    // Ujian (UTS/UAS) tidak terikat satu modul.
    const targetModuleId =
      examType === "NONE"
        ? requestedModuleId || material.moduleId || null
        : null;

    if (targetModuleId) {
      const targetModule = await prisma.module.findFirst({
        where: { id: targetModuleId, courseId: course.id },
        select: { id: true },
      });
      if (!targetModule) {
        return NextResponse.json(
          {
            success: false,
            message: "Modul tujuan tidak ditemukan di kelas ini.",
          },
          { status: 404 },
        );
      }
    }

    let result;
    try {
      result = await generateAssignmentFromMaterial({
        courseTitle: course.title,
        materialTitle: material.title,
        materialText: material.extractedText,
      });
    } catch (aiError) {
      console.error("Assignment generation error:", aiError);
      return NextResponse.json(
        {
          success: false,
          message: "AI gagal menyusun tugas. Coba lagi atau ganti materi.",
        },
        { status: 502 },
      );
    }

    const title = (result.title || `Tugas: ${material.title}`).slice(0, 200);
    const baseSlug = slugify(title) || slugify(`tugas-${material.title}`);
    let finalSlug = baseSlug;
    let suffix = 1;
    while (
      await prisma.assignment.findUnique({
        where: { courseId_slug: { courseId: course.id, slug: finalSlug } },
        select: { id: true },
      })
    ) {
      suffix += 1;
      finalSlug = `${baseSlug}-${suffix}`;
    }

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + result.suggestedDays);

    const rubricJson: Prisma.InputJsonValue =
      result.rubric.length > 0 ? result.rubric : [];

    const assignment = await prisma.assignment.create({
      data: {
        courseId: course.id,
        moduleId: targetModuleId,
        createdById: userId,
        title,
        slug: finalSlug,
        description: result.description || null,
        instructions: result.instructions || null,
        rubric: rubricJson,
        dueAt,
        maxScore: 100,
        allowText: true,
        allowFile: true,
        sourceMaterialId: material.id,
        generatedByAi: true,
        examType,
        status: ProjectStatus.DRAFT,
      },
      include: {
        module: { select: { id: true, title: true, slug: true } },
        sourceMaterial: { select: { id: true, title: true } },
        _count: { select: { submissions: true } },
      },
    });

    await prisma.aIResponseLog.create({
      data: {
        userId,
        courseId: course.id,
        moduleId: targetModuleId,
        interactionType: AIInteractionType.RECOMMENDATION,
        prompt: result.promptText,
        response: result.rawResponse,
        modelName: result.modelName,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        metadata: {
          kind: "assignment-generation",
          materialId: material.id,
          assignmentId: assignment.id,
        },
      },
      select: { id: true },
    });

    return NextResponse.json({
      success: true,
      message: "Draf tugas besar berhasil dibuat dari materi.",
      data: { assignment, truncated: result.truncated },
    });
  } catch (error) {
    console.error("Assignment AI generate route error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat membuat tugas." },
      { status: 500 },
    );
  }
}
