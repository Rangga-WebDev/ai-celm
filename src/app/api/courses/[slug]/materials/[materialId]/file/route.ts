/** @format */

import { NextRequest, NextResponse } from "next/server";
import { EnrollmentStatus, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { readMaterialFile } from "@/lib/materials/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    slug: string;
    materialId: string;
  }>;
};

/**
 * Menyajikan berkas materi bahan belajar agar dapat dibuka/ditampilkan
 * (inline) oleh dosen pemilik kelas maupun mahasiswa yang terdaftar aktif.
 * Bagi mahasiswa, materi hanya dapat diakses bila memang ditujukan untuk
 * mereka (tertaut sebagai bahan belajar atau study kit yang diterbitkan).
 */
export async function GET(_: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Silakan masuk terlebih dahulu." },
        { status: 401 },
      );
    }

    const { slug, materialId } = await params;

    const material = await prisma.courseMaterial.findFirst({
      where: { id: materialId, course: { slug } },
      select: {
        storageKey: true,
        fileName: true,
        mimeType: true,
        course: { select: { id: true, lecturerId: true } },
        studyKit: { select: { isPublished: true } },
        _count: { select: { learningResources: true } },
      },
    });

    if (!material) {
      return NextResponse.json(
        { success: false, message: "Materi tidak ditemukan." },
        { status: 404 },
      );
    }

    const isOwnerLecturer =
      user.role === Role.LECTURER && material.course.lecturerId === user.id;

    let authorized = isOwnerLecturer;

    if (!authorized && user.role === Role.STUDENT) {
      const isExposed =
        material._count.learningResources > 0 ||
        material.studyKit?.isPublished === true;

      if (isExposed) {
        const enrollment = await prisma.enrollment.findFirst({
          where: {
            userId: user.id,
            courseId: material.course.id,
            status: EnrollmentStatus.ACTIVE,
          },
          select: { id: true },
        });
        authorized = Boolean(enrollment);
      }
    }

    if (!authorized) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 },
      );
    }

    const buffer = await readMaterialFile(material.storageKey);
    const asciiName = material.fileName.replace(/[^\x20-\x7E]/g, "_");
    const encodedName = encodeURIComponent(material.fileName);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": material.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("GET course material file error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat berkas." },
      { status: 500 },
    );
  }
}
