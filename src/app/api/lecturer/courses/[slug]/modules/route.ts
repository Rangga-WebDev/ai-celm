/** @format */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ModuleStatus } from "@/generated/prisma/client";

type Params = {
  params: Promise<{
    slug: string;
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

async function makeUniqueModuleSlug(courseId: string, title: string) {
  const base = slugify(title) || "module";
  let slug = base;
  let counter = 2;

  while (
    await prisma.module.findFirst({
      where: {
        courseId,
        slug,
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

async function getNextModuleOrder(courseId: string) {
  const result = await prisma.module.aggregate({
    where: { courseId },
    _max: { order: true },
  });

  return (result._max.order ?? 0) + 1;
}

export async function GET(_: Request, { params }: Params) {
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

    const { slug } = await params;

    const course = await prisma.course.findFirst({
      where: {
        slug,
        lecturerId: user.id,
      },
      include: {
        modules: {
          orderBy: {
            order: "asc",
          },
          include: {
            resources: {
              orderBy: {
                sortOrder: "asc",
              },
            },
            _count: {
              select: {
                units: true,
                resources: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, message: "Course not found or not owned by lecturer" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        course: {
          id: course.id,
          title: course.title,
          slug: course.slug,
          code: course.code,
        },
        modules: course.modules,
      },
    });
  } catch (error) {
    console.error("GET /api/lecturer/courses/[slug]/modules error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch modules" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request, { params }: Params) {
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

    const { slug } = await params;
    const body = await req.json();

    const title = String(body.title ?? "").trim();
    const description = body.description
      ? String(body.description).trim()
      : null;
    const estimatedMinutes = body.estimatedMinutes
      ? Number(body.estimatedMinutes)
      : null;
    const status = body.status ?? ModuleStatus.DRAFT;
    const isLocked = Boolean(body.isLocked ?? false);
    const masteryThreshold = body.masteryThreshold
      ? Number(body.masteryThreshold)
      : 75;

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

    const course = await prisma.course.findFirst({
      where: {
        slug,
        lecturerId: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, message: "Course not found or not owned by lecturer" },
        { status: 404 },
      );
    }

    const order = body.order ? Number(body.order) : await getNextModuleOrder(course.id);

    const existingOrder = await prisma.module.findFirst({
      where: {
        courseId: course.id,
        order,
      },
      select: {
        id: true,
      },
    });

    if (existingOrder) {
      return NextResponse.json(
        { success: false, message: "Urutan modul sudah digunakan" },
        { status: 409 },
      );
    }

    const moduleSlug = await makeUniqueModuleSlug(course.id, title);

    const createdModule = await prisma.module.create({
      data: {
        courseId: course.id,
        title,
        slug: moduleSlug,
        description,
        order,
        estimatedMinutes,
        status,
        isLocked,
        masteryThreshold,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Modul berhasil dibuat",
        data: createdModule,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/lecturer/courses/[slug]/modules error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to create module" },
      { status: 500 },
    );
  }
}