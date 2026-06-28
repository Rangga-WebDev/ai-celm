/** @format */

import { NextRequest, NextResponse } from "next/server";
import { EnrollmentStatus, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ userId: string; slug: string }>;
};

type Scores = {
  scoreCognitive: number;
  scoreAffective: number;
  scoreBehavioral: number;
  scoreOverall: number;
};

function averageScores(rows: Scores[]): Scores {
  if (rows.length === 0) {
    return {
      scoreCognitive: 0,
      scoreAffective: 0,
      scoreBehavioral: 0,
      scoreOverall: 0,
    };
  }
  const sum = rows.reduce(
    (acc, row) => ({
      scoreCognitive: acc.scoreCognitive + row.scoreCognitive,
      scoreAffective: acc.scoreAffective + row.scoreAffective,
      scoreBehavioral: acc.scoreBehavioral + row.scoreBehavioral,
      scoreOverall: acc.scoreOverall + row.scoreOverall,
    }),
    {
      scoreCognitive: 0,
      scoreAffective: 0,
      scoreBehavioral: 0,
      scoreOverall: 0,
    },
  );
  return {
    scoreCognitive: Math.round(sum.scoreCognitive / rows.length),
    scoreAffective: Math.round(sum.scoreAffective / rows.length),
    scoreBehavioral: Math.round(sum.scoreBehavioral / rows.length),
    scoreOverall: Math.round(sum.scoreOverall / rows.length),
  };
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug } = await params;
    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak" },
        { status: 403 },
      );
    }

    const course = await prisma.course.findFirst({
      where: { slug, lecturerId: userId },
      select: { id: true, title: true, slug: true },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, message: "Mata kuliah tidak ditemukan" },
        { status: 404 },
      );
    }

    const [enrollments, responses] = await Promise.all([
      prisma.enrollment.findMany({
        where: { courseId: course.id, status: EnrollmentStatus.ACTIVE },
        select: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.civicEngagementResponse.findMany({
        where: { courseId: course.id },
        select: {
          userId: true,
          type: true,
          scoreCognitive: true,
          scoreAffective: true,
          scoreBehavioral: true,
          scoreOverall: true,
        },
      }),
    ]);

    const preRows = responses.filter((row) => row.type === "PRE");
    const postRows = responses.filter((row) => row.type === "POST");

    const classAverage = {
      pre: averageScores(preRows),
      post: averageScores(postRows),
      preCount: preRows.length,
      postCount: postRows.length,
    };

    const students = enrollments.map((enrollment) => {
      const student = enrollment.user;
      const pre = preRows.find((row) => row.userId === student.id) ?? null;
      const post = postRows.find((row) => row.userId === student.id) ?? null;
      const improvement =
        pre && post ? post.scoreOverall - pre.scoreOverall : null;
      return {
        id: student.id,
        name:
          `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() ||
          "Mahasiswa",
        preOverall: pre?.scoreOverall ?? null,
        postOverall: post?.scoreOverall ?? null,
        improvement,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Rekap civic engagement",
      data: {
        course,
        totalStudents: enrollments.length,
        classAverage,
        students,
      },
    });
  } catch (error) {
    console.error("GET lecturer civic-test error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat rekap" },
      { status: 500 },
    );
  }
}
