/** @format */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ModuleStatus } from "@/generated/prisma/client";

type Params = {
  params: Promise<{
    moduleId: string;
  }>;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function makeUniqueModuleSlug(
  courseId: string,
  title: string,
  excludeModuleId: string,
) {
  const base = slugify(title) || "module";
  let slug = base;
  let counter = 2;

  while (
    await prisma.module.findFirst({
      where: {
        courseId,
        slug,
        NOT: {
          id: excludeModuleId,
        },
      },
      select: {
        id: true,
      },
    })
  ) {
    slug = `${base}-${counter}`;
    counter++;
  }

  return slug;
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    if (user.role !== "LECTURER") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    const { moduleId } = await params;
    const body = await req.json();

    const existingModule = await prisma.module.findFirst({
      where: {
        id: moduleId,
        course: {
          lecturerId: user.id,
        },
      },
      include: {
        course: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!existingModule) {
      return NextResponse.json(
        { success: false, message: "Module not found or not owned by lecturer" },
        { status: 404 },
      );
    }

    const title = body.title ? String(body.title).trim() : existingModule.title;
    const description =
      body.description !== undefined
        ? body.description
          ? String(body.description).trim()
          : null
        : existingModule.description;

    const order =
      body.order !== undefined ? Number(body.order) : existingModule.order;

    const estimatedMinutes =
      body.estimatedMinutes !== undefined
        ? body.estimatedMinutes
          ? Number(body.estimatedMinutes)
          : null
        : existingModule.estimatedMinutes;

    const status =
      body.status !== undefined ? body.status : existingModule.status;

    const isLocked =
      body.isLocked !== undefined
        ? Boolean(body.isLocked)
        : existingModule.isLocked;

    const masteryThreshold =
      body.masteryThreshold !== undefined
        ? Number(body.masteryThreshold)
        : existingModule.masteryThreshold;

    if (!title) {
      return NextResponse.json(
        { success: false, message: "Judul modul wajib diisi" },
        { status: 400 },
      );
    }

    if (!Object.values(ModuleStatus).includes(status)) {
      return NextResponse.json(
        { success: false, message: "Status modul tidak valid" },
        { status: 400 },
      );
    }

    const duplicatedOrder = await prisma.module.findFirst({
      where: {
        courseId: existingModule.courseId,
        order,
        NOT: {
          id: moduleId,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicatedOrder) {
      return NextResponse.json(
        { success: false, message: "Urutan modul sudah digunakan" },
        { status: 409 },
      );
    }

    const nextSlug =
      title !== existingModule.title
        ? await makeUniqueModuleSlug(existingModule.courseId, title, moduleId)
        : existingModule.slug;

    const updatedModule = await prisma.module.update({
      where: {
        id: moduleId,
      },
      data: {
        title,
        slug: nextSlug,
        description,
        order,
        estimatedMinutes,
        status,
        isLocked,
        masteryThreshold,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Modul berhasil diperbarui",
      data: updatedModule,
    });
  } catch (error) {
    console.error("PATCH /api/lecturer/modules/[moduleId] error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update module" },
      { status: 500 },
    );
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    if (user.role !== "LECTURER") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    const { moduleId } = await params;

    const existingModule = await prisma.module.findFirst({
      where: {
        id: moduleId,
        course: {
          lecturerId: user.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (!existingModule) {
      return NextResponse.json(
        { success: false, message: "Module not found or not owned by lecturer" },
        { status: 404 },
      );
    }

    await prisma.module.delete({
      where: {
        id: moduleId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Modul berhasil dihapus",
    });
  } catch (error) {
    console.error("DELETE /api/lecturer/modules/[moduleId] error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete module" },
      { status: 500 },
    );
  }
}