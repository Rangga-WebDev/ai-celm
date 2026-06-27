/** @format */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Pembatas laju (rate limit) & kuota untuk endpoint AI.
 *
 * Dua lapis proteksi:
 *  1. Burst per-menit (in-memory, per proses) untuk mencegah spam cepat.
 *  2. Kuota harian (berbasis DB / AIResponseLog) untuk membatasi biaya total.
 *
 * Nilai dapat diatur via env:
 *  - AI_RATE_LIMIT_PER_MINUTE (default 8)
 *  - AI_DAILY_QUOTA           (default 80)
 */

const PER_MINUTE_LIMIT = Math.max(
  1,
  Number(process.env.AI_RATE_LIMIT_PER_MINUTE ?? 8),
);
const DAILY_QUOTA = Math.max(1, Number(process.env.AI_DAILY_QUOTA ?? 80));
const MINUTE_MS = 60_000;

// Map<userId, timestamps[]> menyimpan waktu permintaan dalam 1 menit terakhir.
const burstBuckets = new Map<string, number[]>();

function checkBurst(userId: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const windowStart = now - MINUTE_MS;
  const timestamps = (burstBuckets.get(userId) ?? []).filter(
    (ts) => ts > windowStart,
  );

  if (timestamps.length >= PER_MINUTE_LIMIT) {
    const oldest = timestamps[0];
    const retryAfter = Math.max(
      1,
      Math.ceil((oldest + MINUTE_MS - now) / 1000),
    );
    burstBuckets.set(userId, timestamps);
    return { allowed: false, retryAfter };
  }

  timestamps.push(now);
  burstBuckets.set(userId, timestamps);
  return { allowed: true, retryAfter: 0 };
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getDailyUsage(userId: string): Promise<number> {
  try {
    return await prisma.aIResponseLog.count({
      where: {
        userId,
        createdAt: { gte: startOfToday() },
      },
    });
  } catch {
    // Jika tabel/koneksi bermasalah, jangan blokir pengguna karena kuota.
    return 0;
  }
}

/**
 * Terapkan rate limit untuk seorang pengguna sebelum memanggil AI.
 * Mengembalikan `{ response }` berisi NextResponse 429 jika ditolak,
 * atau `{ response: null }` jika diizinkan.
 */
export async function enforceAiRateLimit(
  userId: string,
): Promise<{ response: NextResponse | null }> {
  const burst = checkBurst(userId);
  if (!burst.allowed) {
    return {
      response: NextResponse.json(
        {
          success: false,
          message:
            "Terlalu banyak permintaan AI dalam waktu singkat. Coba lagi sebentar.",
          retryAfterSeconds: burst.retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(burst.retryAfter) } },
      ),
    };
  }

  const dailyUsage = await getDailyUsage(userId);
  if (dailyUsage >= DAILY_QUOTA) {
    return {
      response: NextResponse.json(
        {
          success: false,
          message: `Kuota AI harian Anda (${DAILY_QUOTA}) sudah habis. Coba lagi besok.`,
          dailyQuota: DAILY_QUOTA,
          dailyUsage,
        },
        { status: 429 },
      ),
    };
  }

  return { response: null };
}
