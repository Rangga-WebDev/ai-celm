/** @format */

import { NextRequest, NextResponse } from "next/server";
import { Prisma, ProjectStatus, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-guard";

type Params = {
  params: Promise<{
    userId: string;
    slug: string;
  }>;
};

const projectStatusOptions = Object.values(ProjectStatus);

function isValidProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === "string" && projectStatusOptions.includes(value as ProjectStatus);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function optionalText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function parseDate(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function buildRubric({
  objective,
  outputType,
}: {
  objective: string | null;
  outputType: string | null;
}): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!objective && !outputType) return Prisma.JsonNull;
  return { objective, outputType };
}

function readRubricText(rubric: unknown, key: "objective" | "outputType") {
  if (!rubric || typeof rubric !== "object" || Array.isArray(rubric)) return null;
  const record = rubric as Record<string, unknown>;
  return typeof record[key] === "string" ? record[key] : null;
}

function normalizeProject<T extends { brief: string | null; rubric: unknown }>(project: T) {
  return {
    ...project,
    moduleId: null,
    microUnitId: null,
    module: null,
    microUnit: null,
    instruction: project.brief,
    objective: readRubricText(project.rubric, "objective"),
    outputType: readRubricText(project.rubric, "outputType"),
  };
}

async function getOwnedCourse(userId: string, slug: string) {
  return prisma.course.findFirst({
    where: { slug, lecturerId: userId },
    select: {
      id: true,
      title: true,
      slug: true,
      code: true,
      description: true,
      isPublished: true,
    },
  });
}

const projectInclude = {
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  submissions: {
    orderBy: { updatedAt: "desc" as const },
    take: 3,
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  },
  _count: {
    select: { submissions: true },
  },
};

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Lecturer can only access projects from their own courses" },
        { status: 403 },
      );
    }

    const course = await getOwnedCourse(userId, slug);

    if (!course) {
      return NextResponse.json(
        { success: false, message: "Course not found or you are not assigned to this course" },
        { status: 404 },
      );
    }

    const [modules, projects] = await Promise.all([
      prisma.module.findMany({
        where: { courseId: course.id },
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          slug: true,
          order: true,
          status: true,
          units: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, slug: true, order: true, unitType: true, moduleId: true },
          },
        },
      }),
      prisma.civicActionProject.findMany({
        where: { courseId: course.id },
        orderBy: { createdAt: "desc" },
        include: projectInclude,
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        message: "Civic action projects fetched successfully",
        data: {
          course,
          modules,
          projects: projects.map(normalizeProject),
          statuses: projectStatusOptions,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/lecturers/[userId]/courses/[slug]/projects error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch civic action projects",
        detail: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireUser([Role.LECTURER]);
    if (auth.response) return auth.response;

    const { userId, slug } = await params;

    if (auth.user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Lecturer can only create projects for their own courses" },
        { status: 403 },
      );
    }

    const course = await getOwnedCourse(userId, slug);

    if (!course) {
      return NextResponse.json(
        { success: false, message: "Course not found or you are not assigned to this course" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const rawSlug = String(body.slug ?? "").trim();
    const description = optionalText(body.description);
    const instruction = optionalText(body.instruction);
    const objective = optionalText(body.objective);
    const outputType = optionalText(body.outputType);
    const dueAt = parseDate(body.dueAt);
    const status = body.status ?? ProjectStatus.DRAFT;

    if (!title) {
      return NextResponse.json({ success: false, message: "Project title is required" }, { status: 400 });
    }

    if (!isValidProjectStatus(status)) {
      return NextResponse.json({ success: false, message: "Valid project status is required" }, { status: 400 });
    }

    const projectSlug = rawSlug ? slugify(rawSlug) : slugify(title);

    if (!projectSlug) {
      return NextResponse.json({ success: false, message: "Valid project slug is required" }, { status: 400 });
    }

    const existingSlug = await prisma.civicActionProject.findUnique({
      where: { courseId_slug: { courseId: course.id, slug: projectSlug } },
      select: { id: true },
    });

    if (existingSlug) {
      return NextResponse.json({ success: false, message: "Project slug already exists in this course" }, { status: 409 });
    }

    const project = await prisma.civicActionProject.create({
      data: {
        courseId: course.id,
        createdById: userId,
        title,
        slug: projectSlug,
        description,
        brief: instruction,
        rubric: buildRubric({ objective, outputType }),
        dueAt,
        status,
      },
      include: projectInclude,
    });

    return NextResponse.json(
      { success: true, message: "Civic action project created successfully", data: normalizeProject(project) },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/lecturers/[userId]/courses/[slug]/projects error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create civic action project",
        detail: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
