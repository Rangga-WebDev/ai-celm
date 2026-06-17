/** @format */

import { z } from "zod";

const richText = z.string().trim().max(5000, "Maksimal 5000 karakter");

const optionalUrl = z
  .string()
  .trim()
  .max(2000, "Tautan terlalu panjang")
  .refine(
    (value) => value.length === 0 || /^https?:\/\/.+/i.test(value),
    "Tautan harus diawali http:// atau https://",
  )
  .optional()
  .default("");

export const projectSubmissionSchema = z
  .object({
    title: z
      .string()
      .trim()
      .max(200, "Maksimal 200 karakter")
      .optional()
      .default(""),
    summary: richText.optional().default(""),
    artifactUrl: optionalUrl,
    reflection: richText.optional().default(""),
    action: z.enum(["SAVE_DRAFT", "SUBMIT"]),
  })
  .superRefine((value, ctx) => {
    if (value.action !== "SUBMIT") {
      return;
    }

    if (value.title.trim().length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["title"],
        message: "Judul wajib diisi sebelum mengumpulkan",
      });
    }

    if (value.summary.trim().length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["summary"],
        message: "Ringkasan proyek wajib diisi sebelum mengumpulkan",
      });
    }
  });

export type ProjectSubmissionInput = z.infer<typeof projectSubmissionSchema>;

export const projectGradeSchema = z
  .object({
    score: z
      .number({ message: "Nilai harus berupa angka" })
      .min(0, "Nilai minimal 0")
      .max(100, "Nilai maksimal 100")
      .nullable()
      .optional(),
    feedback: z
      .string()
      .trim()
      .max(5000, "Maksimal 5000 karakter")
      .optional()
      .default(""),
    action: z.enum(["SAVE_REVIEW", "REQUEST_REVISION"]),
  })
  .superRefine((value, ctx) => {
    if (
      value.action === "SAVE_REVIEW" &&
      (value.score === null || value.score === undefined)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["score"],
        message: "Nilai wajib diisi untuk menyelesaikan penilaian",
      });
    }
  });

export type ProjectGradeInput = z.infer<typeof projectGradeSchema>;
