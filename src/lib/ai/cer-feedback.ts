/** @format */

import { z } from "zod";
import { DEFAULT_OPENAI_MODEL, getOpenAIClient } from "@/lib/ai/openai";

export type CerFeedbackInput = {
  assignmentTitle: string;
  prompt: string;
  claimQuestion?: string | null;
  evidenceQuestion?: string | null;
  reasoningQuestion?: string | null;
  claim: string;
  evidence: string;
  reasoning: string;
};

const componentSchema = z.object({
  nama: z.string(),
  kekuatan: z.string(),
  perbaikan: z.string(),
});

const feedbackSchema = z.object({
  ringkasan: z.string(),
  komponen: z.array(componentSchema),
  langkahBerikutnya: z.array(z.string()),
});

export type CerAiFeedback = z.infer<typeof feedbackSchema>;

export type CerFeedbackResult = {
  feedback: CerAiFeedback;
  promptText: string;
  rawResponse: string;
  modelName: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

const SYSTEM_PROMPT = `Anda adalah asisten pengajar untuk mata kuliah "Pembelajaran PKn SD".
Tugas Anda memberi umpan balik formatif atas jawaban mahasiswa yang berbentuk CER (Claim-Evidence-Reasoning).

Aturan penting:
- Gunakan Bahasa Indonesia yang ramah, jelas, dan membangun.
- JANGAN menuliskan jawaban CER untuk mahasiswa. Beri petunjuk dan pertanyaan pemandu saja.
- Fokus pada kualitas penalaran, relevansi bukti, dan kejelasan klaim.
- Sesuaikan saran dengan konteks pembelajaran PKn untuk calon guru SD.
- Jika sebuah komponen kosong atau sangat lemah, jelaskan apa yang perlu ditambahkan.

Balas HANYA dalam format JSON valid dengan struktur:
{
  "ringkasan": "ringkasan singkat 1-2 kalimat tentang kualitas keseluruhan",
  "komponen": [
    { "nama": "Klaim", "kekuatan": "...", "perbaikan": "..." },
    { "nama": "Bukti", "kekuatan": "...", "perbaikan": "..." },
    { "nama": "Penalaran", "kekuatan": "...", "perbaikan": "..." }
  ],
  "langkahBerikutnya": ["langkah konkret 1", "langkah konkret 2", "..."]
}`;

function buildUserPrompt(input: CerFeedbackInput): string {
  return [
    `Judul tugas: ${input.assignmentTitle}`,
    `Prompt tugas: ${input.prompt}`,
    input.claimQuestion ? `Pertanyaan Klaim: ${input.claimQuestion}` : null,
    input.evidenceQuestion
      ? `Pertanyaan Bukti: ${input.evidenceQuestion}`
      : null,
    input.reasoningQuestion
      ? `Pertanyaan Penalaran: ${input.reasoningQuestion}`
      : null,
    "",
    "=== Jawaban Mahasiswa ===",
    `Klaim: ${input.claim || "(kosong)"}`,
    `Bukti: ${input.evidence || "(kosong)"}`,
    `Penalaran: ${input.reasoning || "(kosong)"}`,
    "",
    "Beri umpan balik formatif sesuai format JSON yang diminta.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/**
 * Memanggil OpenAI untuk menghasilkan umpan balik formatif CER.
 * Mengembalikan feedback terstruktur + metadata untuk dicatat ke AIResponseLog.
 */
export async function generateCerFeedback(
  input: CerFeedbackInput,
): Promise<CerFeedbackResult> {
  const client = getOpenAIClient();
  const promptText = buildUserPrompt(input);

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

  const parsed = feedbackSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("Struktur umpan balik AI tidak sesuai");
  }

  return {
    feedback: parsed.data,
    promptText,
    rawResponse,
    modelName: completion.model || DEFAULT_OPENAI_MODEL,
    inputTokens: completion.usage?.prompt_tokens ?? null,
    outputTokens: completion.usage?.completion_tokens ?? null,
  };
}
