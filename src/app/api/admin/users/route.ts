/** @format */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { Role } from "@/generated/prisma/client";

function isValidRole(value: unknown): value is Role {
  return (
    value === Role.STUDENT ||
    value === Role.LECTURER ||
    value === Role.ADMIN ||
    value === Role.VALIDATOR
  );
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser([Role.ADMIN]);

    if (auth.response) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q")?.trim() ?? "";
    const role = searchParams.get("role")?.trim() ?? "";

    const users = await prisma.user.findMany({
      where: {
        AND: [
          q
            ? {
                OR: [
                  { firstName: { contains: q, mode: "insensitive" } },
                  { lastName: { contains: q, mode: "insensitive" } },
                  { email: { contains: q, mode: "insensitive" } },
                ],
              }
            : {},
          role && isValidRole(role) ? { role } : {},
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            enrollments: true,
            taughtCourses: true,
            moduleProgresses: true,
            unitProgresses: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Users fetched successfully",
        data: users,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/admin/users error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch users",
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

    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const email = normalizeEmail(String(body.email ?? ""));
    const password = String(body.password ?? "");
    const role = body.role;

    if (!firstName || !lastName || !email || !password || !isValidRole(role)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "First name, last name, email, password, and valid role are required",
        },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 8 characters",
        },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Email already exists",
        },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        role,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            enrollments: true,
            taughtCourses: true,
            moduleProgresses: true,
            unitProgresses: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "User created successfully",
        data: user,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/admin/users error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create user",
      },
      { status: 500 },
    );
  }
}
