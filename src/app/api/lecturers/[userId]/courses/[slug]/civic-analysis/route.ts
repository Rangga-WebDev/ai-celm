/** @format */

import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { analyzeCourseCivicEngagement } from "@/lib/analytics/civic-engagement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
  }>;
};

export async function GET(_: NextRequest, { params }: Params) {
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
      select: { id: true },
    });
    if (!course) {
      return NextResponse.json(
        { success: false, message: "Mata kuliah tidak ditemukan." },
        { status: 404 },
      );
    }

    const analysis = await analyzeCourseCivicEngagement(course.id);
    if (!analysis) {
      return NextResponse.json(
        { success: false, message: "Data analisis tidak tersedia." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: analysis });
  } catch (error) {
    console.error("GET civic analysis error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat analisis civic engagement." },
      { status: 500 },
    );
  }
}
