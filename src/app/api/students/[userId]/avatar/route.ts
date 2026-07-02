/** @format */

import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";
import {
  MAX_AVATAR_BYTES,
  deleteAvatarFile,
  isAllowedAvatarMime,
  saveAvatarFile,
} from "@/lib/profile/avatar-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ userId: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireUser([Role.STUDENT]);
  if (auth.response) return auth.response;

  const { userId } = await params;
  if (auth.user.id !== userId) {
    return NextResponse.json(
      { success: false, message: "Akses ditolak." },
      { status: 403 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { success: false, message: "Pilih berkas gambar terlebih dahulu." },
      { status: 400 },
    );
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json(
      { success: false, message: "Ukuran gambar maksimal 3 MB." },
      { status: 413 },
    );
  }

  if (!isAllowedAvatarMime(file.type)) {
    return NextResponse.json(
      { success: false, message: "Format harus PNG, JPG, atau WEBP." },
      { status: 415 },
    );
  }

  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = await saveAvatarFile(buffer, file.type);

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: key },
  });

  // Hapus avatar lama setelah yang baru tersimpan.
  if (current?.avatarUrl && current.avatarUrl !== key) {
    await deleteAvatarFile(current.avatarUrl).catch(() => undefined);
  }

  return NextResponse.json(
    {
      success: true,
      message: "Foto profil diperbarui.",
      data: { avatarKey: key },
    },
    { status: 200 },
  );
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const auth = await requireUser([Role.STUDENT]);
  if (auth.response) return auth.response;

  const { userId } = await params;
  if (auth.user.id !== userId) {
    return NextResponse.json(
      { success: false, message: "Akses ditolak." },
      { status: 403 },
    );
  }

  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });

  if (current?.avatarUrl) {
    await deleteAvatarFile(current.avatarUrl).catch(() => undefined);
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });
  }

  return NextResponse.json(
    { success: true, message: "Foto profil dihapus." },
    { status: 200 },
  );
}
