/** @format */

import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 jam

/** Hash token mentah agar tidak menyimpan nilai asli di database. */
export function hashResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/** Bangun URL reset absolut berbasis APP_URL/NEXT_PUBLIC_APP_URL. */
function buildResetUrl(rawToken: string): string {
  const base =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000";
  const normalized = base.replace(/\/+$/, "");
  return `${normalized}/reset-password?token=${rawToken}`;
}

/**
 * Mulai alur lupa password untuk sebuah email.
 *
 * Selalu menyelesaikan tanpa membocorkan apakah email terdaftar (anti user
 * enumeration). Bila pengguna ada, token lama dihapus, token baru dibuat,
 * lalu email dikirim.
 */
export async function initiatePasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, firstName: true, email: true },
  });

  if (!user) {
    return;
  }

  // Hapus token sebelumnya agar hanya satu token aktif per pengguna.
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const resetUrl = buildResetUrl(rawToken);

  await sendMail({
    to: user.email,
    subject: "Atur ulang kata sandi AI-CELM",
    html: buildResetEmailHtml(user.firstName, resetUrl),
  });
}

function buildResetEmailHtml(firstName: string, resetUrl: string): string {
  return `
  <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
    <h2 style="margin: 0 0 12px;">Atur ulang kata sandi</h2>
    <p>Halo ${firstName},</p>
    <p>Kami menerima permintaan untuk mengatur ulang kata sandi akun AI-CELM Anda. Klik tombol di bawah untuk membuat kata sandi baru. Tautan ini berlaku selama 1 jam.</p>
    <p style="margin: 24px 0;">
      <a href="${resetUrl}" style="background: #0d9488; color: #ffffff; padding: 12px 20px; border-radius: 10px; text-decoration: none; font-weight: bold;">Atur ulang kata sandi</a>
    </p>
    <p>Jika tombol tidak berfungsi, salin tautan ini ke peramban Anda:</p>
    <p style="word-break: break-all; color: #0d9488;">${resetUrl}</p>
    <p style="margin-top: 24px; color: #64748b; font-size: 14px;">Jika Anda tidak meminta ini, abaikan email ini. Kata sandi Anda tidak akan berubah.</p>
  </div>`;
}

export type ResetResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" };

/**
 * Selesaikan reset password dengan token mentah dan kata sandi baru.
 * Token diverifikasi via hash, dicek kedaluwarsa, lalu ditandai terpakai.
 */
export async function completePasswordReset(
  rawToken: string,
  newPassword: string,
): Promise<ResetResult> {
  const tokenHash = hashResetToken(rawToken);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt) {
    return { ok: false, reason: "invalid" };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Bersihkan token lain pengguna ini.
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId, id: { not: record.id } },
    }),
  ]);

  return { ok: true };
}
