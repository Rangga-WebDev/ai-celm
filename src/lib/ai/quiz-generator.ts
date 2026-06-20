/** @format */

import { z } from "zod";
import { DEFAULT_OPENAI_MODEL, getOpenAIClient } from "@/lib/ai/openai";

/**
 * Batas karakter materi yang dikirim ke model agar hemat token dan tetap
 * dalam jendela konteks. Materi lebih panjang dipotong.
 */
export const MAX_QUIZ_MATERIAL_CHARS = 12000;

export const MIN_QUIZ_QUESTIONS = 3;
export const MAX_QUIZ_QUESTIONS = 15;

export type QuizGeneratorInput = {
  courseTitle: string;
  materialTitle: string;
  materialText: string;
  questionCount: number;
};

const generatedQuestionSchema = z.object({
  pertanyaan: z.string(),
  pilihan: z.array(z.string()).min(2).max(5),
  indeksJawaban: z.number().int().min(0),
  pembahasan: z.string(),
});

const quizGenerationSchema = z.object({
  soal: z.array(generatedQuestionSchema),
});

export type GeneratedQuizQuestion = {
  questionText: string;
  questionType: "MULTIPLE_CHOICE";
  explanation: string;
  points: number;
  options: Array<{ optionText: string; isCorrect: boolean }>;
};

export type QuizGeneratorResult = {
  questions: GeneratedQuizQuestion[];
  promptText: string;
  rawResponse: string;
  modelName: string;
  inputTokens: number | null;
  outputTokens: number | null;
  truncated: boolean;
};

function buildSystemPrompt(questionCount: number): string {
  return `Anda adalah asisten dosen untuk mata kuliah "Pembelajaran PKn SD" (pendidikan kewarganegaraan untuk calon guru SD).
Tugas Anda menyusun DRAF soal kuis pilihan ganda dari materi yang diberikan dosen. Draf ini akan ditinjau dan disunting dosen sebelum diterbitkan ke mahasiswa.

Aturan penting:
- Gunakan Bahasa Indonesia yang jelas dan sesuai untuk calon guru SD.
- Buat TEPAT ${questionCount} soal pilihan ganda.
- Buat soal HANYA berdasarkan isi materi yang diberikan. JANGAN mengarang fakta di luar materi.
- Setiap soal punya 4 pilihan jawaban yang masuk akal (pengecoh tidak asal-asalan).
- "indeksJawaban" adalah indeks (mulai 0) dari pilihan yang BENAR. Pastikan hanya satu jawaban benar dan benar-benar ada di daftar pilihan.
- Variasikan tingkat kesulitan (ingatan, pemahaman, penerapan).
- Sertakan pembahasan singkat yang menjelaskan mengapa jawaban benar.

Balas HANYA dalam format JSON valid dengan struktur:
{
  "soal": [
    {
      "pertanyaan": "teks pertanyaan",
      "pilihan": ["pilihan A", "pilihan B", "pilihan C", "pilihan D"],
      "indeksJawaban": 0,
      "pembahasan": "penjelasan singkat jawaban benar"
    }
  ]
}`;
}

function buildUserPrompt(
  input: QuizGeneratorInput,
  materialText: string,
): string {
  return [
    `Mata kuliah: ${input.courseTitle}`,
    `Judul materi: ${input.materialTitle}`,
    `Jumlah soal diminta: ${input.questionCount}`,
    "",
    "=== Isi Materi ===",
    materialText,
  ].join("\n");
}

/**
 * Memanggil OpenAI untuk menghasilkan draf soal kuis pilihan ganda dari materi.
 * Mengembalikan soal dalam bentuk siap simpan ke model Quiz + metadata log.
 */
export async function generateQuizFromMaterial(
  input: QuizGeneratorInput,
): Promise<QuizGeneratorResult> {
  const client = getOpenAIClient();

  const truncated = input.materialText.length > MAX_QUIZ_MATERIAL_CHARS;
  const materialText = truncated
    ? input.materialText.slice(0, MAX_QUIZ_MATERIAL_CHARS)
    : input.materialText;

  const questionCount = Math.min(
    MAX_QUIZ_QUESTIONS,
    Math.max(MIN_QUIZ_QUESTIONS, Math.round(input.questionCount)),
  );

  const systemPrompt = buildSystemPrompt(questionCount);
  const promptText = buildUserPrompt({ ...input, questionCount }, materialText);

  const completion = await client.chat.completions.create({
    model: DEFAULT_OPENAI_MODEL,
    temperature: 0.5,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
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

  const parsed = quizGenerationSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("Struktur soal AI tidak sesuai");
  }

  // Hanya simpan soal yang indeks jawabannya valid terhadap daftar pilihan.
  const questions: GeneratedQuizQuestion[] = parsed.data.soal
    .filter(
      (item) =>
        item.indeksJawaban >= 0 && item.indeksJawaban < item.pilihan.length,
    )
    .map((item) => ({
      questionText: item.pertanyaan.trim(),
      questionType: "MULTIPLE_CHOICE" as const,
      explanation: item.pembahasan.trim(),
      points: 1,
      options: item.pilihan.map((text, index) => ({
        optionText: text.trim(),
        isCorrect: index === item.indeksJawaban,
      })),
    }))
    .filter(
      (question) =>
        question.questionText.length > 0 &&
        question.options.every((option) => option.optionText.length > 0),
    );

  if (questions.length === 0) {
    throw new Error("AI tidak menghasilkan soal yang valid");
  }

  return {
    questions,
    promptText,
    rawResponse,
    modelName: completion.model || DEFAULT_OPENAI_MODEL,
    inputTokens: completion.usage?.prompt_tokens ?? null,
    outputTokens: completion.usage?.completion_tokens ?? null,
    truncated,
  };
}
