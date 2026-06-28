/** @format */

import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { readAssignmentFile } from "@/lib/assignments/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    assignmentId: string;
  }>;
};

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

    const submission = await prisma.assignmentSubmission.findFirst({
      where: {
        assignmentId,
        studentId: userId,
        assignment: { course: { slug } },
      },
      select: { attachmentKey: true, fileName: true, mimeType: true },
    });

    if (!submission || !submission.attachmentKey) {
      return NextResponse.json(
        { success: false, message: "Berkas tidak ditemukan." },
        { status: 404 },
      );
    }

    const buffer = await readAssignmentFile(submission.attachmentKey);
    const name = submission.fileName || "jawaban";
    const asciiName = name.replace(/[^\x20-\x7E]/g, "_");
    const encodedName = encodeURIComponent(name);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": submission.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("GET student submission file error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengunduh berkas." },
      { status: 500 },
    );
  }
}
