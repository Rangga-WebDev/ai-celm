/** @format */

import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
  }>;
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

async function findOwnedCourse(userId: string, slug: string) {
  return prisma.course.findFirst({
    where: { slug, lecturerId: userId },
    select: { id: true },
  });
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug } = await params;
    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 },
      );
    }

    const course = await findOwnedCourse(userId, slug);
    if (!course) {
      return NextResponse.json(
        { success: false, message: "Mata kuliah tidak ditemukan." },
        { status: 404 },
      );
    }

    const cpmks = await prisma.cPMK.findMany({
      where: { courseId: course.id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        code: true,
        statement: true,
        order: true,
        cplMappings: {
          select: {
            cpl: { select: { id: true, code: true } },
          },
        },
      },
    });

    const data = cpmks.map((cpmk) => ({
      id: cpmk.id,
      code: cpmk.code,
      statement: cpmk.statement,
      order: cpmk.order,
      cpls: cpmk.cplMappings.map((m) => ({
        id: m.cpl.id,
        code: m.cpl.code,
      })),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET course CPMK error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat CPMK." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug } = await params;
    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 },
      );
    }

    const course = await findOwnedCourse(userId, slug);
    if (!course) {
      return NextResponse.json(
        { success: false, message: "Mata kuliah tidak ditemukan." },
        { status: 404 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      code?: unknown;
      statement?: unknown;
      cplIds?: unknown;
    };

    const code = cleanText(body.code).toUpperCase();
    const statement = cleanText(body.statement);
    const cplIds = Array.isArray(body.cplIds)
      ? Array.from(
          new Set(
            body.cplIds
              .map((value) => cleanText(value))
              .filter((value) => value.length > 0),
          ),
        )
      : [];

    if (code.length < 2) {
      return NextResponse.json(
        { success: false, message: "Kode CPMK minimal 2 karakter." },
        { status: 400 },
      );
    }
    if (statement.length < 5) {
      return NextResponse.json(
        { success: false, message: "Rumusan CPMK minimal 5 karakter." },
        { status: 400 },
      );
    }

    const duplicate = await prisma.cPMK.findUnique({
      where: { courseId_code: { courseId: course.id, code } },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message: "Kode CPMK sudah dipakai di mata kuliah ini.",
        },
        { status: 409 },
      );
    }

    // Pastikan CPL yang dipetakan benar-benar terhubung ke mata kuliah ini.
    let validCplIds: string[] = [];
    if (cplIds.length > 0) {
      const linked = await prisma.courseCPL.findMany({
        where: { courseId: course.id, cplId: { in: cplIds } },
        select: { cplId: true },
      });
      validCplIds = linked.map((item) => item.cplId);
    }

    // Tentukan urutan (order) berikutnya.
    const last = await prisma.cPMK.findFirst({
      where: { courseId: course.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const nextOrder = (last?.order ?? 0) + 1;

    const cpmk = await prisma.cPMK.create({
      data: {
        courseId: course.id,
        code,
        statement,
        order: nextOrder,
        cplMappings:
          validCplIds.length > 0
            ? { create: validCplIds.map((cplId) => ({ cplId })) }
            : undefined,
      },
      select: {
        id: true,
        code: true,
        statement: true,
        order: true,
        cplMappings: {
          select: { cpl: { select: { id: true, code: true } } },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "CPMK berhasil ditambahkan.",
        data: {
          id: cpmk.id,
          code: cpmk.code,
          statement: cpmk.statement,
          order: cpmk.order,
          cpls: cpmk.cplMappings.map((m) => ({
            id: m.cpl.id,
            code: m.cpl.code,
          })),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST course CPMK error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menambahkan CPMK." },
      { status: 500 },
    );
  }
}
