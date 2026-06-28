/** @format */

import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validators/auth.schema";
import { initiatePasswordReset } from "@/lib/password-reset";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
        { status: 400 },
      );
    }

    // Best-effort: jangan bocorkan apakah email terdaftar.
    await initiatePasswordReset(parsed.data.email);

    return NextResponse.json({
      success: true,
      message:
        "Jika email terdaftar, tautan pengaturan ulang kata sandi telah dikirim.",
    });
  } catch (error) {
    console.error("FORGOT_PASSWORD_ERROR", error);
    // Tetap balas sukses agar tidak membocorkan keberadaan akun.
    return NextResponse.json({
      success: true,
      message:
        "Jika email terdaftar, tautan pengaturan ulang kata sandi telah dikirim.",
    });
  }
}
