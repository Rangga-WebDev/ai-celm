/** @format */

import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ userId: string }>;
};

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

export async function GET(_: NextRequest, { params }: Params) {
  const auth = await requireUser([Role.STUDENT]);
  if (auth.response) return auth.response;

  const { userId } = await params;
  if (auth.user.id !== userId) {
    return NextResponse.json(
      { success: false, message: "Akses ditolak." },
      { status: 403 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      nim: true,
      kelas: true,
      avatarUrl: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Pengguna tidak ditemukan." },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: "Profil dimuat.",
      data: {
        ...user,
        hasAvatar: Boolean(user.avatarUrl),
      },
    },
    { status: 200 },
  );
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireUser([Role.STUDENT]);
  if (auth.response) return auth.response;

  const { userId } = await params;
  if (auth.user.id !== userId) {
    return NextResponse.json(
      { success: false, message: "Akses ditolak." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    firstName?: unknown;
    lastName?: unknown;
    nim?: unknown;
    kelas?: unknown;
  } | null;

  const firstName = cleanText(body?.firstName);
  const lastName = cleanText(body?.lastName);
  const nim = cleanText(body?.nim);
  const kelas = cleanText(body?.kelas);

  const errors: string[] = [];
  if (firstName.length < 2) errors.push("Nama depan minimal 2 karakter.");
  if (lastName.length < 1) errors.push("Nama belakang wajib diisi.");
  if (nim.length < 3) errors.push("NIM wajib diisi (minimal 3 karakter).");
  if (kelas.length < 1) errors.push("Kelas wajib diisi.");

  if (errors.length > 0) {
    return NextResponse.json(
      { success: false, message: errors.join(" ") },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { firstName, lastName, nim, kelas },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      nim: true,
      kelas: true,
      avatarUrl: true,
    },
  });

  return NextResponse.json(
    {
      success: true,
      message: "Profil berhasil diperbarui.",
      data: { ...updated, hasAvatar: Boolean(updated.avatarUrl) },
    },
    { status: 200 },
  );
}
