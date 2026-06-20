/** @format */

import { z } from "zod";
import { DEFAULT_OPENAI_MODEL, getOpenAIClient } from "@/lib/ai/openai";

/**
 * Batas jumlah karakter materi yang dikirim ke model agar tetap dalam
 * jendela konteks dan hemat token. Materi yang lebih panjang dipotong.
 */
export const MAX_MATERIAL_CHARS = 12000;

export type StudyKitInput = {
  courseTitle: string;
  materialTitle: string;
  materialText: string;
};

const flashcardSchema = z.object({
  istilah: z.string(),
  penjelasan: z.string(),
});

const quizQuestionSchema = z.object({
  pertanyaan: z.string(),
  pilihan: z.array(z.string()).min(2).max(5),
  indeksJawaban: z.number().int().min(0),
  pembahasan: z.string(),
});

const studyKitSchema = z.object({
  ringkasan: z.string(),
  poinUtama: z.array(z.string()),
  flashcards: z.array(flashcardSchema),
  kuis: z.array(quizQuestionSchema),
});

/** Skema konten bahan belajar (dipakai juga saat menyimpan dari dosen). */
export const studyKitContentSchema = studyKitSchema;

export type StudyKitFlashcard = z.infer<typeof flashcardSchema>;
export type StudyKitQuizQuestion = z.infer<typeof quizQuestionSchema>;
export type StudyKit = z.infer<typeof studyKitSchema>;

export type StudyKitResult = {
  kit: StudyKit;
  promptText: string;
  rawResponse: string;
  modelName: string;
  inputTokens: number | null;
  outputTokens: number | null;
  truncated: boolean;
};

const SYSTEM_PROMPT = `Anda adalah asisten dosen untuk mata kuliah "Pembelajaran PKn SD" (pendidikan kewarganegaraan untuk calon guru SD).
Tugas Anda menyusun DRAF bahan belajar dari materi yang diberikan dosen. Draf ini akan ditinjau dan disunting dosen sebelum dipakai mahasiswa.

Aturan penting:
- Gunakan Bahasa Indonesia yang jelas, ramah, dan sesuai untuk calon guru SD.
- Buat HANYA berdasarkan isi materi yang diberikan. JANGAN mengarang fakta di luar materi.
- Ringkasan: 3-5 kalimat yang menangkap inti materi.
- Poin utama: 4-7 butir gagasan terpenting.
- Flashcard: 5-8 kartu berisi istilah/konsep penting beserta penjelasan singkat.
- Kuis: 5 soal pilihan ganda dengan 4 pilihan jawaban. "indeksJawaban" adalah indeks (mulai 0) dari pilihan yang benar. Sertakan pembahasan singkat tiap soal.
- Pastikan jawaban benar memang ada di dalam daftar pilihan.

Balas HANYA dalam format JSON valid dengan struktur:
{
  "ringkasan": "ringkasan 3-5 kalimat",
  "poinUtama": ["poin 1", "poin 2", "..."],
  "flashcards": [{"istilah": "...", "penjelasan": "..."}],
  "kuis": [{"pertanyaan": "...", "pilihan": ["a","b","c","d"], "indeksJawaban": 0, "pembahasan": "..."}]
}`;

function buildUserPrompt(input: StudyKitInput, materialText: string): string {
  return [
    `Mata kuliah: ${input.courseTitle}`,
    `Judul materi: ${input.materialTitle}`,
    "",
    "=== Isi Materi ===",
    materialText,
    "",
    "Susun draf bahan belajar dari materi di atas sesuai format JSON yang diminta.",
  ].join("\n");
}

/**
 * Memanggil model AI untuk membuat draf bahan belajar (ringkasan, flashcard,
 * kuis) dari teks materi. Hasil ditujukan untuk ditinjau dosen (human-in-the-loop).
 */
export async function generateMaterialStudyKit(
  input: StudyKitInput,
): Promise<StudyKitResult> {
  const client = getOpenAIClient();

  const truncated = input.materialText.length > MAX_MATERIAL_CHARS;
  const materialText = truncated
    ? input.materialText.slice(0, MAX_MATERIAL_CHARS)
    : input.materialText;

  const promptText = buildUserPrompt(input, materialText);

  const completion = await client.chat.completions.create({
    model: DEFAULT_OPENAI_MODEL,
    temperature: 0.4,
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

  const parsed = studyKitSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("Struktur bahan belajar AI tidak sesuai");
  }

  // Buang soal yang indeks jawabannya di luar jumlah pilihan.
  const kit: StudyKit = {
    ...parsed.data,
    kuis: parsed.data.kuis.filter(
      (q) => q.indeksJawaban >= 0 && q.indeksJawaban < q.pilihan.length,
    ),
  };

  return {
    kit,
    promptText,
    rawResponse,
    modelName: completion.model || DEFAULT_OPENAI_MODEL,
    inputTokens: completion.usage?.prompt_tokens ?? null,
    outputTokens: completion.usage?.completion_tokens ?? null,
    truncated,
  };
}
