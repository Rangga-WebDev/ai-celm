/** @format */

import { NextRequest, NextResponse } from "next/server";
import { MaterialStatus, ResourceType, Role } from "@/generated/prisma/client";
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

const RESOURCE_INCLUDE = {
  module: {
    select: { id: true, title: true, slug: true, order: true },
  },
  microUnit: {
    select: {
      id: true,
      title: true,
      slug: true,
      order: true,
      moduleId: true,
      unitType: true,
    },
  },
  uploadedBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
} as const;

function resourceTypeForMime(mimeType: string): ResourceType {
  if (mimeType === "application/pdf") return ResourceType.PDF;
  if (
    mimeType === "application/msword" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return ResourceType.DOC;
  }
  return ResourceType.OTHER;
}

type TargetType = "COURSE" | "MODULE" | "UNIT";

const resourceTypeOptions = Object.values(ResourceType);

function isValidResourceType(value: unknown): value is ResourceType {
  return (
    typeof value === "string" &&
    resourceTypeOptions.includes(value as ResourceType)
  );
}

function isValidTargetType(value: unknown): value is TargetType {
  return value === "COURSE" || value === "MODULE" || value === "UNIT";
}

function optionalText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function toNullableInt(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(1, Math.round(parsed));
}

async function getOwnedCourse(userId: string, slug: string) {
  return prisma.course.findFirst({
    where: {
      slug,
      lecturerId: userId,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      code: true,
      description: true,
      isPublished: true,
    },
  });
}

async function resolveResourceTarget({
  courseId,
  targetType,
  moduleId,
  microUnitId,
}: {
  courseId: string;
  targetType: TargetType;
  moduleId: string | null;
  microUnitId: string | null;
}) {
  if (targetType === "COURSE") {
    return {
      courseId,
      moduleId: null,
      microUnitId: null,
      error: null,
    };
  }

  if (targetType === "MODULE") {
    if (!moduleId) {
      return {
        courseId: null,
        moduleId: null,
        microUnitId: null,
        error: "Module is required for module-level resource",
      };
    }

    const targetModule = await prisma.module.findFirst({
      where: {
        id: moduleId,
        courseId,
      },
      select: {
        id: true,
      },
    });

    if (!targetModule) {
      return {
        courseId: null,
        moduleId: null,
        microUnitId: null,
        error: "Selected module is not found in this course",
      };
    }

    return {
      courseId,
      moduleId: targetModule.id,
      microUnitId: null,
      error: null,
    };
  }

  if (!microUnitId) {
    return {
      courseId: null,
      moduleId: null,
      microUnitId: null,
      error: "Micro-unit is required for unit-level resource",
    };
  }

  const targetUnit = await prisma.microUnit.findFirst({
    where: {
      id: microUnitId,
      module: {
        courseId,
      },
    },
    select: {
      id: true,
      moduleId: true,
    },
  });

  if (!targetUnit) {
    return {
      courseId: null,
      moduleId: null,
      microUnitId: null,
      error: "Selected micro-unit is not found in this course",
    };
  }

  return {
    courseId,
    moduleId: targetUnit.moduleId,
    microUnitId: targetUnit.id,
    error: null,
  };
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lecturer can only access resources from their own courses",
        },
        { status: 403 },
      );
    }

    const course = await getOwnedCourse(userId, slug);

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          message: "Course not found or you are not assigned to this course",
        },
        { status: 404 },
      );
    }

    const [modules, resources] = await Promise.all([
      prisma.module.findMany({
        where: {
          courseId: course.id,
        },
        orderBy: {
          order: "asc",
        },
        select: {
          id: true,
          title: true,
          slug: true,
          order: true,
          status: true,
          units: {
            orderBy: {
              order: "asc",
            },
            select: {
              id: true,
              title: true,
              slug: true,
              order: true,
              unitType: true,
              moduleId: true,
            },
          },
        },
      }),

      prisma.learningResource.findMany({
        where: {
          OR: [
            {
              courseId: course.id,
            },
            {
              module: {
                courseId: course.id,
              },
            },
            {
              microUnit: {
                module: {
                  courseId: course.id,
                },
              },
            },
          ],
        },
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            createdAt: "desc",
          },
        ],
        include: {
          module: {
            select: {
              id: true,
              title: true,
              slug: true,
              order: true,
            },
          },
          microUnit: {
            select: {
              id: true,
              title: true,
              slug: true,
              order: true,
              moduleId: true,
              unitType: true,
            },
          },
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        message: "Learning resources fetched successfully",
        data: {
          course,
          modules,
          resources,
          resourceTypes: resourceTypeOptions,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "GET /api/lecturers/[userId]/courses/[slug]/resources error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch learning resources",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lecturer can only create resources for their own courses",
        },
        { status: 403 },
      );
    }

    const course = await getOwnedCourse(userId, slug);

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          message: "Course not found or you are not assigned to this course",
        },
        { status: 404 },
      );
    }

    const contentType = request.headers.get("content-type") ?? "";

    // Unggah berkas (PDF/Word/dll) sebagai bahan belajar yang juga bisa
    // dijadikan rujukan AI untuk mahasiswa.
    if (contentType.includes("multipart/form-data")) {
      return handleResourceFileUpload(request, userId, slug, course.id);
    }

    const body = await request.json();

    const title = String(body.title ?? "").trim();
    const description = optionalText(body.description);
    const url = String(body.url ?? "").trim();
    const type = body.type ?? ResourceType.LINK;
    const targetType = body.targetType ?? "COURSE";
    const moduleId = optionalText(body.moduleId);
    const microUnitId = optionalText(body.microUnitId);
    const sortOrder = toNullableInt(body.sortOrder);
    const content = optionalText(body.content);
    const sourceMaterialId = optionalText(body.sourceMaterialId);
    const isArticle = type === ResourceType.ARTICLE;

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message: "Resource title is required",
        },
        { status: 400 },
      );
    }

    if (isArticle) {
      if (!content) {
        return NextResponse.json(
          {
            success: false,
            message: "Article content is required",
          },
          { status: 400 },
        );
      }
    } else if (!url) {
      return NextResponse.json(
        {
          success: false,
          message: "Resource URL is required",
        },
        { status: 400 },
      );
    }

    if (!isValidResourceType(type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid resource type is required",
        },
        { status: 400 },
      );
    }

    if (!isValidTargetType(targetType)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid target type is required",
        },
        { status: 400 },
      );
    }

    const target = await resolveResourceTarget({
      courseId: course.id,
      targetType,
      moduleId,
      microUnitId,
    });

    if (target.error) {
      return NextResponse.json(
        {
          success: false,
          message: target.error,
        },
        { status: 400 },
      );
    }

    const resource = await prisma.learningResource.create({
      data: {
        courseId: target.courseId,
        moduleId: target.moduleId,
        microUnitId: target.microUnitId,
        title,
        description,
        type,
        url: isArticle ? null : url,
        content: isArticle ? content : null,
        sourceMaterialId: isArticle ? sourceMaterialId : null,
        sortOrder,
        uploadedById: userId,
      },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            slug: true,
            order: true,
          },
        },
        microUnit: {
          select: {
            id: true,
            title: true,
            slug: true,
            order: true,
            moduleId: true,
            unitType: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Learning resource created successfully",
        data: resource,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/lecturers/[userId]/courses/[slug]/resources error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create learning resource",
      },
      { status: 500 },
    );
  }
}

async function handleResourceFileUpload(
  request: NextRequest,
  userId: string,
  slug: string,
  courseId: string,
) {
  const formData = await request.formData();

  const file = formData.get("file");
  const title = String(formData.get("title") ?? "").trim();
  const description = optionalText(formData.get("description"));
  const targetTypeRaw = String(formData.get("targetType") ?? "COURSE");
  const moduleId = optionalText(formData.get("moduleId"));
  const microUnitId = optionalText(formData.get("microUnitId"));
  const sortOrder = toNullableInt(formData.get("sortOrder"));

  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, message: "Berkas bahan belajar wajib diunggah." },
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

  if (!isValidTargetType(targetTypeRaw)) {
    return NextResponse.json(
      { success: false, message: "Valid target type is required" },
      { status: 400 },
    );
  }

  const target = await resolveResourceTarget({
    courseId,
    targetType: targetTypeRaw,
    moduleId,
    microUnitId,
  });

  if (target.error) {
    return NextResponse.json(
      { success: false, message: target.error },
      { status: 400 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const storageKey = await saveMaterialFile(buffer, mimeType, file.name);

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
    console.error("Resource material extraction error:", extractError);
    status = MaterialStatus.FAILED;
    errorMessage = "Gagal membaca isi berkas.";
  }

  const resourceTitle = title.length > 0 ? title : file.name;

  const resource = await prisma.$transaction(async (tx) => {
    const material = await tx.courseMaterial.create({
      data: {
        courseId,
        moduleId: target.moduleId,
        uploadedById: userId,
        title: resourceTitle,
        description,
        fileName: file.name,
        mimeType,
        fileSize: file.size,
        storageKey,
        extractedText,
        charCount,
        status,
        errorMessage,
      },
      select: { id: true },
    });

    return tx.learningResource.create({
      data: {
        courseId: target.courseId,
        moduleId: target.moduleId,
        microUnitId: target.microUnitId,
        title: resourceTitle,
        description,
        type: resourceTypeForMime(mimeType),
        url: `/api/courses/${slug}/materials/${material.id}/file`,
        sourceMaterialId: material.id,
        sortOrder,
        uploadedById: userId,
      },
      include: RESOURCE_INCLUDE,
    });
  });

  return NextResponse.json(
    {
      success: true,
      message:
        status === MaterialStatus.READY
          ? "Berkas bahan belajar berhasil diunggah dan siap dipakai AI."
          : "Berkas diunggah, namun teksnya tidak terbaca sehingga tidak dapat dipakai AI.",
      data: resource,
    },
    { status: 201 },
  );
}
