/** @format */

import {
  CerAssignmentStatus,
  EnrollmentStatus,
  SubmissionStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type ReminderType = "DEADLINE" | "MATERIAL" | "GRADING";
export type ReminderSeverity = "info" | "warning" | "urgent";

export type ReminderItem = {
  id: string;
  type: ReminderType;
  title: string;
  description: string;
  href: string;
  timestamp: string;
  severity: ReminderSeverity;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DEADLINE_HORIZON_MS = 7 * DAY_MS;
const URGENT_WINDOW_MS = 2 * DAY_MS;
const MATERIAL_RECENT_MS = 7 * DAY_MS;

/** Format tenggat menjadi kalimat ramah, mis. "Tenggat besok", "Tenggat 3 hari lagi". */
function describeDueAt(dueAt: Date, now: Date): string {
  const diffMs = dueAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / DAY_MS);

  if (diffMs <= 0) {
    return "Tenggat hari ini";
  }
  if (diffDays <= 1) {
    const diffHours = Math.max(1, Math.round(diffMs / (60 * 60 * 1000)));
    return diffHours <= 24 && diffDays === 1
      ? "Tenggat besok"
      : `Tenggat ${diffHours} jam lagi`;
  }
  return `Tenggat ${diffDays} hari lagi`;
}

function deadlineSeverity(dueAt: Date, now: Date): ReminderSeverity {
  return dueAt.getTime() - now.getTime() <= URGENT_WINDOW_MS
    ? "urgent"
    : "warning";
}

/**
 * Pengingat untuk mahasiswa: tenggat tugas argumentasi yang belum dikumpulkan
 * dan bahan belajar baru yang diterbitkan dosen.
 */
export async function buildStudentReminders(
  userId: string,
): Promise<ReminderItem[]> {
  const now = new Date();

  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId,
      status: EnrollmentStatus.ACTIVE,
      course: { isPublished: true },
    },
    select: {
      course: { select: { id: true, slug: true } },
    },
  });

  const courseSlugById = new Map<string, string>();
  for (const enrollment of enrollments) {
    courseSlugById.set(enrollment.course.id, enrollment.course.slug);
  }

  const courseIds = [...courseSlugById.keys()];

  if (courseIds.length === 0) {
    return [];
  }

  const horizon = new Date(now.getTime() + DEADLINE_HORIZON_MS);
  const recentSince = new Date(now.getTime() - MATERIAL_RECENT_MS);

  const [assignments, kits] = await Promise.all([
    prisma.cerAssignment.findMany({
      where: {
        courseId: { in: courseIds },
        status: CerAssignmentStatus.ACTIVE,
        dueAt: { gte: now, lte: horizon },
      },
      select: {
        id: true,
        title: true,
        dueAt: true,
        courseId: true,
        submissions: {
          where: { studentId: userId },
          select: { status: true },
        },
      },
    }),
    prisma.materialStudyKit.findMany({
      where: {
        courseId: { in: courseIds },
        isPublished: true,
        publishedAt: { gte: recentSince },
      },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        publishedAt: true,
        courseId: true,
        material: { select: { title: true } },
      },
    }),
  ]);

  const deadlineItems: ReminderItem[] = [];

  for (const assignment of assignments) {
    if (!assignment.dueAt) continue;

    const submissionStatus = assignment.submissions[0]?.status;
    const alreadyHandedIn =
      submissionStatus === SubmissionStatus.SUBMITTED ||
      submissionStatus === SubmissionStatus.GRADED ||
      submissionStatus === SubmissionStatus.APPROVED;

    if (alreadyHandedIn) continue;

    const slug = courseSlugById.get(assignment.courseId);
    if (!slug) continue;

    deadlineItems.push({
      id: `deadline:${assignment.id}`,
      type: "DEADLINE",
      title: assignment.title,
      description: describeDueAt(assignment.dueAt, now),
      href: `/student/courses/${slug}`,
      timestamp: assignment.dueAt.toISOString(),
      severity: deadlineSeverity(assignment.dueAt, now),
    });
  }

  deadlineItems.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const materialItems: ReminderItem[] = [];

  for (const kit of kits) {
    const slug = courseSlugById.get(kit.courseId);
    if (!slug || !kit.publishedAt) continue;

    materialItems.push({
      id: `material:${kit.id}`,
      type: "MATERIAL",
      title: kit.material.title,
      description: "Bahan belajar baru tersedia",
      href: `/student/courses/${slug}/study`,
      timestamp: kit.publishedAt.toISOString(),
      severity: "info",
    });
  }

  return [...deadlineItems, ...materialItems];
}

/**
 * Pengingat untuk dosen: jawaban mahasiswa yang menunggu penilaian
 * dan tugas argumentasi yang tenggatnya mendekat.
 */
export async function buildLecturerReminders(
  userId: string,
): Promise<ReminderItem[]> {
  const now = new Date();

  const courses = await prisma.course.findMany({
    where: { lecturerId: userId },
    select: { id: true, slug: true },
  });

  const courseSlugById = new Map<string, string>();
  for (const course of courses) {
    courseSlugById.set(course.id, course.slug);
  }

  const courseIds = [...courseSlugById.keys()];

  if (courseIds.length === 0) {
    return [];
  }

  const horizon = new Date(now.getTime() + DEADLINE_HORIZON_MS);

  const [pendingSubmissions, assignments] = await Promise.all([
    prisma.cerSubmission.groupBy({
      by: ["assignmentId"],
      where: {
        status: SubmissionStatus.SUBMITTED,
        assignment: { courseId: { in: courseIds } },
      },
      _count: { _all: true },
    }),
    prisma.cerAssignment.findMany({
      where: {
        courseId: { in: courseIds },
        status: CerAssignmentStatus.ACTIVE,
        dueAt: { gte: now, lte: horizon },
      },
      select: {
        id: true,
        title: true,
        dueAt: true,
        courseId: true,
      },
    }),
  ]);

  const gradingItems: ReminderItem[] = [];

  if (pendingSubmissions.length > 0) {
    const assignmentMeta = await prisma.cerAssignment.findMany({
      where: { id: { in: pendingSubmissions.map((row) => row.assignmentId) } },
      select: { id: true, title: true, courseId: true },
    });

    const metaById = new Map(assignmentMeta.map((row) => [row.id, row]));

    for (const row of pendingSubmissions) {
      const meta = metaById.get(row.assignmentId);
      if (!meta) continue;

      const slug = courseSlugById.get(meta.courseId);
      if (!slug) continue;

      const count = row._count._all;

      gradingItems.push({
        id: `grading:${row.assignmentId}`,
        type: "GRADING",
        title: meta.title,
        description: `${count} jawaban menunggu penilaian`,
        href: `/lecturer/courses/${slug}/cer`,
        timestamp: now.toISOString(),
        severity: "warning",
      });
    }
  }

  const deadlineItems: ReminderItem[] = [];

  for (const assignment of assignments) {
    if (!assignment.dueAt) continue;

    const slug = courseSlugById.get(assignment.courseId);
    if (!slug) continue;

    deadlineItems.push({
      id: `due:${assignment.id}`,
      type: "DEADLINE",
      title: assignment.title,
      description: describeDueAt(assignment.dueAt, now),
      href: `/lecturer/courses/${slug}/cer`,
      timestamp: assignment.dueAt.toISOString(),
      severity: deadlineSeverity(assignment.dueAt, now),
    });
  }

  deadlineItems.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return [...gradingItems, ...deadlineItems];
}
