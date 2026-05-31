/** @format */

import { NextRequest, NextResponse } from "next/server";
import { EnrollmentStatus, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

function isValidEnrollmentStatus(value: unknown): value is EnrollmentStatus {
  return (
    value === EnrollmentStatus.ACTIVE ||
    value === EnrollmentStatus.COMPLETED ||
    value === EnrollmentStatus.DROPPED
  );
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser([Role.ADMIN]);

    if (auth.response) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q")?.trim() ?? "";
    const courseId = searchParams.get("courseId")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "ALL";

    const enrollments = await prisma.enrollment.findMany({
      where: {
        AND: [
          q
            ? {
                OR: [
                  {
                    user: {
                      firstName: {
                        contains: q,
                        mode: "insensitive",
                      },
                    },
                  },
                  {
                    user: {
                      lastName: {
                        contains: q,
                        mode: "insensitive",
                      },
                    },
                  },
                  {
                    user: {
                      email: {
                        contains: q,
                        mode: "insensitive",
                      },
                    },
                  },
                  {
                    course: {
                      title: {
                        contains: q,
                        mode: "insensitive",
                      },
                    },
                  },
                  {
                    course: {
                      code: {
                        contains: q,
                        mode: "insensitive",
                      },
                    },
                  },
                ],
              }
            : {},
          courseId ? { courseId } : {},
          status !== "ALL" && isValidEnrollmentStatus(status) ? { status } : {},
        ],
      },
      orderBy: {
        enrolledAt: "desc",
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

    const [students, courses] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: Role.STUDENT,
        },
        orderBy: [
          {
            firstName: "asc",
          },
          {
            lastName: "asc",
          },
        ],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      }),

      prisma.course.findMany({
        orderBy: {
          title: "asc",
        },
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
          _count: {
            select: {
              enrollments: true,
              modules: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        message: "Enrollments fetched successfully",
        data: {
          enrollments,
          students,
          courses,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/admin/enrollments error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch enrollments",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser([Role.ADMIN]);

    if (auth.response) {
      return auth.response;
    }

    const body = await request.json();

    const userId = String(body.userId ?? "").trim();
    const courseId = String(body.courseId ?? "").trim();
    const statusInput = body.status ?? EnrollmentStatus.ACTIVE;

    if (!userId || !courseId || !isValidEnrollmentStatus(statusInput)) {
      return NextResponse.json(
        {
          success: false,
          message: "Student, course, and valid enrollment status are required",
        },
        { status: 400 },
      );
    }

    const student = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!student || student.role !== Role.STUDENT) {
      return NextResponse.json(
        {
          success: false,
          message: "Selected user is not a valid student",
        },
        { status: 400 },
      );
    }

    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
      select: {
        id: true,
      },
    });

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          message: "Selected course is not found",
        },
        { status: 404 },
      );
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingEnrollment) {
      return NextResponse.json(
        {
          success: false,
          message: "Student is already enrolled in this course",
        },
        { status: 409 },
      );
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        courseId,
        status: statusInput,
        completedAt:
          statusInput === EnrollmentStatus.COMPLETED ? new Date() : null,
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
        message: "Enrollment created successfully",
        data: enrollment,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/admin/enrollments error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create enrollment",
      },
      { status: 500 },
    );
  }
}
