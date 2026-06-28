/** @format */

import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/lib/validators/auth.schema";
import { completePasswordReset } from "@/lib/password-reset";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
        { status: 400 },
      );
    }

    const result = await completePasswordReset(
      parsed.data.token,
      parsed.data.password,
    );

    if (!result.ok) {
      const message =
        result.reason === "expired"
          ? "Tautan sudah kedaluwarsa. Silakan minta tautan baru."
          : "Tautan tidak valid atau sudah digunakan. Silakan minta tautan baru.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Kata sandi berhasil diperbarui. Silakan masuk kembali.",
    });
  } catch (error) {
    console.error("RESET_PASSWORD_ERROR", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses permintaan." },
      { status: 500 },
    );
  }
}
