/** @format */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import { Role } from "@/generated/prisma/client";

type Params = {
  params: Promise<{
    userId: string;
  }>;
};

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

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.ADMIN]);

    if (auth.response) {
      return auth.response;
    }

    const { userId } = await params;
    const body = await request.json();

    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const email = normalizeEmail(String(body.email ?? ""));
    const password = body.password ? String(body.password) : "";
    const role = body.role;

    if (!firstName || !lastName || !email || !isValidRole(role)) {
      return NextResponse.json(
        {
          success: false,
          message: "First name, last name, email, and valid role are required",
        },
        { status: 400 },
      );
    }

    if (password && password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 8 characters",
        },
        { status: 400 },
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 },
      );
    }

    const emailOwner = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (emailOwner && emailOwner.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Email already used by another user",
        },
        { status: 409 },
      );
    }

    const updateData: {
      firstName: string;
      lastName: string;
      email: string;
      role: Role;
      passwordHash?: string;
    } = {
      firstName,
      lastName,
      email,
      role,
    };

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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
        message: "User updated successfully",
        data: updatedUser,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("PATCH /api/admin/users/[userId] error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update user",
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

    const { userId } = await params;

    if (auth.user.id === userId) {
      return NextResponse.json(
        {
          success: false,
          message: "You cannot delete your own active admin account",
        },
        { status: 400 },
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        email: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 },
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json(
      {
        success: true,
        message: "User deleted successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("DELETE /api/admin/users/[userId] error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete user",
      },
      { status: 500 },
    );
  }
}
