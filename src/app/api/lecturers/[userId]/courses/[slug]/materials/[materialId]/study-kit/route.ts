/** @format */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AIInteractionType, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { isAiEnabled } from "@/lib/ai/openai";
import {
  generateMaterialStudyKit,
  studyKitContentSchema,
} from "@/lib/ai/material-study-kit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    materialId: string;
  }>;
};

async function findOwnedMaterial(
  userId: string,
  slug: string,
  materialId: string,
) {
  return prisma.courseMaterial.findFirst({
    where: {
      id: materialId,
      course: { slug, lecturerId: userId },
    },
    select: {
      id: true,
      title: true,
      extractedText: true,
      charCount: true,
      moduleId: true,
      courseId: true,
      course: { select: { title: true } },
    },
  });
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug, materialId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 },
      );
    }

    const material = await findOwnedMaterial(userId, slug, materialId);
    if (!material) {
      return NextResponse.json(
        { success: false, message: "Materi tidak ditemukan." },
        { status: 404 },
      );
    }

    const saved = await prisma.materialStudyKit.findUnique({
      where: { materialId: material.id },
    });

    return NextResponse.json({
      success: true,
      data: saved
        ? {
            kit: {
              ringkasan: saved.summary,
              poinUtama: saved.keyPoints,
              flashcards: saved.flashcards,
              kuis: saved.quiz,
            },
            isPublished: saved.isPublished,
            publishedAt: saved.publishedAt,
          }
        : null,
    });
  } catch (error) {
    console.error("GET study-kit error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat bahan belajar." },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug, materialId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 },
      );
    }

    const material = await findOwnedMaterial(userId, slug, materialId);
    if (!material) {
      return NextResponse.json(
        { success: false, message: "Materi tidak ditemukan." },
        { status: 404 },
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

    const payloadSchema = studyKitContentSchema.and(
      z.object({ isPublished: z.boolean().optional() }),
    );
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Data bahan belajar tidak lengkap." },
        { status: 400 },
      );
    }

    const { ringkasan, poinUtama, flashcards, kuis, isPublished } = parsed.data;
    const publish = isPublished ?? true;

    const saved = await prisma.materialStudyKit.upsert({
      where: { materialId: material.id },
      create: {
        materialId: material.id,
        courseId: material.courseId,
        createdById: auth.user.id,
        summary: ringkasan,
        keyPoints: poinUtama,
        flashcards,
        quiz: kuis,
        isPublished: publish,
        publishedAt: publish ? new Date() : null,
      },
      update: {
        summary: ringkasan,
        keyPoints: poinUtama,
        flashcards,
        quiz: kuis,
        isPublished: publish,
        publishedAt: publish ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: publish
        ? "Bahan belajar diterbitkan ke mahasiswa."
        : "Bahan belajar disimpan.",
      data: {
        isPublished: saved.isPublished,
        publishedAt: saved.publishedAt,
      },
    });
  } catch (error) {
    console.error("PUT study-kit error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menyimpan bahan belajar." },
      { status: 500 },
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug, materialId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 },
      );
    }

    const material = await findOwnedMaterial(userId, slug, materialId);
    if (!material) {
      return NextResponse.json(
        { success: false, message: "Materi tidak ditemukan." },
        { status: 404 },
      );
    }

    await prisma.materialStudyKit
      .delete({ where: { materialId: material.id } })
      .catch(() => null);

    return NextResponse.json({
      success: true,
      message: "Bahan belajar ditarik dari mahasiswa.",
    });
  } catch (error) {
    console.error("DELETE study-kit error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menarik bahan belajar." },
      { status: 500 },
    );
  }
}

export async function POST(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug, materialId } = await params;

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
            "Fitur AI belum aktif. Hubungi admin untuk mengatur OPENAI_API_KEY.",
        },
        { status: 503 },
      );
    }

    const material = await findOwnedMaterial(userId, slug, materialId);

    if (!material) {
      return NextResponse.json(
        { success: false, message: "Materi tidak ditemukan." },
        { status: 404 },
      );
    }

    const materialText = material.extractedText?.trim() ?? "";
    if (materialText.length < 200) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Teks materi terlalu pendek atau belum terbaca untuk dibuatkan bahan belajar.",
        },
        { status: 400 },
      );
    }

    let result;
    try {
      result = await generateMaterialStudyKit({
        courseTitle: material.course?.title ?? "Pembelajaran PKn SD",
        materialTitle: material.title,
        materialText,
      });
    } catch (aiError) {
      console.error("Study kit generation failed:", aiError);
      return NextResponse.json(
        {
          success: false,
          message: "Gagal membuat bahan belajar. Coba lagi beberapa saat lagi.",
        },
        { status: 502 },
      );
    }

    await prisma.aIResponseLog.create({
      data: {
        userId,
        courseId: material.courseId,
        moduleId: material.moduleId,
        interactionType: AIInteractionType.SUMMARY,
        prompt: result.promptText,
        response: result.rawResponse,
        modelName: result.modelName,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        metadata: {
          kind: "material-study-kit",
          materialId: material.id,
        },
      },
      select: { id: true },
    });

    return NextResponse.json({
      success: true,
      message: "Draf bahan belajar berhasil dibuat.",
      data: {
        kit: result.kit,
        truncated: result.truncated,
      },
    });
  } catch (error) {
    console.error("POST study-kit error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal membuat bahan belajar." },
      { status: 500 },
    );
  }
}
