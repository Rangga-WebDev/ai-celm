/** @format */

import { NextRequest, NextResponse } from "next/server";
import { EnrollmentStatus, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
  }>;
};

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.STUDENT]);
    if (auth.response) return auth.response;

    const { userId, slug } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Mahasiswa hanya dapat mengakses bahan belajarnya sendiri.",
        },
        { status: 403 },
      );
    }

    const course = await prisma.course.findFirst({
      where: { slug, isPublished: true },
      select: { id: true, title: true, slug: true, code: true },
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

    const kits = await prisma.materialStudyKit.findMany({
      where: { courseId: course.id, isPublished: true },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        summary: true,
        keyPoints: true,
        flashcards: true,
        quiz: true,
        publishedAt: true,
        material: {
          select: {
            id: true,
            title: true,
            module: { select: { id: true, title: true } },
          },
        },
      },
    });

    const data = kits.map((kit) => ({
      id: kit.id,
      title: kit.material.title,
      moduleTitle: kit.material.module?.title ?? null,
      publishedAt: kit.publishedAt,
      summary: kit.summary,
      keyPoints: kit.keyPoints,
      flashcards: kit.flashcards,
      quiz: kit.quiz,
    }));

    return NextResponse.json({
      success: true,
      data: { course, kits: data },
    });
  } catch (error) {
    console.error("GET student study-kits error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat bahan belajar." },
      { status: 500 },
    );
  }
}
