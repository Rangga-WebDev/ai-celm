/** @format */

import { NextRequest, NextResponse } from "next/server";
import {
  AssignmentExamType,
  EnrollmentStatus,
  Prisma,
  ProjectStatus,
  Role,
} from "@/generated/prisma/client";
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

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.STUDENT]);
    if (auth.response) return auth.response;

    const { userId, slug } = await params;
    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 },
      );
    }

    const course = await prisma.course.findFirst({
      where: { slug, isPublished: true },
      select: { id: true, title: true, slug: true, code: true },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, message: "Kelas tidak ditemukan." },
        { status: 404 },
      );
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        courseId: course.id,
        status: EnrollmentStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!enrollment) {
      return NextResponse.json(
        { success: false, message: "Anda belum terdaftar di kelas ini." },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const filterExamRaw = (
      url.searchParams.get("examType") ?? ""
    ).toUpperCase();
    const examWhere: Prisma.AssignmentWhereInput =
      filterExamRaw === "EXAM"
        ? { examType: { in: [AssignmentExamType.UTS, AssignmentExamType.UAS] } }
        : filterExamRaw === "NONE"
          ? { examType: AssignmentExamType.NONE }
          : {};

    const assignments = await prisma.assignment.findMany({
      where: {
        courseId: course.id,
        status: { in: [ProjectStatus.ACTIVE, ProjectStatus.CLOSED] },
        ...examWhere,
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        dueAt: true,
        maxScore: true,
        status: true,
        examType: true,
        createdAt: true,
        module: { select: { id: true, title: true, slug: true, order: true } },
        submissions: {
          where: { studentId: userId },
          select: {
            id: true,
            status: true,
            score: true,
            submittedAt: true,
            reviewedAt: true,
            updatedAt: true,
          },
        },
      },
    });

    const data = assignments.map((assignment) => {
      const { submissions, ...rest } = assignment;
      return { ...rest, submission: submissions[0] ?? null };
    });

    return NextResponse.json({
      success: true,
      message: "Daftar tugas berhasil dimuat.",
      data: { course, assignments: data },
    });
  } catch (error) {
    console.error("GET student assignments error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat tugas." },
      { status: 500 },
    );
  }
}
