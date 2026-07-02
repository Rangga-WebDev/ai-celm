/** @format */

import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    cplId: string;
  }>;
};

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug, cplId } = await params;
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

    const mapping = await prisma.courseCPL.findUnique({
      where: { courseId_cplId: { courseId: course.id, cplId } },
      select: { id: true },
    });
    if (!mapping) {
      return NextResponse.json(
        { success: false, message: "CPL tidak terhubung ke mata kuliah ini." },
        { status: 404 },
      );
    }

    await prisma.courseCPL.delete({ where: { id: mapping.id } });

    return NextResponse.json({
      success: true,
      message: "CPL berhasil dilepas dari mata kuliah.",
    });
  } catch (error) {
    console.error("DELETE course CPL error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal melepas CPL." },
      { status: 500 },
    );
  }
}
