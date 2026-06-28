/** @format */

import { z } from "zod";

export const gradeSourceEnum = z.enum([
  "QUIZ",
  "CER",
  "PROJECT",
  "PARTICIPATION",
  "MANUAL",
]);

export const gradeComponentInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z
    .string()
    .trim()
    .min(1, "Nama komponen wajib diisi")
    .max(120, "Maksimal 120 karakter"),
  source: gradeSourceEnum,
  weight: z
    .number({ message: "Bobot harus berupa angka" })
    .min(0, "Bobot minimal 0")
    .max(100, "Bobot maksimal 100"),
  maxScore: z
    .number({ message: "Skor maksimal harus berupa angka" })
    .min(1, "Skor maksimal minimal 1")
    .max(1000, "Skor maksimal terlalu besar")
    .default(100),
});

export type GradeComponentInput = z.infer<typeof gradeComponentInputSchema>;

export const gradeComponentsPayloadSchema = z
  .object({
    components: z
      .array(gradeComponentInputSchema)
      .max(20, "Maksimal 20 komponen"),
  })
  .superRefine((value, ctx) => {
    const total = value.components.reduce((acc, c) => acc + c.weight, 0);
    if (value.components.length > 0 && Math.round(total) !== 100) {
      ctx.addIssue({
        code: "custom",
        path: ["components"],
        message: `Total bobot harus 100% (saat ini ${Math.round(total)}%)`,
      });
    }
  });

export type GradeComponentsPayload = z.infer<
  typeof gradeComponentsPayloadSchema
>;

export const componentScoreInputSchema = z.object({
  componentId: z.string().min(1, "componentId wajib"),
  studentId: z.string().min(1, "studentId wajib"),
  score: z
    .number({ message: "Nilai harus berupa angka" })
    .min(0, "Nilai minimal 0")
    .max(1000, "Nilai terlalu besar"),
  note: z
    .string()
    .trim()
    .max(500, "Maksimal 500 karakter")
    .optional()
    .default(""),
});

export type ComponentScoreInput = z.infer<typeof componentScoreInputSchema>;

export const finalizeGradesSchema = z.object({
  studentIds: z.array(z.string().min(1)).optional(),
  unfinalize: z.boolean().optional().default(false),
});

export type FinalizeGradesInput = z.infer<typeof finalizeGradesSchema>;
