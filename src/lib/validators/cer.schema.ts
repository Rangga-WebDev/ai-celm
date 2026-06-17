/** @format */

import { z } from "zod";

const richText = z.string().trim().max(5000, "Maksimal 5000 karakter");

export const cerSubmissionSchema = z
  .object({
    claim: richText.optional().default(""),
    evidence: richText.optional().default(""),
    reasoning: richText.optional().default(""),
    action: z.enum(["SAVE_DRAFT", "SUBMIT"]),
  })
  .superRefine((value, ctx) => {
    if (value.action !== "SUBMIT") {
      return;
    }

    const fields: Array<["claim" | "evidence" | "reasoning", string]> = [
      ["claim", value.claim],
      ["evidence", value.evidence],
      ["reasoning", value.reasoning],
    ];

    for (const [field, content] of fields) {
      if (content.trim().length === 0) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: "Wajib diisi sebelum mengumpulkan",
        });
      }
    }
  });

export type CerSubmissionInput = z.infer<typeof cerSubmissionSchema>;

export const cerGradeSchema = z
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

export type CerGradeInput = z.infer<typeof cerGradeSchema>;
