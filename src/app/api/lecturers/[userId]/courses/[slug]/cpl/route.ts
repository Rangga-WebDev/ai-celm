/** @format */

import { NextRequest, NextResponse } from "next/server";
import { CPLDomain, Role } from "@/generated/prisma/client";
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

const VALID_DOMAINS = new Set<string>([
  CPLDomain.ATTITUDE,
  CPLDomain.KNOWLEDGE,
  CPLDomain.GENERAL_SKILL,
  CPLDomain.SPECIFIC_SKILL,
]);

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

    const mappings = await prisma.courseCPL.findMany({
      where: { courseId: course.id },
      orderBy: { cpl: { code: "asc" } },
      select: {
        id: true,
        cpl: {
          select: {
            id: true,
            code: true,
            statement: true,
            domain: true,
          },
        },
      },
    });

    const data = mappings.map((item) => ({
      mappingId: item.id,
      id: item.cpl.id,
      code: item.cpl.code,
      statement: item.cpl.statement,
      domain: item.cpl.domain,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET course CPL error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat CPL." },
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
      domain?: unknown;
    };

    const code = cleanText(body.code).toUpperCase();
    const statement = cleanText(body.statement);
    const domainRaw = cleanText(body.domain).toUpperCase();

    if (code.length < 2) {
      return NextResponse.json(
        { success: false, message: "Kode CPL minimal 2 karakter." },
        { status: 400 },
      );
    }
    if (statement.length < 5) {
      return NextResponse.json(
        { success: false, message: "Rumusan CPL minimal 5 karakter." },
        { status: 400 },
      );
    }
    if (!VALID_DOMAINS.has(domainRaw)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Domain CPL tidak valid (ATTITUDE, KNOWLEDGE, GENERAL_SKILL, SPECIFIC_SKILL).",
        },
        { status: 400 },
      );
    }
    const domain = domainRaw as CPLDomain;

    // CPL bersifat global (kode unik). Buat jika belum ada, atau pakai yang ada.
    const cpl = await prisma.cPL.upsert({
      where: { code },
      update: { statement, domain },
      create: { code, statement, domain },
      select: { id: true, code: true, statement: true, domain: true },
    });

    const existingMapping = await prisma.courseCPL.findUnique({
      where: { courseId_cplId: { courseId: course.id, cplId: cpl.id } },
      select: { id: true },
    });

    if (existingMapping) {
      return NextResponse.json(
        {
          success: false,
          message: "CPL dengan kode tersebut sudah terhubung ke mata kuliah.",
        },
        { status: 409 },
      );
    }

    const mapping = await prisma.courseCPL.create({
      data: { courseId: course.id, cplId: cpl.id },
      select: { id: true },
    });

    return NextResponse.json(
      {
        success: true,
        message: "CPL berhasil ditambahkan.",
        data: {
          mappingId: mapping.id,
          id: cpl.id,
          code: cpl.code,
          statement: cpl.statement,
          domain: cpl.domain,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST course CPL error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menambahkan CPL." },
      { status: 500 },
    );
  }
}
