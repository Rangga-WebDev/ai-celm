/** @format */

import { NextRequest, NextResponse } from "next/server";
import {
  MaterialStatus,
  MaterialCategory,
  Role,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { saveMaterialFile } from "@/lib/materials/storage";
import {
  ALLOWED_MATERIAL_MIME,
  MAX_MATERIAL_BYTES,
  extractTextFromBuffer,
} from "@/lib/materials/extract-text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
  }>;
};

function optionalText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

async function findOwnedCourse(userId: string, slug: string) {
  return prisma.course.findFirst({
    where: { slug, lecturerId: userId },
    select: { id: true },
  });
}

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

    const course = await findOwnedCourse(userId, slug);
    if (!course) {
      return NextResponse.json(
        { success: false, message: "Mata kuliah tidak ditemukan." },
        { status: 404 },
      );
    }

    const materials = await prisma.courseMaterial.findMany({
      where: { courseId: course.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        fileName: true,
        mimeType: true,
        fileSize: true,
        charCount: true,
        status: true,
        category: true,
        errorMessage: true,
        createdAt: true,
        moduleId: true,
        module: { select: { id: true, title: true } },
        studyKit: { select: { isPublished: true } },
      },
    });

    return NextResponse.json({ success: true, data: materials });
  } catch (error) {
    console.error("GET materials error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat materi." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, { params }: Params) {
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

    const course = await findOwnedCourse(userId, slug);
    if (!course) {
      return NextResponse.json(
        { success: false, message: "Mata kuliah tidak ditemukan." },
        { status: 404 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const title = optionalText(formData.get("title"));
    const description = optionalText(formData.get("description"));
    const moduleIdRaw = optionalText(formData.get("moduleId"));
    const categoryRaw = optionalText(formData.get("category"));
    const category =
      categoryRaw === "CURRICULUM"
        ? MaterialCategory.CURRICULUM
        : MaterialCategory.GENERAL;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Berkas materi wajib diunggah." },
        { status: 400 },
      );
    }

    const mimeType = file.type;
    if (!ALLOWED_MATERIAL_MIME[mimeType]) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tipe berkas tidak didukung. Gunakan PDF, Word (.doc/.docx), TXT, atau Markdown.",
        },
        { status: 400 },
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { success: false, message: "Berkas kosong." },
        { status: 400 },
      );
    }

    if (file.size > MAX_MATERIAL_BYTES) {
      return NextResponse.json(
        { success: false, message: "Ukuran berkas melebihi 15 MB." },
        { status: 400 },
      );
    }

    // Validasi modul (opsional) milik kelas ini.
    let moduleId: string | null = null;
    if (moduleIdRaw) {
      const ownedModule = await prisma.module.findFirst({
        where: { id: moduleIdRaw, courseId: course.id },
        select: { id: true },
      });
      if (!ownedModule) {
        return NextResponse.json(
          { success: false, message: "Modul tidak ditemukan di kelas ini." },
          { status: 400 },
        );
      }
      moduleId = ownedModule.id;
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const storageKey = await saveMaterialFile(buffer, mimeType, file.name);

    // Coba ekstrak teks. Jika gagal, materi tetap tersimpan dengan status FAILED.
    let extractedText: string | null = null;
    let charCount: number | null = null;
    let status: MaterialStatus = MaterialStatus.READY;
    let errorMessage: string | null = null;

    try {
      const result = await extractTextFromBuffer(buffer, mimeType);
      extractedText = result.text;
      charCount = result.charCount;

      if (result.charCount === 0) {
        status = MaterialStatus.FAILED;
        errorMessage =
          "Tidak ada teks yang bisa dibaca (berkas mungkin hasil pindai/gambar).";
      }
    } catch (extractError) {
      console.error("Material extraction error:", extractError);
      status = MaterialStatus.FAILED;
      errorMessage = "Gagal membaca isi berkas.";
    }

    const material = await prisma.courseMaterial.create({
      data: {
        courseId: course.id,
        moduleId,
        uploadedById: auth.user.id,
        title: title ?? file.name,
        description,
        fileName: file.name,
        mimeType,
        fileSize: file.size,
        storageKey,
        extractedText,
        charCount,
        status,
        category,
        errorMessage,
      },
      select: {
        id: true,
        title: true,
        description: true,
        fileName: true,
        mimeType: true,
        fileSize: true,
        charCount: true,
        status: true,
        category: true,
        errorMessage: true,
        createdAt: true,
        moduleId: true,
        module: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(
      { success: true, message: "Materi berhasil diunggah.", data: material },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST materials error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengunggah materi." },
      { status: 500 },
    );
  }
}
