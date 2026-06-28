/** @format */

import { NextRequest, NextResponse } from "next/server";
import { EnrollmentStatus, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import {
  CIVIC_DIMENSION_LABELS,
  CIVIC_LIKERT_LABELS,
  CIVIC_SURVEY_ITEMS,
  computeCivicScores,
  findInvalidCivicAnswers,
} from "@/lib/civic/civic-survey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ userId: string; slug: string }>;
};

async function resolveEnrolledCourse(userId: string, slug: string) {
  const course = await prisma.course.findFirst({
    where: { slug, isPublished: true },
    select: { id: true, title: true, slug: true },
  });

  if (!course) {
    return { error: "Mata kuliah tidak ditemukan", status: 404 as const };
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId,
      courseId: course.id,
      status: EnrollmentStatus.ACTIVE,
    },
    select: { id: true },
  });

  if (!enrollment) {
    return {
      error: "Anda belum terdaftar di mata kuliah ini",
      status: 403 as const,
    };
  }

  return { course, error: null };
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.STUDENT]);
    if (auth.response) return auth.response;

    const { userId, slug } = await params;
    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak" },
        { status: 403 },
      );
    }

    const resolved = await resolveEnrolledCourse(userId, slug);
    if (resolved.error || !resolved.course) {
      return NextResponse.json(
        { success: false, message: resolved.error },
        { status: resolved.status },
      );
    }

    const responses = await prisma.civicEngagementResponse.findMany({
      where: { userId, courseId: resolved.course.id },
      select: {
        type: true,
        scoreCognitive: true,
        scoreAffective: true,
        scoreBehavioral: true,
        scoreOverall: true,
        createdAt: true,
      },
    });

    const pre = responses.find((item) => item.type === "PRE") ?? null;
    const post = responses.find((item) => item.type === "POST") ?? null;

    return NextResponse.json({
      success: true,
      message: "Kuesioner civic engagement",
      data: {
        course: resolved.course,
        items: CIVIC_SURVEY_ITEMS,
        dimensionLabels: CIVIC_DIMENSION_LABELS,
        likertLabels: CIVIC_LIKERT_LABELS,
        responses: { pre, post },
      },
    });
  } catch (error) {
    console.error("GET civic-test error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat kuesioner" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.STUDENT]);
    if (auth.response) return auth.response;

    const { userId, slug } = await params;
    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak" },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const type = body?.type;
    const answers = body?.answers;

    if (type !== "PRE" && type !== "POST") {
      return NextResponse.json(
        { success: false, message: "Jenis tes tidak valid" },
        { status: 400 },
      );
    }

    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { success: false, message: "Jawaban tidak valid" },
        { status: 400 },
      );
    }

    const invalid = findInvalidCivicAnswers(answers as Record<string, unknown>);
    if (invalid.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Mohon lengkapi semua pernyataan sebelum mengirim",
          errors: { items: invalid },
        },
        { status: 400 },
      );
    }

    const resolved = await resolveEnrolledCourse(userId, slug);
    if (resolved.error || !resolved.course) {
      return NextResponse.json(
        { success: false, message: resolved.error },
        { status: resolved.status },
      );
    }

    const numericAnswers = answers as Record<string, number>;
    const scores = computeCivicScores(numericAnswers);

    const response = await prisma.civicEngagementResponse.upsert({
      where: {
        userId_courseId_type: {
          userId,
          courseId: resolved.course.id,
          type,
        },
      },
      create: {
        userId,
        courseId: resolved.course.id,
        type,
        answers: numericAnswers,
        ...scores,
      },
      update: {
        answers: numericAnswers,
        ...scores,
      },
      select: {
        type: true,
        scoreCognitive: true,
        scoreAffective: true,
        scoreBehavioral: true,
        scoreOverall: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          type === "PRE"
            ? "Pre-test berhasil disimpan"
            : "Post-test berhasil disimpan",
        data: { response },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST civic-test error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menyimpan jawaban" },
      { status: 500 },
    );
  }
}
