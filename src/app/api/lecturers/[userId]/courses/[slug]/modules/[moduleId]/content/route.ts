/** @format */

import { NextRequest, NextResponse } from "next/server";
import { MaterialStatus, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import {
  moduleLearningContentSchema,
  normalizeModuleLearningContent,
} from "@/lib/validators/module-content.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    moduleId: string;
  }>;
};

async function getOwnedModule(userId: string, slug: string, moduleId: string) {
  const course = await prisma.course.findFirst({
    where: { slug, lecturerId: userId },
    select: { id: true, title: true, slug: true },
  });

  if (!course) {
    return { course: null, targetModule: null };
  }

  const targetModule = await prisma.module.findFirst({
    where: { id: moduleId, courseId: course.id },
    select: {
      id: true,
      title: true,
      description: true,
      learningContent: true,
      contentGeneratedByAi: true,
      contentSourceMaterialId: true,
      contentUpdatedAt: true,
    },
  });

  return { course, targetModule };
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug, moduleId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 },
      );
    }

    const { course, targetModule } = await getOwnedModule(
      userId,
      slug,
      moduleId,
    );

    if (!course || !targetModule) {
      return NextResponse.json(
        { success: false, message: "Modul tidak ditemukan." },
        { status: 404 },
      );
    }

    const materials = await prisma.courseMaterial.findMany({
      where: { courseId: course.id, status: MaterialStatus.READY },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        fileName: true,
        charCount: true,
        moduleId: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Konten modul berhasil dimuat.",
        data: {
          course: { title: course.title, slug: course.slug },
          module: {
            id: targetModule.id,
            title: targetModule.title,
            description: targetModule.description,
            generatedByAi: targetModule.contentGeneratedByAi,
            sourceMaterialId: targetModule.contentSourceMaterialId,
            updatedAt: targetModule.contentUpdatedAt,
          },
          content: normalizeModuleLearningContent(targetModule.learningContent),
          materials,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET module content error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat konten modul." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug, moduleId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 },
      );
    }

    const { course, targetModule } = await getOwnedModule(
      userId,
      slug,
      moduleId,
    );

    if (!course || !targetModule) {
      return NextResponse.json(
        { success: false, message: "Modul tidak ditemukan." },
        { status: 404 },
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = moduleLearningContentSchema.safeParse(json?.content ?? json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Struktur konten tidak valid.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const updated = await prisma.module.update({
      where: { id: targetModule.id },
      data: {
        learningContent: parsed.data,
        contentGeneratedByAi: false,
        contentUpdatedAt: new Date(),
      },
      select: { id: true, contentUpdatedAt: true },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Konten modul tersimpan.",
        data: {
          content: parsed.data,
          updatedAt: updated.contentUpdatedAt,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("PUT module content error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menyimpan konten modul." },
      { status: 500 },
    );
  }
}
