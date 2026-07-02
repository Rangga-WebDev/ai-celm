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
    cpmkId: string;
  }>;
};

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug, cpmkId } = await params;
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

    const cpmk = await prisma.cPMK.findFirst({
      where: { id: cpmkId, courseId: course.id },
      select: { id: true },
    });
    if (!cpmk) {
      return NextResponse.json(
        { success: false, message: "CPMK tidak ditemukan." },
        { status: 404 },
      );
    }

    await prisma.cPMK.delete({ where: { id: cpmk.id } });

    return NextResponse.json({
      success: true,
      message: "CPMK berhasil dihapus.",
    });
  } catch (error) {
    console.error("DELETE course CPMK error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menghapus CPMK." },
      { status: 500 },
    );
  }
}
