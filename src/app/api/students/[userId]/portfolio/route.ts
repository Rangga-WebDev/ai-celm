/** @format */

import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { aggregateStudentPortfolio } from "@/lib/analytics/portfolio";
import { isAiEnabled } from "@/lib/ai/openai";

type Params = {
  params: Promise<{
    userId: string;
  }>;
};

export async function GET(_: NextRequest, { params }: Params) {
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
          message: "Student can only view their own portfolio",
        },
        { status: 403 },
      );
    }

    const achievements = await aggregateStudentPortfolio(userId);

    if (!achievements) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 },
      );
    }

    // Catatan ringkasan AI bersifat opsional. Bila tabel Portfolio belum
    // tersedia (migrasi belum dijalankan), halaman tetap dapat menampilkan
    // agregasi capaian tanpa gagal total.
    let portfolio = null;
    try {
      portfolio = await prisma.portfolio.findUnique({
        where: { studentId: userId },
        select: {
          headline: true,
          aiSummary: true,
          strengths: true,
          highlights: true,
          modelName: true,
          generatedAt: true,
        },
      });
    } catch (portfolioError) {
      console.warn(
        "Portfolio record unavailable (migration pending?):",
        portfolioError,
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Portfolio fetched successfully",
        data: {
          achievements,
          portfolio,
          aiEnabled: isAiEnabled(),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/students/[userId]/portfolio error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch portfolio" },
      { status: 500 },
    );
  }
}
