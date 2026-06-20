/** @format */

import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

const TREND_DAYS = 14;

type FeatureBucket = {
  key: string;
  label: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
};

// Label ramah untuk tiap fitur AI. Kunci = metadata.kind bila ada,
// jika tidak memakai interactionType.
const FEATURE_LABELS: Record<string, string> = {
  "cer-assignment-assist": "Susun Tugas Argumentasi (Dosen)",
  "quiz-generation": "Buat Kuis dari Materi (Dosen)",
  "material-study-kit": "Buat Bahan Belajar (Dosen)",
  "material-chat": "Chatbot Tanya Materi (Mahasiswa)",
  "cer-grading-assist": "Bantuan Nilai Argumentasi (Dosen)",
  CER_FEEDBACK: "Umpan Balik Argumentasi (Mahasiswa)",
  DELIBERATION_PROMPT: "Pertanyaan Reflektif Diskusi (Mahasiswa)",
  SUMMARY: "Ringkasan Diskusi (Dosen)",
  RECOMMENDATION: "Rekomendasi AI",
  RUBRIC_ASSIST: "Bantuan Rubrik",
  REMEDIAL_HINT: "Petunjuk Remedial",
};

function featureKey(interactionType: string, metadata: unknown): string {
  if (metadata && typeof metadata === "object") {
    const kind = (metadata as { kind?: unknown }).kind;
    if (typeof kind === "string" && kind.trim().length > 0) {
      return kind;
    }
  }
  return interactionType;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  const { response } = await requireUser([Role.ADMIN]);

  if (response) {
    return response;
  }

  try {
    const trendCutoff = new Date();
    trendCutoff.setDate(trendCutoff.getDate() - (TREND_DAYS - 1));
    trendCutoff.setHours(0, 0, 0, 0);

    const [logs, recent, totalCalls] = await Promise.all([
      prisma.aIResponseLog.findMany({
        select: {
          interactionType: true,
          metadata: true,
          inputTokens: true,
          outputTokens: true,
          createdAt: true,
          userId: true,
        },
      }),
      prisma.aIResponseLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          interactionType: true,
          metadata: true,
          modelName: true,
          inputTokens: true,
          outputTokens: true,
          createdAt: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          course: {
            select: { title: true },
          },
        },
      }),
      prisma.aIResponseLog.count(),
    ]);

    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    const featureMap = new Map<string, FeatureBucket>();
    const userMap = new Map<
      string,
      { calls: number; inputTokens: number; outputTokens: number }
    >();
    const trendMap = new Map<
      string,
      { calls: number; inputTokens: number; outputTokens: number }
    >();

    // Siapkan kerangka tren 14 hari (termasuk hari kosong).
    for (let i = 0; i < TREND_DAYS; i += 1) {
      const d = new Date(trendCutoff);
      d.setDate(trendCutoff.getDate() + i);
      trendMap.set(dayKey(d), { calls: 0, inputTokens: 0, outputTokens: 0 });
    }

    for (const log of logs) {
      const input = log.inputTokens ?? 0;
      const output = log.outputTokens ?? 0;
      totalInputTokens += input;
      totalOutputTokens += output;

      const key = featureKey(log.interactionType, log.metadata);
      const bucket = featureMap.get(key) ?? {
        key,
        label: FEATURE_LABELS[key] ?? key,
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
      };
      bucket.calls += 1;
      bucket.inputTokens += input;
      bucket.outputTokens += output;
      featureMap.set(key, bucket);

      const userBucket = userMap.get(log.userId) ?? {
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
      };
      userBucket.calls += 1;
      userBucket.inputTokens += input;
      userBucket.outputTokens += output;
      userMap.set(log.userId, userBucket);

      if (log.createdAt >= trendCutoff) {
        const tk = dayKey(log.createdAt);
        const trendBucket = trendMap.get(tk);
        if (trendBucket) {
          trendBucket.calls += 1;
          trendBucket.inputTokens += input;
          trendBucket.outputTokens += output;
        }
      }
    }

    const features = Array.from(featureMap.values()).sort(
      (a, b) => b.calls - a.calls,
    );

    const trend = Array.from(trendMap.entries()).map(([date, value]) => ({
      date,
      calls: value.calls,
      tokens: value.inputTokens + value.outputTokens,
    }));

    // Ambil nama untuk pengguna paling aktif.
    const topUserEntries = Array.from(userMap.entries())
      .sort((a, b) => b[1].calls - a[1].calls)
      .slice(0, 5);

    const topUserIds = topUserEntries.map(([id]) => id);
    const topUserRecords =
      topUserIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: topUserIds } },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          })
        : [];

    const topUsers = topUserEntries.map(([id, value]) => {
      const record = topUserRecords.find((u) => u.id === id);
      const name = record
        ? `${record.firstName ?? ""} ${record.lastName ?? ""}`.trim() ||
          record.email
        : "Pengguna terhapus";
      return {
        id,
        name,
        email: record?.email ?? "—",
        role: record?.role ?? "—",
        calls: value.calls,
        tokens: value.inputTokens + value.outputTokens,
      };
    });

    const recentItems = recent.map((item) => {
      const key = featureKey(item.interactionType, item.metadata);
      const name = item.user
        ? `${item.user.firstName ?? ""} ${item.user.lastName ?? ""}`.trim() ||
          item.user.email
        : "—";
      return {
        id: item.id,
        feature: FEATURE_LABELS[key] ?? key,
        userName: name,
        userRole: item.user?.role ?? "—",
        courseTitle: item.course?.title ?? null,
        modelName: item.modelName ?? "—",
        tokens: (item.inputTokens ?? 0) + (item.outputTokens ?? 0),
        createdAt: item.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      message: "Statistik pemakaian AI berhasil dimuat.",
      data: {
        summary: {
          totalCalls,
          totalInputTokens,
          totalOutputTokens,
          totalTokens: totalInputTokens + totalOutputTokens,
          activeFeatures: features.length,
        },
        features,
        trend,
        topUsers,
        recent: recentItems,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/ai-usage error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal memuat statistik pemakaian AI.",
      },
      { status: 500 },
    );
  }
}
