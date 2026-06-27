/** @format */

import { NextRequest, NextResponse } from "next/server";
import {
  AIInteractionType,
  MaterialStatus,
  QuizStatus,
  Role,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { isAiEnabled } from "@/lib/ai/openai";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import {
  generateQuizFromMaterial,
  MAX_QUIZ_QUESTIONS,
  MIN_QUIZ_QUESTIONS,
} from "@/lib/ai/quiz-generator";

export const runtime = "nodejs";

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

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Anda hanya dapat membuat kuis untuk kelas Anda sendiri.",
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
      title?: unknown;
      questionCount?: unknown;
    } | null;

    const materialId = String(body?.materialId ?? "").trim();

    if (!materialId) {
      return NextResponse.json(
        {
          success: false,
          message: "Pilih materi sumber soal terlebih dahulu.",
        },
        { status: 400 },
      );
    }

    const requestedCount = Number(body?.questionCount ?? 5);
    const questionCount = Number.isFinite(requestedCount)
      ? Math.min(
          MAX_QUIZ_QUESTIONS,
          Math.max(MIN_QUIZ_QUESTIONS, Math.round(requestedCount)),
        )
      : 5;

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
            "Materi belum punya teks yang cukup untuk dibuatkan soal. Pastikan materi berhasil diproses.",
        },
        { status: 409 },
      );
    }

    // Modul tujuan kuis: pakai modul dari materi, atau modul yang dipilih dosen.
    const requestedModuleId = String(body?.moduleId ?? "").trim();
    let targetModuleId = material.moduleId ?? requestedModuleId;

    if (requestedModuleId) {
      targetModuleId = requestedModuleId;
    }

    if (!targetModuleId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Materi ini belum terkait modul. Pilih modul tujuan kuis terlebih dahulu.",
        },
        { status: 400 },
      );
    }

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

    let result;
    try {
      result = await generateQuizFromMaterial({
        courseTitle: course.title,
        materialTitle: material.title,
        materialText: material.extractedText,
        questionCount,
      });
    } catch (aiError) {
      console.error("Quiz generation error:", aiError);
      return NextResponse.json(
        {
          success: false,
          message: "AI gagal menyusun soal. Coba lagi atau ganti materi.",
        },
        { status: 502 },
      );
    }

    const requestedTitle = String(body?.title ?? "").trim();
    const quizTitle =
      requestedTitle.length > 0
        ? requestedTitle.slice(0, 200)
        : `Kuis: ${material.title}`.slice(0, 200);

    const quiz = await prisma.$transaction(async (tx) => {
      const created = await tx.quiz.create({
        data: {
          moduleId: targetModule.id,
          title: quizTitle,
          description: `Draf soal dibuat AI dari materi "${material.title}". Tinjau dan sunting sebelum diterbitkan.`,
          status: QuizStatus.DRAFT,
        },
        select: { id: true },
      });

      let order = 1;
      for (const question of result.questions) {
        await tx.quizQuestion.create({
          data: {
            quizId: created.id,
            questionText: question.questionText,
            questionType: question.questionType,
            explanation:
              question.explanation.length > 0 ? question.explanation : null,
            order,
            points: question.points,
            options: {
              create: question.options.map((option, index) => ({
                optionText: option.optionText,
                isCorrect: option.isCorrect,
                order: index + 1,
              })),
            },
          },
        });
        order += 1;
      }

      return created;
    });

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
        metadata: {
          kind: "quiz-generation",
          materialId: material.id,
          quizId: quiz.id,
          questionCount: result.questions.length,
        },
      },
      select: { id: true },
    });

    return NextResponse.json({
      success: true,
      message: `Kuis draf dengan ${result.questions.length} soal berhasil dibuat.`,
      data: {
        quizId: quiz.id,
        questionCount: result.questions.length,
        truncated: result.truncated,
      },
    });
  } catch (error) {
    console.error("Quiz AI generate route error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat membuat kuis." },
      { status: 500 },
    );
  }
}
