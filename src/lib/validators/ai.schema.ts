/** @format */

import { z } from "zod";

export const cerAiFeedbackSchema = z
  .object({
    claim: z.string().trim().max(5000).optional().default(""),
    evidence: z.string().trim().max(5000).optional().default(""),
    reasoning: z.string().trim().max(5000).optional().default(""),
  })
  .refine(
    (data) =>
      data.claim.length > 0 ||
      data.evidence.length > 0 ||
      data.reasoning.length > 0,
    {
      message: "Isi minimal salah satu bagian (klaim, bukti, atau penalaran)",
      path: ["claim"],
    },
  );

export type CerAiFeedbackInput = z.infer<typeof cerAiFeedbackSchema>;

export const forumDeliberationSchema = z.object({
  draft: z.string().trim().max(5000).optional().default(""),
});

export type ForumDeliberationRequest = z.infer<typeof forumDeliberationSchema>;
