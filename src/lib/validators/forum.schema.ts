/** @format */

import { z } from "zod";

export const discussionPostSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Isi tidak boleh kosong")
    .max(5000, "Maksimal 5000 karakter"),
  parentId: z.string().trim().min(1).nullable().optional(),
});

export type DiscussionPostInput = z.infer<typeof discussionPostSchema>;
