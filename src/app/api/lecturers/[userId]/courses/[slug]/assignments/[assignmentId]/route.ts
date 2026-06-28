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
    assignmentId: string;
  }>;
};

const statusOptions = Object.values(ProjectStatus);

function isValidStatus(value: unknown): value is ProjectStatus {
  return (
    typeof value === "string" && statusOptions.includes(value as ProjectStatus)
  );
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

const assignmentInclude = {
  module: { select: { id: true, title: true, slug: true } },
  sourceMaterial: { select: { id: true, title: true } },
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  _count: { select: { submissions: true } },
};

async function getOwnedAssignment(
  userId: string,
  slug: string,
  assignmentId: string,
) {
  const course = await prisma.course.findFirst({
    where: { slug, lecturerId: userId },
    select: { id: true },
  });
  if (!course) return { course: null, assignment: null };
  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, courseId: course.id },
    include: assignmentInclude,
  });
  return { course, assignment };
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug, assignmentId } = await params;
    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 },
      );
    }

    const { course, assignment } = await getOwnedAssignment(
      userId,
      slug,
      assignmentId,
    );
    if (!course || !assignment) {
      return NextResponse.json(
        { success: false, message: "Tugas tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Detail tugas berhasil dimuat.",
      data: assignment,
    });
  } catch (error) {
    console.error("GET assignment detail error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat tugas." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug, assignmentId } = await params;
    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 },
      );
    }

    const { course, assignment } = await getOwnedAssignment(
      userId,
      slug,
      assignmentId,
    );
    if (!course || !assignment) {
      return NextResponse.json(
        { success: false, message: "Tugas tidak ditemukan." },
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

    const data: Prisma.AssignmentUpdateInput = {};

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) {
        return NextResponse.json(
          { success: false, message: "Judul tugas tidak boleh kosong." },
          { status: 400 },
        );
      }
      data.title = title;
    }

    if (body.status !== undefined) {
      if (!isValidStatus(body.status)) {
        return NextResponse.json(
          { success: false, message: "Status tugas tidak valid." },
          { status: 400 },
        );
      }
      data.status = body.status;
    }

    if (body.description !== undefined)
      data.description = optionalText(body.description);
    if (body.instructions !== undefined)
      data.instructions = optionalText(body.instructions);
    if (body.dueAt !== undefined) data.dueAt = parseDate(body.dueAt);
    if (body.rubric !== undefined) data.rubric = parseRubric(body.rubric);
    if (body.allowText !== undefined) data.allowText = Boolean(body.allowText);
    if (body.allowFile !== undefined) data.allowFile = Boolean(body.allowFile);
    if (body.maxScore !== undefined) {
      const rawMax = Number(body.maxScore);
      if (Number.isFinite(rawMax) && rawMax > 0) data.maxScore = rawMax;
    }

    if (body.moduleId !== undefined) {
      const requestedModuleId = String(body.moduleId ?? "").trim();
      if (!requestedModuleId) {
        data.module = { disconnect: true };
      } else {
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
        data.module = { connect: { id: mod.id } };
      }
    }

    const updated = await prisma.assignment.update({
      where: { id: assignment.id },
      data,
      include: assignmentInclude,
    });

    return NextResponse.json({
      success: true,
      message: "Tugas berhasil diperbarui.",
      data: updated,
    });
  } catch (error) {
    console.error("PUT assignment error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui tugas." },
      { status: 500 },
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug, assignmentId } = await params;
    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 },
      );
    }

    const { course, assignment } = await getOwnedAssignment(
      userId,
      slug,
      assignmentId,
    );
    if (!course || !assignment) {
      return NextResponse.json(
        { success: false, message: "Tugas tidak ditemukan." },
        { status: 404 },
      );
    }

    await prisma.assignment.delete({ where: { id: assignment.id } });

    return NextResponse.json({
      success: true,
      message: "Tugas berhasil dihapus.",
    });
  } catch (error) {
    console.error("DELETE assignment error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menghapus tugas." },
      { status: 500 },
    );
  }
}
