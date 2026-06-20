/** @format */

import { z } from "zod";
import { DEFAULT_OPENAI_MODEL, getOpenAIClient } from "@/lib/ai/openai";

export type CerGradingAssistInput = {
  assignmentTitle: string;
  prompt: string;
  claimQuestion?: string | null;
  evidenceQuestion?: string | null;
  reasoningQuestion?: string | null;
  rubric?: string | null;
  claim: string;
  evidence: string;
  reasoning: string;
};

const componentSchema = z.object({
  nama: z.string(),
  skor: z.number(),
  catatan: z.string(),
});

const assistSchema = z.object({
  nilaiSaran: z.number(),
  ringkasan: z.string(),
  komponen: z.array(componentSchema),
  masukanUntukMahasiswa: z.string(),
});

export type CerGradingAssist = z.infer<typeof assistSchema>;

export type CerGradingAssistResult = {
  assist: CerGradingAssist;
  promptText: string;
  rawResponse: string;
  modelName: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

const SYSTEM_PROMPT = `Anda adalah asisten penilai untuk dosen mata kuliah "Pembelajaran PKn SD".
Tugas Anda membantu DOSEN menilai jawaban mahasiswa berbentuk CER (Claim-Evidence-Reasoning).

Aturan penting:
- Gunakan Bahasa Indonesia yang jelas, profesional, dan objektif.
- Anda HANYA memberi SARAN. Keputusan akhir tetap pada dosen.
- Berikan saran nilai 0–100 yang adil berdasarkan kualitas klaim, relevansi bukti, dan ketajaman penalaran.
- Jika tersedia rubrik, gunakan rubrik itu sebagai acuan utama penilaian.
- Untuk tiap komponen (Klaim, Bukti, Penalaran), beri skor 0–100 dan catatan singkat alasannya.
- Tulis "masukanUntukMahasiswa" sebagai paragraf umpan balik yang membangun, siap dipakai dosen, menyebut kekuatan dan hal yang perlu diperbaiki TANPA menuliskan jawaban yang benar untuk mahasiswa.
- Jika sebuah komponen kosong atau sangat lemah, beri skor rendah dan jelaskan apa yang kurang.

Balas HANYA dalam format JSON valid dengan struktur:
{
  "nilaiSaran": 0-100,
  "ringkasan": "ringkasan 1-2 kalimat tentang kualitas keseluruhan",
  "komponen": [
    { "nama": "Klaim", "skor": 0-100, "catatan": "..." },
    { "nama": "Bukti", "skor": 0-100, "catatan": "..." },
    { "nama": "Penalaran", "skor": 0-100, "catatan": "..." }
  ],
  "masukanUntukMahasiswa": "paragraf masukan yang siap dipakai"
}`;

function buildUserPrompt(input: CerGradingAssistInput): string {
  return [
    `Judul tugas: ${input.assignmentTitle}`,
    `Prompt/kasus tugas: ${input.prompt}`,
    input.claimQuestion ? `Pertanyaan Klaim: ${input.claimQuestion}` : null,
    input.evidenceQuestion
      ? `Pertanyaan Bukti: ${input.evidenceQuestion}`
      : null,
    input.reasoningQuestion
      ? `Pertanyaan Penalaran: ${input.reasoningQuestion}`
      : null,
    input.rubric ? `Rubrik penilaian: ${input.rubric}` : null,
    "",
    "=== Jawaban Mahasiswa ===",
    `Klaim: ${input.claim || "(kosong)"}`,
    `Bukti: ${input.evidence || "(kosong)"}`,
    `Penalaran: ${input.reasoning || "(kosong)"}`,
    "",
    "Beri saran penilaian sesuai format JSON yang diminta.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Memanggil OpenAI untuk menghasilkan saran penilaian CER bagi dosen.
 * Mengembalikan saran terstruktur + metadata untuk dicatat ke AIResponseLog.
 */
export async function generateCerGradingAssist(
  input: CerGradingAssistInput,
): Promise<CerGradingAssistResult> {
  const client = getOpenAIClient();
  const promptText = buildUserPrompt(input);

  const completion = await client.chat.completions.create({
    model: DEFAULT_OPENAI_MODEL,
    temperature: 0.3,
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

  const parsed = assistSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("Struktur saran penilaian AI tidak sesuai");
  }

  const assist: CerGradingAssist = {
    ...parsed.data,
    nilaiSaran: clampScore(parsed.data.nilaiSaran),
    komponen: parsed.data.komponen.map((item) => ({
      ...item,
      skor: clampScore(item.skor),
    })),
  };

  return {
    assist,
    promptText,
    rawResponse,
    modelName: completion.model || DEFAULT_OPENAI_MODEL,
    inputTokens: completion.usage?.prompt_tokens ?? null,
    outputTokens: completion.usage?.completion_tokens ?? null,
  };
}
