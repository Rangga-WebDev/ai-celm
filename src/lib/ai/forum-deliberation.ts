/** @format */

import { z } from "zod";
import { DEFAULT_OPENAI_MODEL, getOpenAIClient } from "@/lib/ai/openai";

export type ForumDeliberationInput = {
  threadTitle: string;
  threadPrompt?: string | null;
  draft: string;
};

const deliberationSchema = z.object({
  ringkasan: z.string(),
  pertanyaanReflektif: z.array(z.string()),
  sudutPandangLain: z.array(z.string()),
});

export type ForumDeliberation = z.infer<typeof deliberationSchema>;

export type ForumDeliberationResult = {
  deliberation: ForumDeliberation;
  promptText: string;
  rawResponse: string;
  modelName: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

const SYSTEM_PROMPT = `Anda adalah fasilitator diskusi untuk mata kuliah "Pembelajaran PKn SD".
Tugas Anda membantu mahasiswa (calon guru SD) memperdalam argumennya sebelum diposting ke forum.

Aturan penting:
- Gunakan Bahasa Indonesia yang ramah, hangat, dan memancing berpikir kritis.
- Gunakan gaya Socratic: ajukan pertanyaan pemandu, JANGAN memberi jawaban atau opini final.
- JANGAN menuliskan ulang argumen mahasiswa. Bantu mereka melihat celah dan sudut pandang lain.
- Kaitkan dengan konteks nyata pembelajaran PKn di SD (siswa, orang tua, guru, masyarakat).
- Jika draf kosong atau sangat singkat, beri pertanyaan pembuka untuk memulai.

Balas HANYA dalam format JSON valid dengan struktur:
{
  "ringkasan": "1-2 kalimat apresiasi singkat atas arah pemikiran mahasiswa",
  "pertanyaanReflektif": ["pertanyaan pemandu 1", "pertanyaan pemandu 2", "pertanyaan pemandu 3"],
  "sudutPandangLain": ["perspektif alternatif 1", "perspektif alternatif 2"]
}`;

function buildUserPrompt(input: ForumDeliberationInput): string {
  return [
    `Judul diskusi: ${input.threadTitle}`,
    input.threadPrompt ? `Topik/prompt diskusi: ${input.threadPrompt}` : null,
    "",
    "=== Draf Pendapat Mahasiswa ===",
    input.draft || "(belum menulis apa pun)",
    "",
    "Bantu mahasiswa memperdalam pemikirannya sesuai format JSON yang diminta.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/**
 * Memanggil model AI untuk menghasilkan pertanyaan deliberatif (Socratic)
 * yang membantu mahasiswa memperdalam argumen forum sebelum diposting.
 */
export async function generateForumDeliberation(
  input: ForumDeliberationInput,
): Promise<ForumDeliberationResult> {
  const client = getOpenAIClient();
  const promptText = buildUserPrompt(input);

  const completion = await client.chat.completions.create({
    model: DEFAULT_OPENAI_MODEL,
    temperature: 0.6,
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

  const parsed = deliberationSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("Struktur respons AI tidak sesuai");
  }

  return {
    deliberation: parsed.data,
    promptText,
    rawResponse,
    modelName: completion.model || DEFAULT_OPENAI_MODEL,
    inputTokens: completion.usage?.prompt_tokens ?? null,
    outputTokens: completion.usage?.completion_tokens ?? null,
  };
}
