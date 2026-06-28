/** @format */

import { NextRequest, NextResponse } from "next/server";
import { Role, SubmissionStatus } from "@/generated/prisma/client";
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
    select: { id: true, title: true, maxScore: true, rubric: true },
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

    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId: assignment.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        content: true,
        fileName: true,
        mimeType: true,
        fileSize: true,
        attachmentKey: true,
        status: true,
        score: true,
        feedback: true,
        submittedAt: true,
        reviewedAt: true,
        aiDeclared: true,
        aiUsage: true,
        aiPrompt: true,
        aiVerification: true,
        honestyPledge: true,
        student: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Daftar pengumpulan berhasil dimuat.",
      data: { assignment, submissions },
    });
  } catch (error) {
    console.error("GET assignment submissions error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat pengumpulan." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
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
    const submissionId = String(body?.submissionId ?? "").trim();
    if (!submissionId) {
      return NextResponse.json(
        { success: false, message: "ID pengumpulan wajib diisi." },
        { status: 400 },
      );
    }

    const submission = await prisma.assignmentSubmission.findFirst({
      where: { id: submissionId, assignmentId: assignment.id },
      select: { id: true },
    });
    if (!submission) {
      return NextResponse.json(
        { success: false, message: "Pengumpulan tidak ditemukan." },
        { status: 404 },
      );
    }

    const rawScore = Number(body?.score);
    if (
      !Number.isFinite(rawScore) ||
      rawScore < 0 ||
      rawScore > assignment.maxScore
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Nilai harus antara 0 dan ${assignment.maxScore}.`,
        },
        { status: 400 },
      );
    }

    const feedback = String(body?.feedback ?? "").trim() || null;

    const updated = await prisma.assignmentSubmission.update({
      where: { id: submission.id },
      data: {
        score: rawScore,
        feedback,
        status: SubmissionStatus.GRADED,
        reviewedAt: new Date(),
        reviewedById: userId,
      },
      select: {
        id: true,
        score: true,
        feedback: true,
        status: true,
        reviewedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Nilai berhasil disimpan.",
      data: updated,
    });
  } catch (error) {
    console.error("PATCH assignment submission error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menyimpan nilai." },
      { status: 500 },
    );
  }
}
