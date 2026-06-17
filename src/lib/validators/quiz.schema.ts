/** @format */

import { z } from "zod";

export const quizQuestionTypes = ["MULTIPLE_CHOICE", "TRUE_FALSE"] as const;

const quizOptionInput = z.object({
  optionText: z
    .string()
    .trim()
    .min(1, "Teks opsi wajib diisi")
    .max(500, "Maksimal 500 karakter"),
  isCorrect: z.boolean().default(false),
});

const quizQuestionInput = z
  .object({
    questionText: z
      .string()
      .trim()
      .min(1, "Pertanyaan wajib diisi")
      .max(2000, "Maksimal 2000 karakter"),
    questionType: z.enum(quizQuestionTypes).default("MULTIPLE_CHOICE"),
    explanation: z
      .string()
      .trim()
      .max(2000, "Maksimal 2000 karakter")
      .optional()
      .default(""),
    points: z
      .number({ message: "Poin harus berupa angka" })
      .min(0.5, "Poin minimal 0.5")
      .max(100, "Poin maksimal 100")
      .default(1),
    options: z
      .array(quizOptionInput)
      .min(2, "Minimal 2 opsi jawaban")
      .max(6, "Maksimal 6 opsi jawaban"),
  })
  .superRefine((value, ctx) => {
    const correctCount = value.options.filter((o) => o.isCorrect).length;

    if (correctCount === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Tandai minimal satu opsi sebagai jawaban benar",
      });
    }

    if (value.questionType === "TRUE_FALSE" && value.options.length !== 2) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Tipe Benar/Salah harus memiliki tepat 2 opsi",
      });
    }
  });

const quizMeta = {
  title: z
    .string()
    .trim()
    .min(1, "Judul kuis wajib diisi")
    .max(200, "Maksimal 200 karakter"),
  description: z
    .string()
    .trim()
    .max(2000, "Maksimal 2000 karakter")
    .optional()
    .default(""),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  timeLimitMinutes: z
    .number({ message: "Batas waktu harus berupa angka" })
    .int("Batas waktu harus bilangan bulat")
    .min(1, "Minimal 1 menit")
    .max(600, "Maksimal 600 menit")
    .nullable()
    .optional(),
  passingScore: z
    .number({ message: "Nilai lulus harus berupa angka" })
    .min(0, "Minimal 0")
    .max(100, "Maksimal 100")
    .default(75),
  showScoreToStudent: z.boolean().default(true),
};

export const quizCreateSchema = z.object({
  moduleId: z.string().min(1, "Modul wajib dipilih"),
  ...quizMeta,
});

export type QuizCreateInput = z.infer<typeof quizCreateSchema>;

export const quizUpdateSchema = z.object({
  ...quizMeta,
  questions: z.array(quizQuestionInput).optional(),
});

export type QuizUpdateInput = z.infer<typeof quizUpdateSchema>;

export const quizAttemptSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        selectedOptionId: z.string().min(1).nullable(),
      }),
    )
    .min(1, "Tidak ada jawaban yang dikirim"),
});

export type QuizAttemptInput = z.infer<typeof quizAttemptSchema>;
