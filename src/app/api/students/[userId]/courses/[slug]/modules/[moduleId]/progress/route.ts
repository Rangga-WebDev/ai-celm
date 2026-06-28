/** @format */

import { NextRequest, NextResponse } from "next/server";
import {
  EnrollmentStatus,
  ProgressStatus,
  Role,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
    moduleId: string;
  }>;
};

const MIN_LEARNING_SECONDS = 20;

function isValidProgressStatus(value: unknown): value is ProgressStatus {
  return (
    value === ProgressStatus.IN_PROGRESS || value === ProgressStatus.COMPLETED
  );
}

function getElapsedSeconds(startedAt: Date | null) {
  if (!startedAt) return 0;
  return Math.floor((Date.now() - startedAt.getTime()) / 1000);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.STUDENT]);
    if (auth.response) return auth.response;

    const { userId, slug, moduleId } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Student can only update their own progress",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const statusInput = body.status ?? ProgressStatus.IN_PROGRESS;

    if (!isValidProgressStatus(statusInput)) {
      return NextResponse.json(
        { success: false, message: "Valid progress status is required" },
        { status: 400 },
      );
    }

    const targetModule = await prisma.module.findFirst({
      where: {
        id: moduleId,
        course: { slug, isPublished: true },
      },
      select: {
        id: true,
        courseId: true,
        isLocked: true,
        masteryThreshold: true,
      },
    });

    if (!targetModule) {
      return NextResponse.json(
        { success: false, message: "Modul tidak ditemukan." },
        { status: 404 },
      );
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        courseId: targetModule.courseId,
        status: EnrollmentStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!enrollment) {
      return NextResponse.json(
        { success: false, message: "Anda belum terdaftar di kelas ini." },
        { status: 403 },
      );
    }

    if (targetModule.isLocked) {
      return NextResponse.json(
        { success: false, message: "Modul ini sedang terkunci." },
        { status: 403 },
      );
    }

    const existingProgress = await prisma.moduleProgress.findUnique({
      where: { userId_moduleId: { userId, moduleId: targetModule.id } },
      select: { id: true, status: true, startedAt: true },
    });

    if (
      existingProgress?.status === ProgressStatus.COMPLETED &&
      statusInput === ProgressStatus.IN_PROGRESS
    ) {
      return NextResponse.json(
        { success: false, message: "Modul ini sudah Anda selesaikan." },
        { status: 409 },
      );
    }

    if (statusInput === ProgressStatus.COMPLETED) {
      if (!existingProgress?.startedAt) {
        return NextResponse.json(
          {
            success: false,
            message: "Mulai belajar dahulu sebelum menandai selesai.",
            remainingSeconds: MIN_LEARNING_SECONDS,
            minimumSeconds: MIN_LEARNING_SECONDS,
          },
          { status: 409 },
        );
      }

      const remainingSeconds = Math.max(
        MIN_LEARNING_SECONDS - getElapsedSeconds(existingProgress.startedAt),
        0,
      );

      if (remainingSeconds > 0) {
        return NextResponse.json(
          {
            success: false,
            message: `Pelajari modul ${remainingSeconds} detik lagi sebelum menyelesaikannya.`,
            remainingSeconds,
            minimumSeconds: MIN_LEARNING_SECONDS,
          },
          { status: 409 },
        );
      }
    }

    const now = new Date();
    const progressPercent = statusInput === ProgressStatus.COMPLETED ? 100 : 25;
    const isPassed =
      statusInput === ProgressStatus.COMPLETED &&
      progressPercent >= targetModule.masteryThreshold;

    const moduleProgress = await prisma.moduleProgress.upsert({
      where: { userId_moduleId: { userId, moduleId: targetModule.id } },
      update: {
        status: statusInput,
        progressPercent,
        isPassed,
        remedialRequired: false,
        startedAt: existingProgress?.startedAt ?? now,
        completedAt: statusInput === ProgressStatus.COMPLETED ? now : null,
        lastAccessedAt: now,
      },
      create: {
        userId,
        moduleId: targetModule.id,
        status: statusInput,
        progressPercent,
        masteryScore: null,
        isPassed,
        remedialRequired: false,
        startedAt: now,
        completedAt: statusInput === ProgressStatus.COMPLETED ? now : null,
        lastAccessedAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        statusInput === ProgressStatus.COMPLETED
          ? "Modul ditandai selesai."
          : "Sesi belajar dimulai.",
      data: { progress: moduleProgress },
    });
  } catch (error) {
    console.error("PATCH module progress error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menyimpan progres modul." },
      { status: 500 },
    );
  }
}
