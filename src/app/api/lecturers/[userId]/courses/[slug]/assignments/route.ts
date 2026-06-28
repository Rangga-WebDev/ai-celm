/** @format */

import { NextRequest, NextResponse } from "next/server";
import { Prisma, ProjectStatus, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
  }>;
};

const statusOptions = Object.values(ProjectStatus);
const examTypeOptions = ["NONE", "UTS", "UAS"] as const;
type ExamType = (typeof examTypeOptions)[number];

function isValidStatus(value: unknown): value is ProjectStatus {
  return (
    typeof value === "string" && statusOptions.includes(value as ProjectStatus)
  );
}

function normalizeExamType(value: unknown): ExamType {
  const text = String(value ?? "NONE").toUpperCase();
  return examTypeOptions.includes(text as ExamType)
    ? (text as ExamType)
    : "NONE";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function optionalText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function parseDate(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function parseRubric(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!Array.isArray(value) || value.length === 0) return Prisma.JsonNull;
  const items = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const criteria = String(record.criteria ?? "").trim();
      if (!criteria) return null;
      const weight = Number(record.weight ?? 0);
      return {
        criteria,
        weight: Number.isFinite(weight) ? Math.round(weight) : 0,
        description: String(record.description ?? "").trim(),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  return items.length > 0 ? items : Prisma.JsonNull;
}

async function getOwnedCourse(userId: string, slug: string) {
  return prisma.course.findFirst({
    where: { slug, lecturerId: userId },
    select: { id: true, title: true, slug: true },
  });
}

const assignmentInclude = {
  module: { select: { id: true, title: true, slug: true } },
  sourceMaterial: { select: { id: true, title: true } },
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  _count: { select: { submissions: true } },
};

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Anda hanya dapat mengakses tugas kelas Anda sendiri.",
        },
        { status: 403 },
      );
    }

    const course = await getOwnedCourse(userId, slug);
    if (!course) {
      return NextResponse.json(
        {
          success: false,
          message: "Kelas tidak ditemukan atau bukan milik Anda.",
        },
        { status: 404 },
      );
    }

    const url = new URL(request.url);
    const filterExamRaw = url.searchParams.get("examType");
    const filterModuleId = url.searchParams.get("moduleId");

    const assignmentWhere: {
      courseId: string;
      examType?: ExamType | { in: ExamType[] };
      moduleId?: string;
    } = { courseId: course.id };

    if (filterExamRaw) {
      if (filterExamRaw.toUpperCase() === "EXAM") {
        assignmentWhere.examType = { in: ["UTS", "UAS"] };
      } else {
        assignmentWhere.examType = normalizeExamType(filterExamRaw);
      }
    }
    if (filterModuleId) {
      assignmentWhere.moduleId = filterModuleId;
    }

    const [modules, materials, assignments] = await Promise.all([
      prisma.module.findMany({
        where: { courseId: course.id },
        orderBy: { order: "asc" },
        select: { id: true, title: true, slug: true, order: true },
      }),
      prisma.courseMaterial.findMany({
        where: { courseId: course.id, status: "READY" },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, moduleId: true, charCount: true },
      }),
      prisma.assignment.findMany({
        where: assignmentWhere,
        orderBy: { createdAt: "desc" },
        include: assignmentInclude,
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Daftar tugas besar berhasil dimuat.",
      data: {
        course,
        modules,
        materials,
        assignments,
        statuses: statusOptions,
      },
    });
  } catch (error) {
    console.error("GET assignments error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat tugas besar." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Anda hanya dapat membuat tugas untuk kelas Anda sendiri.",
        },
        { status: 403 },
      );
    }

    const course = await getOwnedCourse(userId, slug);
    if (!course) {
      return NextResponse.json(
        {
          success: false,
          message: "Kelas tidak ditemukan atau bukan milik Anda.",
        },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, message: "Body permintaan tidak valid." },
        { status: 400 },
      );
    }

    const title = String(body.title ?? "").trim();
    if (!title) {
      return NextResponse.json(
        { success: false, message: "Judul tugas wajib diisi." },
        { status: 400 },
      );
    }

    const status = body.status ?? ProjectStatus.DRAFT;
    if (!isValidStatus(status)) {
      return NextResponse.json(
        { success: false, message: "Status tugas tidak valid." },
        { status: 400 },
      );
    }

    const description = optionalText(body.description);
    const instructions = optionalText(body.instructions);
    const dueAt = parseDate(body.dueAt);
    const rubric = parseRubric(body.rubric);
    const examType = normalizeExamType(body.examType);
    const rawMax = Number(body.maxScore ?? 100);
    const maxScore = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 100;
    const allowText =
      body.allowText === undefined ? true : Boolean(body.allowText);
    const allowFile =
      body.allowFile === undefined ? true : Boolean(body.allowFile);

    // Validasi modul & materi sumber (jika dikirim) milik kelas ini.
    let moduleId: string | null = null;
    const requestedModuleId = String(body.moduleId ?? "").trim();
    if (requestedModuleId) {
      const mod = await prisma.module.findFirst({
        where: { id: requestedModuleId, courseId: course.id },
        select: { id: true },
      });
      if (!mod) {
        return NextResponse.json(
          { success: false, message: "Modul tidak ditemukan di kelas ini." },
          { status: 404 },
        );
      }
      moduleId = mod.id;
    }

    let sourceMaterialId: string | null = null;
    const requestedMaterialId = String(body.sourceMaterialId ?? "").trim();
    if (requestedMaterialId) {
      const mat = await prisma.courseMaterial.findFirst({
        where: { id: requestedMaterialId, courseId: course.id },
        select: { id: true },
      });
      if (!mat) {
        return NextResponse.json(
          {
            success: false,
            message: "Materi sumber tidak ditemukan di kelas ini.",
          },
          { status: 404 },
        );
      }
      sourceMaterialId = mat.id;
    }

    const baseSlug = slugify(String(body.slug ?? "").trim() || title);
    if (!baseSlug) {
      return NextResponse.json(
        { success: false, message: "Slug tugas tidak valid." },
        { status: 400 },
      );
    }

    // Pastikan slug unik dalam kelas.
    let finalSlug = baseSlug;
    let suffix = 1;
    while (
      await prisma.assignment.findUnique({
        where: { courseId_slug: { courseId: course.id, slug: finalSlug } },
        select: { id: true },
      })
    ) {
      suffix += 1;
      finalSlug = `${baseSlug}-${suffix}`;
    }

    const assignment = await prisma.assignment.create({
      data: {
        courseId: course.id,
        moduleId,
        createdById: userId,
        title,
        slug: finalSlug,
        description,
        instructions,
        rubric,
        dueAt,
        maxScore,
        allowText,
        allowFile,
        sourceMaterialId,
        generatedByAi: Boolean(body.generatedByAi),
        examType,
        status,
      },
      include: assignmentInclude,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Tugas besar berhasil dibuat.",
        data: assignment,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST assignments error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal membuat tugas besar." },
      { status: 500 },
    );
  }
}
