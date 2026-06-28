/** @format */

import { NextRequest, NextResponse } from "next/server";
import {
  EnrollmentStatus,
  ProjectStatus,
  Role,
  SubmissionStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import {
  deleteAssignmentFile,
  saveAssignmentFile,
} from "@/lib/assignments/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    assignmentId: string;
  }>;
};

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "application/zip",
]);

const submissionSelect = {
  id: true,
  content: true,
  fileName: true,
  mimeType: true,
  fileSize: true,
  status: true,
  score: true,
  feedback: true,
  submittedAt: true,
  reviewedAt: true,
  updatedAt: true,
  aiDeclared: true,
  aiUsage: true,
  aiPrompt: true,
  aiVerification: true,
  honestyPledge: true,
} as const;

async function resolveStudentAssignment(
  userId: string,
  slug: string,
  assignmentId: string,
) {
  const course = await prisma.course.findFirst({
    where: { slug, isPublished: true },
    select: { id: true, title: true, slug: true, code: true },
  });
  if (!course) return { error: "Kelas tidak ditemukan.", status: 404 as const };

  const enrollment = await prisma.enrollment.findFirst({
    where: { userId, courseId: course.id, status: EnrollmentStatus.ACTIVE },
    select: { id: true },
  });
  if (!enrollment)
    return {
      error: "Anda belum terdaftar di kelas ini.",
      status: 403 as const,
    };

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      courseId: course.id,
      status: { in: [ProjectStatus.ACTIVE, ProjectStatus.CLOSED] },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      instructions: true,
      rubric: true,
      dueAt: true,
      maxScore: true,
      allowText: true,
      allowFile: true,
      status: true,
      createdAt: true,
      module: { select: { id: true, title: true, slug: true, order: true } },
    },
  });
  if (!assignment)
    return { error: "Tugas tidak ditemukan.", status: 404 as const };

  return { course, assignment, error: null };
}

function isLocked(status: SubmissionStatus) {
  return (
    status === SubmissionStatus.GRADED || status === SubmissionStatus.APPROVED
  );
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.STUDENT]);
    if (auth.response) return auth.response;

    const { userId, slug, assignmentId } = await params;
    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 },
      );
    }

    const resolved = await resolveStudentAssignment(userId, slug, assignmentId);
    if (resolved.error) {
      return NextResponse.json(
        { success: false, message: resolved.error },
        { status: resolved.status },
      );
    }

    const submission = await prisma.assignmentSubmission.findUnique({
      where: {
        assignmentId_studentId: { assignmentId, studentId: userId },
      },
      select: submissionSelect,
    });

    return NextResponse.json({
      success: true,
      message: "Detail tugas berhasil dimuat.",
      data: {
        course: resolved.course,
        assignment: resolved.assignment,
        submission,
      },
    });
  } catch (error) {
    console.error("GET student assignment detail error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat tugas." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.STUDENT]);
    if (auth.response) return auth.response;

    const { userId, slug, assignmentId } = await params;
    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 },
      );
    }

    const resolved = await resolveStudentAssignment(userId, slug, assignmentId);
    if (resolved.error || !resolved.assignment) {
      return NextResponse.json(
        { success: false, message: resolved.error ?? "Tugas tidak ditemukan." },
        { status: resolved.status ?? 404 },
      );
    }
    const { assignment } = resolved;

    if (assignment.status !== ProjectStatus.ACTIVE) {
      return NextResponse.json(
        { success: false, message: "Tugas sudah ditutup untuk pengumpulan." },
        { status: 409 },
      );
    }

    const existing = await prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: userId } },
      select: { id: true, status: true, attachmentKey: true },
    });

    if (existing && isLocked(existing.status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Pengumpulan sudah dinilai dan tidak dapat diubah.",
        },
        { status: 409 },
      );
    }

    const formData = await request.formData();
    const action = String(formData.get("action") ?? "DRAFT").toUpperCase();
    const isSubmit = action === "SUBMIT";
    const content = String(formData.get("content") ?? "").trim();
    const removeFile = String(formData.get("removeFile") ?? "") === "true";
    const file = formData.get("file");

    // Deklarasi integritas akademik / penggunaan AI.
    const aiDeclared = String(formData.get("aiDeclared") ?? "") === "true";
    const aiUsage = String(formData.get("aiUsage") ?? "").trim();
    const aiPrompt = String(formData.get("aiPrompt") ?? "").trim();
    const aiVerification = String(formData.get("aiVerification") ?? "").trim();
    const honestyPledge =
      String(formData.get("honestyPledge") ?? "") === "true";

    if (isSubmit && !honestyPledge) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Centang pernyataan kejujuran akademik sebelum mengumpulkan.",
        },
        { status: 400 },
      );
    }

    if (isSubmit && aiDeclared && !aiUsage) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Jelaskan untuk bagian apa AI digunakan pada deklarasi Anda.",
        },
        { status: 400 },
      );
    }

    let attachmentKey = existing?.attachmentKey ?? null;
    let fileName: string | null | undefined = undefined;
    let mimeType: string | null | undefined = undefined;
    let fileSize: number | null | undefined = undefined;

    if (file && typeof file !== "string" && file.size > 0) {
      if (!assignment.allowFile) {
        return NextResponse.json(
          {
            success: false,
            message: "Tugas ini tidak menerima unggahan berkas.",
          },
          { status: 400 },
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, message: "Ukuran berkas maksimal 15MB." },
          { status: 400 },
        );
      }
      if (!ALLOWED_MIME.has(file.type)) {
        return NextResponse.json(
          { success: false, message: "Tipe berkas tidak didukung." },
          { status: 400 },
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const newKey = await saveAssignmentFile(buffer, file.type, file.name);

      // Hapus berkas lama jika ada.
      if (existing?.attachmentKey) {
        await deleteAssignmentFile(existing.attachmentKey).catch(
          () => undefined,
        );
      }

      attachmentKey = newKey;
      fileName = file.name;
      mimeType = file.type;
      fileSize = file.size;
    } else if (removeFile && existing?.attachmentKey) {
      await deleteAssignmentFile(existing.attachmentKey).catch(() => undefined);
      attachmentKey = null;
      fileName = null;
      mimeType = null;
      fileSize = null;
    }

    if (isSubmit && !content && !attachmentKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Isi jawaban atau unggah berkas sebelum mengumpulkan.",
        },
        { status: 400 },
      );
    }

    const now = new Date();
    const nextStatus = isSubmit
      ? SubmissionStatus.SUBMITTED
      : SubmissionStatus.DRAFT;

    const baseData = {
      content: content.length > 0 ? content : null,
      attachmentKey,
      status: nextStatus,
      submittedAt: isSubmit ? now : null,
      aiDeclared,
      aiUsage: aiDeclared && aiUsage.length > 0 ? aiUsage : null,
      aiPrompt: aiDeclared && aiPrompt.length > 0 ? aiPrompt : null,
      aiVerification:
        aiDeclared && aiVerification.length > 0 ? aiVerification : null,
      honestyPledge,
      ...(fileName !== undefined ? { fileName } : {}),
      ...(mimeType !== undefined ? { mimeType } : {}),
      ...(fileSize !== undefined ? { fileSize } : {}),
    };

    const submission = await prisma.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId: userId } },
      update: baseData,
      create: {
        assignmentId,
        studentId: userId,
        content: content.length > 0 ? content : null,
        attachmentKey,
        fileName: fileName ?? null,
        mimeType: mimeType ?? null,
        fileSize: fileSize ?? null,
        status: nextStatus,
        submittedAt: isSubmit ? now : null,
        aiDeclared,
        aiUsage: aiDeclared && aiUsage.length > 0 ? aiUsage : null,
        aiPrompt: aiDeclared && aiPrompt.length > 0 ? aiPrompt : null,
        aiVerification:
          aiDeclared && aiVerification.length > 0 ? aiVerification : null,
        honestyPledge,
      },
      select: submissionSelect,
    });

    return NextResponse.json({
      success: true,
      message: isSubmit ? "Tugas berhasil dikumpulkan." : "Draf tersimpan.",
      data: { submission },
    });
  } catch (error) {
    console.error("PUT student assignment submit error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menyimpan jawaban." },
      { status: 500 },
    );
  }
}
