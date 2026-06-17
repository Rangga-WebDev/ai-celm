/** @format */

import { z } from "zod";
import { DEFAULT_OPENAI_MODEL, getOpenAIClient } from "@/lib/ai/openai";

export type DiscussionSummaryPost = {
  authorName: string;
  authorRole: string;
  content: string;
};

export type DiscussionSummaryInput = {
  threadTitle: string;
  threadPrompt?: string | null;
  posts: DiscussionSummaryPost[];
};

const summarySchema = z.object({
  ringkasan: z.string(),
  poinUtama: z.array(z.string()),
  kualitasDiskusi: z.string(),
  saranTindakLanjut: z.array(z.string()),
});

export type DiscussionSummary = z.infer<typeof summarySchema>;

export type DiscussionSummaryResult = {
  summary: DiscussionSummary;
  promptText: string;
  rawResponse: string;
  modelName: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

const SYSTEM_PROMPT = `Anda adalah asisten dosen untuk mata kuliah "Pembelajaran PKn SD".
Tugas Anda meringkas jalannya diskusi forum mahasiswa agar dosen dapat memantau dengan cepat.

Aturan penting:
- Gunakan Bahasa Indonesia yang ringkas, objektif, dan profesional.
- Identifikasi poin-poin utama yang muncul, area kesepakatan, dan perbedaan pendapat.
- Nilai kualitas diskusi (kedalaman argumen, penggunaan bukti, keterlibatan) secara jujur tapi membangun.
- Beri saran tindak lanjut yang konkret untuk dosen (mis. konsep yang perlu diluruskan, mahasiswa yang perlu didorong).
- JANGAN mengarang isi yang tidak ada dalam diskusi.

Balas HANYA dalam format JSON valid dengan struktur:
{
  "ringkasan": "ringkasan 2-3 kalimat tentang keseluruhan diskusi",
  "poinUtama": ["poin penting 1", "poin penting 2", "..."],
  "kualitasDiskusi": "penilaian singkat kualitas diskusi",
  "saranTindakLanjut": ["saran untuk dosen 1", "saran untuk dosen 2", "..."]
}`;

function buildUserPrompt(input: DiscussionSummaryInput): string {
  const postLines = input.posts.map(
    (post, index) =>
      `${index + 1}. [${post.authorRole}] ${post.authorName}: ${post.content}`,
  );

  return [
    `Judul diskusi: ${input.threadTitle}`,
    input.threadPrompt ? `Topik/prompt diskusi: ${input.threadPrompt}` : null,
    "",
    "=== Isi Diskusi ===",
    ...postLines,
    "",
    "Ringkas dan analisis diskusi di atas sesuai format JSON yang diminta.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/**
 * Memanggil model AI untuk meringkas & menganalisis jalannya diskusi forum,
 * ditujukan untuk membantu dosen memantau.
 */
export async function generateDiscussionSummary(
  input: DiscussionSummaryInput,
): Promise<DiscussionSummaryResult> {
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

  const parsed = summarySchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("Struktur ringkasan AI tidak sesuai");
  }

  return {
    summary: parsed.data,
    promptText,
    rawResponse,
    modelName: completion.model || DEFAULT_OPENAI_MODEL,
    inputTokens: completion.usage?.prompt_tokens ?? null,
    outputTokens: completion.usage?.completion_tokens ?? null,
  };
}
