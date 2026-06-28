/** @format */

import { UnitType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ModuleLearningContent } from "@/lib/validators/module-content.schema";
import {
  moduleContentHasBody,
  moduleContentSummary,
  moduleLearningContentToMarkdown,
} from "@/lib/materials/module-content-format";

/** Slug khusus untuk unit "Materi Pembelajaran" yang dibuat otomatis dari konten modul. */
export const MODULE_CONTENT_UNIT_SLUG = "materi-modul";

/**
 * Menjaga agar setiap modul yang memiliki konten belajar selalu punya minimal
 * satu MicroUnit ("bagian") sehingga progres mahasiswa tidak pernah 0/0.
 *
 * - Bila konten berisi: buat/perbarui unit "Materi Pembelajaran" dari konten.
 * - Bila konten kosong: hapus unit otomatis tersebut bila ada.
 *
 * Unit dikenali lewat slug khusus {@link MODULE_CONTENT_UNIT_SLUG} sehingga
 * tidak mengganggu bagian lain yang dibuat dosen secara manual.
 */
export async function syncModuleContentUnit(
  moduleId: string,
  moduleTitle: string,
  content: ModuleLearningContent,
): Promise<void> {
  const existing = await prisma.microUnit.findUnique({
    where: {
      moduleId_slug: { moduleId, slug: MODULE_CONTENT_UNIT_SLUG },
    },
    select: { id: true },
  });

  if (!moduleContentHasBody(content)) {
    if (existing) {
      await prisma.microUnit.delete({ where: { id: existing.id } });
    }
    return;
  }

  const markdown = moduleLearningContentToMarkdown(content, moduleTitle);
  const summary = moduleContentSummary(content);

  if (existing) {
    await prisma.microUnit.update({
      where: { id: existing.id },
      data: {
        title: "Materi Pembelajaran",
        description: summary || null,
        content: markdown,
        unitType: UnitType.LESSON,
      },
    });
    return;
  }

  const lastUnit = await prisma.microUnit.findFirst({
    where: { moduleId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await prisma.microUnit.create({
    data: {
      moduleId,
      title: "Materi Pembelajaran",
      slug: MODULE_CONTENT_UNIT_SLUG,
      description: summary || null,
      content: markdown,
      unitType: UnitType.LESSON,
      order: (lastUnit?.order ?? 0) + 1,
      isRequired: true,
    },
  });
}
