/** @format */

import { z } from "zod";
import { DEFAULT_OPENAI_MODEL, getOpenAIClient } from "@/lib/ai/openai";

/**
 * Batas karakter konteks materi yang dikirim ke model agar hemat token.
 */
export const MAX_GRADER_MATERIAL_CHARS = 8000;

export type GradeQuizAnswerInput = {
  courseTitle: string;
  /** Teks materi PDF sumber kuis (acuan utama penilaian). */
  materialText?: string | null;
  questionText: string;
  /** Jawaban acuan / kunci dari dosen (opsional). */
  referenceAnswer?: string | null;
  /** Kriteria penilaian / rubrik singkat dari dosen (opsional). */
  gradingCriteria?: string | null;
  /** Poin maksimum soal ini. */
  maxPoints: number;
  studentAnswer: string;
};

const graderSchema = z.object({
  skorPersen: z.number(),
  benar: z.boolean(),
  umpanBalik: z.string(),
});

export type QuizAnswerGrade = {
  /** Persentase ketepatan 0-100. */
  scorePercent: number;
  /** Apakah jawaban dianggap benar/memadai. */
  isCorrect: boolean;
  /** Poin yang diperoleh (0..maxPoints). */
  earnedPoints: number;
  feedback: string;
};

export type QuizAnswerGradeResult = {
  grade: QuizAnswerGrade;
  promptText: string;
  rawResponse: string;
  modelName: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

const SYSTEM_PROMPT = `Anda adalah asisten penilai untuk dosen mata kuliah "Pembelajaran PKn SD".
Tugas Anda menilai jawaban esai/jawaban singkat mahasiswa secara objektif.

Aturan penting:
- Gunakan Bahasa Indonesia yang jelas, profesional, dan membangun.
- Nilai HANYA berdasarkan materi sumber, jawaban acuan, dan kriteria penilaian yang diberikan dosen.
- Jika tersedia kriteria penilaian, jadikan acuan utama. Jika tidak, nilai dari ketepatan, kelengkapan, dan relevansi terhadap materi.
- "skorPersen" adalah angka 0-100 yang mencerminkan kualitas jawaban.
- "benar" bernilai true jika jawaban sudah memadai (umumnya skorPersen >= 60), selain itu false.
- "umpanBalik" adalah 1-3 kalimat umpan balik untuk mahasiswa: sebutkan kekuatan dan apa yang perlu diperbaiki, TANPA menuliskan jawaban lengkap yang benar.
- Jika jawaban kosong atau tidak relevan, beri skorPersen rendah dan jelaskan dengan sopan.

Balas HANYA dalam format JSON valid dengan struktur:
{
  "skorPersen": 0-100,
  "benar": true/false,
  "umpanBalik": "umpan balik singkat"
}`;

function buildUserPrompt(input: GradeQuizAnswerInput, materialText: string) {
  return [
    `Mata kuliah: ${input.courseTitle}`,
    `Pertanyaan: ${input.questionText}`,
    input.referenceAnswer
      ? `Jawaban acuan dosen: ${input.referenceAnswer}`
      : null,
    input.gradingCriteria
      ? `Kriteria penilaian: ${input.gradingCriteria}`
      : null,
    materialText ? `\n=== Materi Sumber ===\n${materialText}` : null,
    "",
    "=== Jawaban Mahasiswa ===",
    input.studentAnswer.trim().length > 0
      ? input.studentAnswer
      : "(tidak ada jawaban)",
    "",
    "Beri penilaian sesuai format JSON yang diminta.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Menilai satu jawaban esai/jawaban singkat memakai materi PDF + rubrik.
 * Mengembalikan skor, poin, dan umpan balik + metadata untuk AIResponseLog.
 */
export async function gradeQuizTextAnswer(
  input: GradeQuizAnswerInput,
): Promise<QuizAnswerGradeResult> {
  const client = getOpenAIClient();

  const materialText = (input.materialText ?? "").slice(
    0,
    MAX_GRADER_MATERIAL_CHARS,
  );
  const promptText = buildUserPrompt(input, materialText);

  const completion = await client.chat.completions.create({
    model: DEFAULT_OPENAI_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: promptText },
    ],
  });

  const rawResponse = completion.choices[0]?.message?.content?.trim() ?? "";

  if (!rawResponse) {
    throw new Error("Model tidak mengembalikan respons");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawResponse);
  } catch {
    throw new Error("Respons AI bukan JSON yang valid");
  }

  const parsed = graderSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("Struktur penilaian AI tidak sesuai");
  }

  const scorePercent = clampPercent(parsed.data.skorPersen);
  const maxPoints = Math.max(0, input.maxPoints);
  const earnedPoints = Math.round((scorePercent / 100) * maxPoints * 100) / 100;

  return {
    grade: {
      scorePercent,
      isCorrect: parsed.data.benar,
      earnedPoints,
      feedback: parsed.data.umpanBalik.trim(),
    },
    promptText,
    rawResponse,
    modelName: completion.model || DEFAULT_OPENAI_MODEL,
    inputTokens: completion.usage?.prompt_tokens ?? null,
    outputTokens: completion.usage?.completion_tokens ?? null,
  };
}
