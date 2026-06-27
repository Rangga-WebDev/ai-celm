/** @format */

import { describe, it, expect } from "vitest";
import {
  isChoiceQuestionType,
  isTextQuestionType,
  quizCreateSchema,
  quizUpdateSchema,
} from "./quiz.schema";

describe("isChoiceQuestionType", () => {
  it("mengenali tipe soal berbasis pilihan", () => {
    expect(isChoiceQuestionType("MULTIPLE_CHOICE")).toBe(true);
    expect(isChoiceQuestionType("TRUE_FALSE")).toBe(true);
  });

  it("menolak tipe soal teks", () => {
    expect(isChoiceQuestionType("SHORT_ANSWER")).toBe(false);
    expect(isChoiceQuestionType("ESSAY")).toBe(false);
    expect(isChoiceQuestionType("UNKNOWN")).toBe(false);
  });
});

describe("isTextQuestionType", () => {
  it("mengenali tipe soal teks bebas", () => {
    expect(isTextQuestionType("SHORT_ANSWER")).toBe(true);
    expect(isTextQuestionType("ESSAY")).toBe(true);
  });

  it("menolak tipe soal pilihan", () => {
    expect(isTextQuestionType("MULTIPLE_CHOICE")).toBe(false);
    expect(isTextQuestionType("TRUE_FALSE")).toBe(false);
  });
});

describe("quizCreateSchema", () => {
  it("menerima payload minimal dengan default", () => {
    const result = quizCreateSchema.safeParse({
      moduleId: "mod-1",
      title: "Kuis Pancasila",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("DRAFT");
      expect(result.data.passingScore).toBe(75);
      expect(result.data.showScoreToStudent).toBe(true);
    }
  });

  it("menolak tanpa moduleId", () => {
    const result = quizCreateSchema.safeParse({ title: "Kuis" });
    expect(result.success).toBe(false);
  });

  it("menolak judul kosong", () => {
    const result = quizCreateSchema.safeParse({
      moduleId: "mod-1",
      title: "   ",
    });
    expect(result.success).toBe(false);
  });
});

describe("quizUpdateSchema (validasi soal)", () => {
  it("menolak soal pilihan dengan kurang dari 2 opsi", () => {
    const result = quizUpdateSchema.safeParse({
      title: "Kuis",
      questions: [
        {
          questionText: "Apa ibu kota?",
          questionType: "MULTIPLE_CHOICE",
          options: [{ optionText: "Jakarta", isCorrect: true }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("menolak soal pilihan tanpa jawaban benar", () => {
    const result = quizUpdateSchema.safeParse({
      title: "Kuis",
      questions: [
        {
          questionText: "Apa ibu kota?",
          questionType: "MULTIPLE_CHOICE",
          options: [
            { optionText: "Jakarta", isCorrect: false },
            { optionText: "Bandung", isCorrect: false },
          ],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("menerima soal pilihan yang valid", () => {
    const result = quizUpdateSchema.safeParse({
      title: "Kuis",
      questions: [
        {
          questionText: "Apa ibu kota?",
          questionType: "MULTIPLE_CHOICE",
          options: [
            { optionText: "Jakarta", isCorrect: true },
            { optionText: "Bandung", isCorrect: false },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("menolak TRUE_FALSE dengan jumlah opsi bukan 2", () => {
    const result = quizUpdateSchema.safeParse({
      title: "Kuis",
      questions: [
        {
          questionText: "Pancasila dasar negara?",
          questionType: "TRUE_FALSE",
          options: [
            { optionText: "Benar", isCorrect: true },
            { optionText: "Salah", isCorrect: false },
            { optionText: "Ragu", isCorrect: false },
          ],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("menerima soal esai tanpa opsi", () => {
    const result = quizUpdateSchema.safeParse({
      title: "Kuis",
      questions: [
        {
          questionText: "Jelaskan makna sila pertama.",
          questionType: "ESSAY",
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
