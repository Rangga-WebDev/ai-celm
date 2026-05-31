/** @format */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ResourceType } from "@/generated/prisma/client";

type Params = {
  params: Promise<{
    resourceId: string;
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

    const { resourceId } = await params;
    const body = await req.json();

    const existingResource = await prisma.learningResource.findFirst({
      where: {
        id: resourceId,
        module: {
          course: {
            lecturerId: user.id,
          },
        },
      },
    });

    if (!existingResource) {
      return NextResponse.json(
        { success: false, message: "Resource not found or not owned by lecturer" },
        { status: 404 },
      );
    }

    const title =
      body.title !== undefined
        ? String(body.title).trim()
        : existingResource.title;

    const description =
      body.description !== undefined
        ? body.description
          ? String(body.description).trim()
          : null
        : existingResource.description;

    const type = body.type !== undefined ? body.type : existingResource.type;

    const url =
      body.url !== undefined ? String(body.url).trim() : existingResource.url;

    const sortOrder =
      body.sortOrder !== undefined
        ? body.sortOrder
          ? Number(body.sortOrder)
          : null
        : existingResource.sortOrder;

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

    const updatedResource = await prisma.learningResource.update({
      where: {
        id: resourceId,
      },
      data: {
        title,
        description,
        type,
        url,
        sortOrder,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Resource berhasil diperbarui",
      data: updatedResource,
    });
  } catch (error) {
    console.error("PATCH /api/lecturer/resources/[resourceId] error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update resource" },
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

    const { resourceId } = await params;

    const existingResource = await prisma.learningResource.findFirst({
      where: {
        id: resourceId,
        module: {
          course: {
            lecturerId: user.id,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!existingResource) {
      return NextResponse.json(
        { success: false, message: "Resource not found or not owned by lecturer" },
        { status: 404 },
      );
    }

    await prisma.learningResource.delete({
      where: {
        id: resourceId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Resource berhasil dihapus",
    });
  } catch (error) {
    console.error("DELETE /api/lecturer/resources/[resourceId] error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete resource" },
      { status: 500 },
    );
  }
}