/** @format */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ResourceType } from "@/generated/prisma/client";

type Params = {
  params: Promise<{
    moduleId: string;
  }>;
};

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
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

    const { moduleId } = await params;

    const courseModule = await prisma.module.findFirst({
      where: {
        id: moduleId,
        course: {
          lecturerId: user.id,
        },
      },
      include: {
        resources: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (!courseModule) {
      return NextResponse.json(
        {
          success: false,
          message: "Module not found or not owned by lecturer",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: courseModule.resources,
    });
  } catch (error) {
    console.error(
      "GET /api/lecturer/modules/[moduleId]/resources error:",
      error,
    );

    return NextResponse.json(
      { success: false, message: "Failed to fetch resources" },
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

    const { moduleId } = await params;
    const body = await req.json();

    const title = String(body.title ?? "").trim();
    const description = body.description
      ? String(body.description).trim()
      : null;
    const type = body.type ?? ResourceType.PDF;
    const url = String(body.url ?? "").trim();
    const sortOrder = body.sortOrder ? Number(body.sortOrder) : null;

    if (!title) {
      return NextResponse.json(
        { success: false, message: "Judul resource wajib diisi" },
        { status: 400 },
      );
    }

    if (!Object.values(ResourceType).includes(type)) {
      return NextResponse.json(
        { success: false, message: "Tipe resource tidak valid" },
        { status: 400 },
      );
    }

    if (!url || !isValidUrl(url)) {
      return NextResponse.json(
        { success: false, message: "URL resource tidak valid" },
        { status: 400 },
      );
    }

    const courseModule = await prisma.module.findFirst({
      where: {
        id: moduleId,
        course: {
          lecturerId: user.id,
        },
      },
      select: {
        id: true,
        courseId: true,
      },
    });

    if (!courseModule) {
      return NextResponse.json(
        {
          success: false,
          message: "Module not found or not owned by lecturer",
        },
        { status: 404 },
      );
    }

    const resource = await prisma.learningResource.create({
      data: {
        moduleId: courseModule.id,
        courseId: courseModule.courseId,
        title,
        description,
        type,
        url,
        sortOrder,
        uploadedById: user.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Resource berhasil ditambahkan",
        data: resource,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/lecturer/modules/[moduleId]/resources error:",
      error,
    );

    return NextResponse.json(
      { success: false, message: "Failed to create resource" },
      { status: 500 },
    );
  }
}