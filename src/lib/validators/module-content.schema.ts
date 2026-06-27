/** @format */

import { z } from "zod";

/**
 * Skema konten belajar modul yang mengikuti struktur modul ajar:
 *  I.   Pendahuluan (skenario awal)
 *  II.  Kegiatan Belajar (inti materi)
 *  III. Evaluasi & Tindak Lanjut (asesmen)
 *  IV.  Bagian Pendukung (glosarium, pustaka, pengayaan)
 */

export const moduleIntroductionSchema = z.object({
  learningOutcomes: z.array(z.string().trim().min(1)).default([]),
  description: z.string().trim().default(""),
  prerequisites: z.string().trim().default(""),
  usageGuide: z.string().trim().default(""),
});

export const moduleActivitySchema = z.object({
  title: z.string().trim().default(""),
  content: z.string().trim().default(""),
  caseStudy: z.string().trim().default(""),
  reflectionPrompts: z.array(z.string().trim().min(1)).default([]),
  summary: z.string().trim().default(""),
});

export const moduleFormativeQuestionSchema = z.object({
  question: z.string().trim().default(""),
  answer: z.string().trim().default(""),
});

export const moduleAssessmentSchema = z.object({
  assignment: z.string().trim().default(""),
  rubric: z.string().trim().default(""),
  formativeQuestions: z.array(moduleFormativeQuestionSchema).default([]),
  masteryRule: z.string().trim().default(""),
});

export const moduleGlossaryItemSchema = z.object({
  term: z.string().trim().default(""),
  definition: z.string().trim().default(""),
});

export const moduleFurtherReadingSchema = z.object({
  label: z.string().trim().default(""),
  url: z.string().trim().default(""),
});

export const moduleSupportSchema = z.object({
  glossary: z.array(moduleGlossaryItemSchema).default([]),
  references: z.array(z.string().trim().min(1)).default([]),
  furtherReading: z.array(moduleFurtherReadingSchema).default([]),
});

export const moduleLearningContentSchema = z.object({
  introduction: moduleIntroductionSchema.default({
    learningOutcomes: [],
    description: "",
    prerequisites: "",
    usageGuide: "",
  }),
  activities: z.array(moduleActivitySchema).default([]),
  assessment: moduleAssessmentSchema.default({
    assignment: "",
    rubric: "",
    formativeQuestions: [],
    masteryRule: "",
  }),
  support: moduleSupportSchema.default({
    glossary: [],
    references: [],
    furtherReading: [],
  }),
});

export type ModuleLearningContent = z.infer<typeof moduleLearningContentSchema>;
export type ModuleActivity = z.infer<typeof moduleActivitySchema>;

export function emptyModuleLearningContent(): ModuleLearningContent {
  return {
    introduction: {
      learningOutcomes: [],
      description: "",
      prerequisites: "",
      usageGuide: "",
    },
    activities: [],
    assessment: {
      assignment: "",
      rubric: "",
      formativeQuestions: [],
      masteryRule: "",
    },
    support: {
      glossary: [],
      references: [],
      furtherReading: [],
    },
  };
}

/**
 * Mengubah nilai apa pun (mis. JSON dari database) menjadi konten yang valid.
 * Bila parsing gagal, kembalikan struktur kosong agar UI tetap aman.
 */
export function normalizeModuleLearningContent(
  value: unknown,
): ModuleLearningContent {
  const parsed = moduleLearningContentSchema.safeParse(value ?? {});
  if (parsed.success) {
    return parsed.data;
  }
  return emptyModuleLearningContent();
}
