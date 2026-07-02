/** @format */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import {
  contentTypeForAvatarKey,
  readAvatarFile,
} from "@/lib/profile/avatar-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ userId: string }>;
};

/**
 * Menyajikan foto profil pengguna sebagai gambar. Butuh sesi login (cookie
 * dikirim otomatis oleh tag <img> pada domain yang sama).
 */
export async function GET(_: NextRequest, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });

  if (!user?.avatarUrl) {
    return NextResponse.json(
      { success: false, message: "Foto profil tidak ada." },
      { status: 404 },
    );
  }

  try {
    const buffer = await readAvatarFile(user.avatarUrl);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentTypeForAvatarKey(user.avatarUrl),
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Gagal memuat foto profil." },
      { status: 500 },
    );
  }
}
