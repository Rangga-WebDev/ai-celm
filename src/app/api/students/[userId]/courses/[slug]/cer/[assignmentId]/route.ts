/** @format */

import { NextRequest, NextResponse } from "next/server";
import {
  CerAssignmentStatus,
  EnrollmentStatus,
  Role,
  SubmissionStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { cerSubmissionSchema } from "@/lib/validators/cer.schema";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    assignmentId: string;
  }>;
};

const assignmentSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  prompt: true,
  claimQuestion: true,
  evidenceQuestion: true,
  reasoningQuestion: true,
  rubric: true,
  dueAt: true,
  status: true,
  createdAt: true,
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
    },
  },
} as const;

const submissionSelect = {
  id: true,
  claim: true,
  evidence: true,
  reasoning: true,
  status: true,
  score: true,
  feedback: true,
  submittedAt: true,
  reviewedAt: true,
  updatedAt: true,
} as const;

async function resolveStudentAssignment({
  userId,
  slug,
  assignmentId,
}: {
  userId: string;
  slug: string;
  assignmentId: string;
}) {
  const course = await prisma.course.findFirst({
    where: {
      slug,
      isPublished: true,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      code: true,
    },
  });

  if (!course) {
    return { error: "Course not found", status: 404 as const };
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId,
      courseId: course.id,
      status: EnrollmentStatus.ACTIVE,
    },
    select: {
      id: true,
    },
  });

  if (!enrollment) {
    return {
      error: "You are not enrolled in this course",
      status: 403 as const,
    };
  }

  const assignment = await prisma.cerAssignment.findFirst({
    where: {
      id: assignmentId,
      courseId: course.id,
      status: CerAssignmentStatus.ACTIVE,
    },
    select: assignmentSelect,
  });

  if (!assignment) {
    return { error: "CER assignment not found", status: 404 as const };
  }

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

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug, assignmentId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Student can only access their own CER assignment",
        },
        { status: 403 },
      );
    }

    const resolved = await resolveStudentAssignment({
      userId,
      slug,
      assignmentId,
    });

    if (resolved.error) {
      return NextResponse.json(
        { success: false, message: resolved.error },
        { status: resolved.status },
      );
    }

    const submission = await prisma.cerSubmission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId: userId,
        },
      },
      select: submissionSelect,
    });

    return NextResponse.json(
      {
        success: true,
        message: "CER assignment fetched successfully",
        data: {
          course: resolved.course,
          assignment: resolved.assignment,
          submission,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "GET /api/students/[userId]/courses/[slug]/cer/[assignmentId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch CER assignment",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.STUDENT]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug, assignmentId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Student can only submit their own CER work",
        },
        { status: 403 },
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = cerSubmissionSchema.safeParse(json);

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

    const resolved = await resolveStudentAssignment({
      userId,
      slug,
      assignmentId,
    });

    if (resolved.error) {
      return NextResponse.json(
        { success: false, message: resolved.error },
        { status: resolved.status },
      );
    }

    const existing = await prisma.cerSubmission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId: userId,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (existing && isLocked(existing.status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Submission sudah dinilai dan tidak dapat diubah",
        },
        { status: 409 },
      );
    }

    const { claim, evidence, reasoning, action } = parsed.data;
    const isSubmit = action === "SUBMIT";
    const now = new Date();

    const nextStatus = isSubmit
      ? SubmissionStatus.SUBMITTED
      : SubmissionStatus.DRAFT;

    const submission = await prisma.cerSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId: userId,
        },
      },
      update: {
        claim,
        evidence,
        reasoning,
        status: nextStatus,
        submittedAt: isSubmit ? now : null,
      },
      create: {
        assignmentId,
        studentId: userId,
        claim,
        evidence,
        reasoning,
        status: nextStatus,
        submittedAt: isSubmit ? now : null,
      },
      select: submissionSelect,
    });

    return NextResponse.json(
      {
        success: true,
        message: isSubmit ? "CER berhasil dikumpulkan" : "Draf CER tersimpan",
        data: {
          submission,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "PUT /api/students/[userId]/courses/[slug]/cer/[assignmentId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to save CER submission",
      },
      { status: 500 },
    );
  }
}
