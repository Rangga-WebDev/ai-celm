/** @format */

import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { deleteMaterialFile } from "@/lib/materials/storage";

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

    return NextResponse.json({
      success: true,
      data: {
        id: material.id,
        title: material.title,
        description: material.description,
        fileName: material.fileName,
        mimeType: material.mimeType,
        fileSize: material.fileSize,
        charCount: material.charCount,
        status: material.status,
        errorMessage: material.errorMessage,
        extractedText: material.extractedText,
        createdAt: material.createdAt,
        moduleId: material.moduleId,
      },
    });
  } catch (error) {
    console.error("GET material error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat materi." },
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

    await deleteMaterialFile(material.storageKey);
    await prisma.courseMaterial.delete({ where: { id: material.id } });

    return NextResponse.json({
      success: true,
      message: "Materi berhasil dihapus.",
    });
  } catch (error) {
    console.error("DELETE material error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menghapus materi." },
      { status: 500 },
    );
  }
}
