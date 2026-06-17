/** @format */

import { NextRequest, NextResponse } from "next/server";
import { Role, SubmissionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { projectGradeSchema } from "@/lib/validators/project.schema";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    projectId: string;
    submissionId: string;
  }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug, projectId, submissionId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lecturer can only grade submissions in their own courses",
        },
        { status: 403 },
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = projectGradeSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validasi gagal",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const submission = await prisma.projectSubmission.findFirst({
      where: {
        id: submissionId,
        projectId,
        project: {
          id: projectId,
          course: {
            slug,
            lecturerId: userId,
          },
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!submission) {
      return NextResponse.json(
        {
          success: false,
          message: "Submission not found in your course",
        },
        { status: 404 },
      );
    }

    const { score, feedback, action } = parsed.data;
    const isRevision = action === "REQUEST_REVISION";
    const now = new Date();

    const updated = await prisma.projectSubmission.update({
      where: {
        id: submissionId,
      },
      data: {
        score: isRevision ? null : (score ?? null),
        feedback: feedback.length > 0 ? feedback : null,
        status: isRevision
          ? SubmissionStatus.REVISION_REQUIRED
          : SubmissionStatus.GRADED,
        reviewedAt: now,
      },
      select: {
        id: true,
        title: true,
        summary: true,
        artifactUrl: true,
        reflection: true,
        status: true,
        score: true,
        feedback: true,
        submittedAt: true,
        reviewedAt: true,
        updatedAt: true,
        student: {
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
        message: isRevision
          ? "Mahasiswa diminta merevisi proyeknya"
          : "Penilaian tersimpan",
        data: {
          submission: updated,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "PATCH /api/lecturers/[userId]/courses/[slug]/projects/[projectId]/submissions/[submissionId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to grade project submission",
      },
      { status: 500 },
    );
  }
}
