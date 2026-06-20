/** @format */

import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { readMaterialFile } from "@/lib/materials/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    materialId: string;
  }>;
};

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

    const material = await prisma.courseMaterial.findFirst({
      where: {
        id: materialId,
        course: { slug, lecturerId: userId },
      },
      select: {
        storageKey: true,
        fileName: true,
        mimeType: true,
      },
    });

    if (!material) {
      return NextResponse.json(
        { success: false, message: "Materi tidak ditemukan." },
        { status: 404 },
      );
    }

    const buffer = await readMaterialFile(material.storageKey);
    const asciiName = material.fileName.replace(/[^\x20-\x7E]/g, "_");
    const encodedName = encodeURIComponent(material.fileName);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": material.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("GET material download error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengunduh berkas." },
      { status: 500 },
    );
  }
}
