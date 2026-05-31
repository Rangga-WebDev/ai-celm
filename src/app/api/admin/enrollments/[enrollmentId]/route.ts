/** @format */

import { NextRequest, NextResponse } from "next/server";
import { EnrollmentStatus, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

type Params = {
  params: Promise<{
    enrollmentId: string;
  }>;
};

function isValidEnrollmentStatus(value: unknown): value is EnrollmentStatus {
  return (
    value === EnrollmentStatus.ACTIVE ||
    value === EnrollmentStatus.COMPLETED ||
    value === EnrollmentStatus.DROPPED
  );
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.ADMIN]);

    if (auth.response) {
      return auth.response;
    }

    const { enrollmentId } = await params;
    const body = await request.json();

    const status = body.status;

    if (!isValidEnrollmentStatus(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid enrollment status is required",
        },
        { status: 400 },
      );
    }

    const targetEnrollment = await prisma.enrollment.findUnique({
      where: {
        id: enrollmentId,
      },
      select: {
        id: true,
      },
    });

    if (!targetEnrollment) {
      return NextResponse.json(
        {
          success: false,
          message: "Enrollment not found",
        },
        { status: 404 },
      );
    }

    const updatedEnrollment = await prisma.enrollment.update({
      where: {
        id: enrollmentId,
      },
      data: {
        status,
        completedAt: status === EnrollmentStatus.COMPLETED ? new Date() : null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            code: true,
            isPublished: true,
            lecturer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Enrollment updated successfully",
        data: updatedEnrollment,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("PATCH /api/admin/enrollments/[enrollmentId] error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update enrollment",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.ADMIN]);

    if (auth.response) {
      return auth.response;
    }

    const { enrollmentId } = await params;

    const targetEnrollment = await prisma.enrollment.findUnique({
      where: {
        id: enrollmentId,
      },
      select: {
        id: true,
      },
    });

    if (!targetEnrollment) {
      return NextResponse.json(
        {
          success: false,
          message: "Enrollment not found",
        },
        { status: 404 },
      );
    }

    await prisma.enrollment.delete({
      where: {
        id: enrollmentId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Enrollment deleted successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("DELETE /api/admin/enrollments/[enrollmentId] error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete enrollment",
      },
      { status: 500 },
    );
  }
}
