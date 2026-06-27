/** @format */

import { NextRequest, NextResponse } from "next/server";
import { AIInteractionType, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { aggregateStudentPortfolio } from "@/lib/analytics/portfolio";
import { generatePortfolioSummary } from "@/lib/ai/portfolio-summary";
import { isAiEnabled } from "@/lib/ai/openai";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";

type Params = {
  params: Promise<{
    userId: string;
  }>;
};

export async function POST(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.STUDENT]);

    if (auth.response) {
      return auth.response;
    }

    const { userId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Student can only generate their own portfolio",
        },
        { status: 403 },
      );
    }

    if (!isAiEnabled()) {
      return NextResponse.json(
        {
          success: false,
          message: "Fitur AI belum aktif. Hubungi admin untuk mengaktifkan.",
        },
        { status: 503 },
      );
    }

    const limited = await enforceAiRateLimit(auth.user.id);
    if (limited.response) return limited.response;

    const achievements = await aggregateStudentPortfolio(userId);

    if (!achievements) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 },
      );
    }

    const result = await generatePortfolioSummary({
      studentName:
        `${achievements.student.firstName} ${achievements.student.lastName}`.trim(),
      courses: achievements.courses.map((c) => ({
        title: c.title,
        progressPercent: c.progressPercent,
        completedModules: c.completedModules,
        totalModules: c.totalModules,
      })),
      quizzes: achievements.quizzes,
      cer: {
        submitted: achievements.cer.submitted,
        graded: achievements.cer.graded,
        averageScore: achievements.cer.averageScore,
      },
      projects: {
        submitted: achievements.projects.submitted,
        graded: achievements.projects.graded,
        titles: achievements.projects.titles,
      },
      reflections: achievements.reflections,
    });

    const generatedAt = new Date();

    const portfolio = await prisma.portfolio.upsert({
      where: { studentId: userId },
      create: {
        studentId: userId,
        headline: result.portfolio.headline,
        aiSummary: result.portfolio.summary,
        strengths: result.portfolio.strengths,
        highlights: result.portfolio.recommendations,
        modelName: result.modelName,
        generatedAt,
      },
      update: {
        headline: result.portfolio.headline,
        aiSummary: result.portfolio.summary,
        strengths: result.portfolio.strengths,
        highlights: result.portfolio.recommendations,
        modelName: result.modelName,
        generatedAt,
      },
      select: {
        headline: true,
        aiSummary: true,
        strengths: true,
        highlights: true,
        modelName: true,
        generatedAt: true,
      },
    });

    await prisma.aIResponseLog.create({
      data: {
        userId,
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
        message: "Portofolio berhasil dibuat",
        data: { portfolio },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "POST /api/students/[userId]/portfolio/generate error:",
      error,
    );

    return NextResponse.json(
      { success: false, message: "Gagal membuat portofolio" },
      { status: 500 },
    );
  }
}
