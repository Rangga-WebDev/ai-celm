/** @format */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    moduleId: string;
  }>;
};

export async function GET(_: Request, { params }: Params) {
  try {
    const { moduleId } = await params;

    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        units: {
          orderBy: {
            order: "asc",
          },
          include: {
            subCpmkMappings: {
              include: {
                subCpmk: true,
              },
            },
            resources: true,
          },
        },
      },
    });

    if (!module) {
      return NextResponse.json(
        {
          success: false,
          message: "Module not found",
        },
        { status: 404 },
      );
    }

    const result = module.units.map((unit) => ({
      id: unit.id,
      title: unit.title,
      slug: unit.slug,
      description: unit.description,
      content: unit.content,
      order: unit.order,
      unitType: unit.unitType,
      estimatedMinutes: unit.estimatedMinutes,
      isRequired: unit.isRequired,
      isLocked: unit.isLocked,
      masteryThreshold: unit.masteryThreshold,
      subCpmks: unit.subCpmkMappings.map((item) => item.subCpmk),
      resources: unit.resources,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
    }));

    return NextResponse.json(
      {
        success: true,
        message: "Units fetched successfully",
        data: {
          moduleId: module.id,
          moduleTitle: module.title,
          moduleSlug: module.slug,
          units: result,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/modules/[moduleId]/units error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch units",
      },
      { status: 500 },
    );
  }
}
