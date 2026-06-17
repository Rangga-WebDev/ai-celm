/** @format */

import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    assignmentId: string;
  }>;
};

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);

    if (auth.response) {
      return auth.response;
    }

    const { userId, slug, assignmentId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Lecturer can only access submissions from their own courses",
        },
        { status: 403 },
      );
    }

    const course = await prisma.course.findFirst({
      where: {
        slug,
        lecturerId: userId,
      },
      select: {
        id: true,
        title: true,
        slug: true,
      },
    });

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          message: "Course not found or you are not assigned to this course",
        },
        { status: 404 },
      );
    }

    const assignment = await prisma.cerAssignment.findFirst({
      where: {
        id: assignmentId,
        courseId: course.id,
      },
      select: {
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
        module: {
          select: {
            id: true,
            title: true,
          },
        },
        microUnit: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        {
          success: false,
          message: "CER assignment not found in this course",
        },
        { status: 404 },
      );
    }

    const submissions = await prisma.cerSubmission.findMany({
      where: {
        assignmentId,
      },
      orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
      select: {
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
        message: "CER submissions fetched successfully",
        data: {
          course,
          assignment,
          submissions,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "GET /api/lecturers/[userId]/courses/[slug]/cer/[assignmentId]/submissions error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch CER submissions",
      },
      { status: 500 },
    );
  }
}
