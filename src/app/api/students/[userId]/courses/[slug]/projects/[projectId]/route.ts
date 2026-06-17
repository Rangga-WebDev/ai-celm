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
import { projectSubmissionSchema } from "@/lib/validators/project.schema";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    projectId: string;
  }>;
};

const projectSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  brief: true,
  instruction: true,
  objective: true,
  outputType: true,
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
} as const;

async function resolveStudentProject({
  userId,
  slug,
  projectId,
}: {
  userId: string;
  slug: string;
  projectId: string;
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

  const project = await prisma.civicActionProject.findFirst({
    where: {
      id: projectId,
      courseId: course.id,
      status: ProjectStatus.ACTIVE,
    },
    select: projectSelect,
  });

  if (!project) {
    return { error: "Project not found", status: 404 as const };
  }

  return { course, project, error: null };
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

    const { userId, slug, projectId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Student can only access their own project",
        },
        { status: 403 },
      );
    }

    const resolved = await resolveStudentProject({ userId, slug, projectId });

    if (resolved.error) {
      return NextResponse.json(
        { success: false, message: resolved.error },
        { status: resolved.status },
      );
    }

    const submission = await prisma.projectSubmission.findUnique({
      where: {
        projectId_studentId: {
          projectId,
          studentId: userId,
        },
      },
      select: submissionSelect,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Project fetched successfully",
        data: {
          course: resolved.course,
          project: resolved.project,
          submission,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "GET /api/students/[userId]/courses/[slug]/projects/[projectId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch project",
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

    const { userId, slug, projectId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Student can only submit their own project work",
        },
        { status: 403 },
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = projectSubmissionSchema.safeParse(json);

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

    const resolved = await resolveStudentProject({ userId, slug, projectId });

    if (resolved.error) {
      return NextResponse.json(
        { success: false, message: resolved.error },
        { status: resolved.status },
      );
    }

    const existing = await prisma.projectSubmission.findUnique({
      where: {
        projectId_studentId: {
          projectId,
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

    const { title, summary, artifactUrl, reflection, action } = parsed.data;
    const isSubmit = action === "SUBMIT";
    const now = new Date();

    const nextStatus = isSubmit
      ? SubmissionStatus.SUBMITTED
      : SubmissionStatus.DRAFT;

    const submission = await prisma.projectSubmission.upsert({
      where: {
        projectId_studentId: {
          projectId,
          studentId: userId,
        },
      },
      update: {
        title: title.length > 0 ? title : null,
        summary: summary.length > 0 ? summary : null,
        artifactUrl: artifactUrl.length > 0 ? artifactUrl : null,
        reflection: reflection.length > 0 ? reflection : null,
        status: nextStatus,
        submittedAt: isSubmit ? now : null,
      },
      create: {
        projectId,
        studentId: userId,
        title: title.length > 0 ? title : null,
        summary: summary.length > 0 ? summary : null,
        artifactUrl: artifactUrl.length > 0 ? artifactUrl : null,
        reflection: reflection.length > 0 ? reflection : null,
        status: nextStatus,
        submittedAt: isSubmit ? now : null,
      },
      select: submissionSelect,
    });

    return NextResponse.json(
      {
        success: true,
        message: isSubmit
          ? "Proyek berhasil dikumpulkan"
          : "Draf proyek tersimpan",
        data: {
          submission,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "PUT /api/students/[userId]/courses/[slug]/projects/[projectId] error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to save project submission",
      },
      { status: 500 },
    );
  }
}
