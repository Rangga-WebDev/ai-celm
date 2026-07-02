/** @format */

import {
  CivicTestType,
  EnrollmentStatus,
  ModerationFlag,
  SubmissionStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Analisis ketercapaian civic engagement per mahasiswa dalam satu mata kuliah.
 *
 * Menggabungkan sinyal keterlibatan kewarganegaraan dari:
 * - Diskusi (jumlah kontribusi + kualitas moderasi),
 * - Tugas argumentasi (CER),
 * - Project aksi kewarganegaraan,
 * - Tes civic engagement (PRE/POST: kognitif, afektif, behavioral).
 *
 * Skor komposit 0-100 dan tingkat ketercapaian dihitung dari sinyal yang tersedia.
 */

export type CivicAchievementLevel =
  | "BELUM_TERLIHAT"
  | "BERKEMBANG"
  | "BAIK"
  | "SANGAT_BAIK";

export type StudentCivicAnalysis = {
  studentId: string;
  name: string;
  nim: string | null;
  kelas: string | null;
  discussion: {
    totalPosts: number;
    flaggedPosts: number;
    cleanRatio: number | null;
  };
  cer: {
    submitted: number;
    graded: number;
    averageScore: number | null;
  };
  projects: {
    submitted: number;
    graded: number;
    averageScore: number | null;
  };
  civicTest: {
    preOverall: number | null;
    postOverall: number | null;
    growth: number | null;
    cognitive: number | null;
    affective: number | null;
    behavioral: number | null;
  };
  score: number;
  level: CivicAchievementLevel;
  reasons: string[];
};

export type CourseCivicAnalysis = {
  course: { id: string; title: string; slug: string };
  totals: {
    students: number;
    averageScore: number | null;
    byLevel: Record<CivicAchievementLevel, number>;
  };
  students: StudentCivicAnalysis[];
};

const GRADED_STATUSES: SubmissionStatus[] = [
  SubmissionStatus.GRADED,
  SubmissionStatus.APPROVED,
];

const SUBMITTED_STATUSES: SubmissionStatus[] = [
  SubmissionStatus.SUBMITTED,
  SubmissionStatus.REVISION_REQUIRED,
  SubmissionStatus.GRADED,
  SubmissionStatus.APPROVED,
];

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function levelFromScore(score: number): CivicAchievementLevel {
  if (score >= 80) return "SANGAT_BAIK";
  if (score >= 60) return "BAIK";
  if (score >= 35) return "BERKEMBANG";
  return "BELUM_TERLIHAT";
}

/**
 * Menghitung skor komposit civic engagement dari komponen yang tersedia.
 * Bobot: diskusi 30%, CER 25%, project 25%, tes civic 20%. Bobot komponen yang
 * datanya tidak ada dinormalisasi ulang agar total tetap adil.
 */
function computeComposite(input: {
  discussionScore: number | null;
  cerScore: number | null;
  projectScore: number | null;
  civicScore: number | null;
}): number {
  const parts: Array<{ value: number; weight: number }> = [];
  if (input.discussionScore !== null)
    parts.push({ value: input.discussionScore, weight: 0.3 });
  if (input.cerScore !== null)
    parts.push({ value: input.cerScore, weight: 0.25 });
  if (input.projectScore !== null)
    parts.push({ value: input.projectScore, weight: 0.25 });
  if (input.civicScore !== null)
    parts.push({ value: input.civicScore, weight: 0.2 });

  if (parts.length === 0) return 0;

  const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0);
  const weighted = parts.reduce((sum, p) => sum + p.value * p.weight, 0);
  return clamp(weighted / totalWeight);
}

export async function analyzeCourseCivicEngagement(
  courseId: string,
): Promise<CourseCivicAnalysis | null> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, slug: true },
  });
  if (!course) return null;

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, status: EnrollmentStatus.ACTIVE },
    select: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          nim: true,
          kelas: true,
        },
      },
    },
    orderBy: { user: { firstName: "asc" } },
  });

  const studentIds = enrollments.map((e) => e.user.id);

  if (studentIds.length === 0) {
    return {
      course,
      totals: {
        students: 0,
        averageScore: null,
        byLevel: {
          BELUM_TERLIHAT: 0,
          BERKEMBANG: 0,
          BAIK: 0,
          SANGAT_BAIK: 0,
        },
      },
      students: [],
    };
  }

  // Ambil semua sinyal untuk kelas ini sekaligus, lalu kelompokkan per mahasiswa.
  const [posts, cerSubs, projectSubs, civicResponses] = await Promise.all([
    prisma.discussionPost.findMany({
      where: {
        thread: { courseId },
        authorId: { in: studentIds },
      },
      select: { authorId: true, moderationFlag: true },
    }),
    prisma.cerSubmission.findMany({
      where: {
        studentId: { in: studentIds },
        assignment: { courseId },
      },
      select: { studentId: true, status: true, score: true },
    }),
    prisma.projectSubmission.findMany({
      where: {
        studentId: { in: studentIds },
        project: { courseId },
      },
      select: { studentId: true, status: true, score: true },
    }),
    prisma.civicEngagementResponse.findMany({
      where: { courseId, userId: { in: studentIds } },
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

  // Referensi keterlibatan diskusi: post terbanyak di kelas sebagai skala penuh.
  const postCountByStudent = new Map<string, number>();
  const flaggedByStudent = new Map<string, number>();
  for (const post of posts) {
    postCountByStudent.set(
      post.authorId,
      (postCountByStudent.get(post.authorId) ?? 0) + 1,
    );
    if (
      post.moderationFlag === ModerationFlag.CAUTION ||
      post.moderationFlag === ModerationFlag.SEVERE
    ) {
      flaggedByStudent.set(
        post.authorId,
        (flaggedByStudent.get(post.authorId) ?? 0) + 1,
      );
    }
  }
  const maxPosts = Math.max(1, ...postCountByStudent.values());

  const cerByStudent = new Map<
    string,
    { submitted: number; graded: number; scores: number[] }
  >();
  for (const sub of cerSubs) {
    const entry = cerByStudent.get(sub.studentId) ?? {
      submitted: 0,
      graded: 0,
      scores: [],
    };
    if (SUBMITTED_STATUSES.includes(sub.status)) entry.submitted += 1;
    if (GRADED_STATUSES.includes(sub.status)) {
      entry.graded += 1;
      if (typeof sub.score === "number") entry.scores.push(sub.score);
    }
    cerByStudent.set(sub.studentId, entry);
  }

  const projectByStudent = new Map<
    string,
    { submitted: number; graded: number; scores: number[] }
  >();
  for (const sub of projectSubs) {
    const entry = projectByStudent.get(sub.studentId) ?? {
      submitted: 0,
      graded: 0,
      scores: [],
    };
    if (SUBMITTED_STATUSES.includes(sub.status)) entry.submitted += 1;
    if (GRADED_STATUSES.includes(sub.status)) {
      entry.graded += 1;
      if (typeof sub.score === "number") entry.scores.push(sub.score);
    }
    projectByStudent.set(sub.studentId, entry);
  }

  const civicByStudent = new Map<
    string,
    {
      pre?: {
        cognitive: number;
        affective: number;
        behavioral: number;
        overall: number;
      };
      post?: {
        cognitive: number;
        affective: number;
        behavioral: number;
        overall: number;
      };
    }
  >();
  for (const res of civicResponses) {
    const entry = civicByStudent.get(res.userId) ?? {};
    const scores = {
      cognitive: res.scoreCognitive,
      affective: res.scoreAffective,
      behavioral: res.scoreBehavioral,
      overall: res.scoreOverall,
    };
    if (res.type === CivicTestType.PRE) entry.pre = scores;
    else entry.post = scores;
    civicByStudent.set(res.userId, entry);
  }

  const averageOf = (values: number[]) =>
    values.length > 0
      ? values.reduce((sum, v) => sum + v, 0) / values.length
      : null;

  const students: StudentCivicAnalysis[] = enrollments.map((enrollment) => {
    const user = enrollment.user;
    const name = `${user.firstName} ${user.lastName}`.trim();

    const totalPosts = postCountByStudent.get(user.id) ?? 0;
    const flaggedPosts = flaggedByStudent.get(user.id) ?? 0;
    const cleanRatio =
      totalPosts > 0 ? (totalPosts - flaggedPosts) / totalPosts : null;

    const cer = cerByStudent.get(user.id) ?? {
      submitted: 0,
      graded: 0,
      scores: [],
    };
    const project = projectByStudent.get(user.id) ?? {
      submitted: 0,
      graded: 0,
      scores: [],
    };
    const civic = civicByStudent.get(user.id) ?? {};

    const cerAvg = averageOf(cer.scores);
    const projectAvg = averageOf(project.scores);

    // Skor komponen 0-100.
    // Diskusi: proporsi kontribusi vs peserta paling aktif, dikoreksi kualitas.
    const discussionScore =
      totalPosts > 0
        ? clamp((totalPosts / maxPosts) * 100 * (cleanRatio ?? 1))
        : null;
    const cerScore = cerAvg;
    const projectScore = projectAvg;

    const postCivic = civic.post ?? civic.pre ?? null;
    const civicScore = postCivic ? clamp(postCivic.overall) : null;

    const score = round(
      computeComposite({
        discussionScore,
        cerScore,
        projectScore,
        civicScore,
      }),
    );
    const level = levelFromScore(score);

    const reasons: string[] = [];
    if (totalPosts === 0) reasons.push("Belum ada kontribusi diskusi.");
    else reasons.push(`${totalPosts} kontribusi diskusi.`);
    if (flaggedPosts > 0)
      reasons.push(`${flaggedPosts} kontribusi ditandai moderasi.`);
    if (cer.submitted === 0)
      reasons.push("Belum mengumpulkan tugas argumentasi.");
    else if (cerAvg !== null)
      reasons.push(`Rata-rata argumentasi ${round(cerAvg)}.`);
    if (project.submitted === 0)
      reasons.push("Belum mengumpulkan project aksi.");
    else if (projectAvg !== null)
      reasons.push(`Rata-rata project ${round(projectAvg)}.`);
    if (civic.pre && civic.post) {
      const growth = round(civic.post.overall - civic.pre.overall);
      reasons.push(
        growth >= 0
          ? `Skor tes civic naik ${growth} poin (pra→pasca).`
          : `Skor tes civic turun ${Math.abs(growth)} poin (pra→pasca).`,
      );
    } else if (postCivic) {
      reasons.push(`Skor tes civic ${round(postCivic.overall)}.`);
    }

    return {
      studentId: user.id,
      name,
      nim: user.nim,
      kelas: user.kelas,
      discussion: {
        totalPosts,
        flaggedPosts,
        cleanRatio: cleanRatio !== null ? round(cleanRatio * 100) : null,
      },
      cer: {
        submitted: cer.submitted,
        graded: cer.graded,
        averageScore: cerAvg !== null ? round(cerAvg) : null,
      },
      projects: {
        submitted: project.submitted,
        graded: project.graded,
        averageScore: projectAvg !== null ? round(projectAvg) : null,
      },
      civicTest: {
        preOverall: civic.pre ? round(civic.pre.overall) : null,
        postOverall: civic.post ? round(civic.post.overall) : null,
        growth:
          civic.pre && civic.post
            ? round(civic.post.overall - civic.pre.overall)
            : null,
        cognitive: postCivic ? round(postCivic.cognitive) : null,
        affective: postCivic ? round(postCivic.affective) : null,
        behavioral: postCivic ? round(postCivic.behavioral) : null,
      },
      score,
      level,
      reasons,
    };
  });

  const byLevel: Record<CivicAchievementLevel, number> = {
    BELUM_TERLIHAT: 0,
    BERKEMBANG: 0,
    BAIK: 0,
    SANGAT_BAIK: 0,
  };
  for (const student of students) byLevel[student.level] += 1;

  const scored = students.map((s) => s.score);
  const averageScore =
    scored.length > 0
      ? round(scored.reduce((sum, v) => sum + v, 0) / scored.length)
      : null;

  return {
    course,
    totals: {
      students: students.length,
      averageScore,
      byLevel,
    },
    students,
  };
}
