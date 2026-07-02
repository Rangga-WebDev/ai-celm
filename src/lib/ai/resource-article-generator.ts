/** @format */

import { z } from "zod";
import { DEFAULT_OPENAI_MODEL, getOpenAIClient } from "@/lib/ai/openai";

/**
 * Batas karakter materi PDF yang dikirim ke model agar hemat token dan tetap
 * berada dalam jendela konteks. Materi lebih panjang dipotong.
 */
export const MAX_RESOURCE_MATERIAL_CHARS = 14000;

export type ResourceOutcomeContext = {
  code: string;
  statement: string;
};

export type ResourceArticleGeneratorInput = {
  courseTitle: string;
  materialTitle: string;
  materialText: string;
  focus?: string | null;
  cpls?: ResourceOutcomeContext[];
  cpmks?: ResourceOutcomeContext[];
};

const generatedArticleSchema = z.object({
  judul: z.string().default(""),
  ringkasan: z.string().default(""),
  artikelMarkdown: z.string().default(""),
});

export type ResourceArticleGeneratorResult = {
  title: string;
  description: string;
  content: string;
  promptText: string;
  rawResponse: string;
  modelName: string;
  inputTokens: number | null;
  outputTokens: number | null;
  truncated: boolean;
};

function buildSystemPrompt(): string {
  return `Anda adalah asisten dosen yang menyusun BAHAN BACAAN (artikel belajar) untuk mata kuliah "Pembelajaran PKn SD" (pendidikan kewarganegaraan untuk calon guru SD).
Tugas Anda mengubah materi PDF dosen menjadi satu artikel bacaan yang utuh, mengalir, dan mudah dipahami mahasiswa. Artikel ini akan ditinjau dan disunting dosen sebelum diterbitkan.

Aturan penting:
- Gunakan Bahasa Indonesia yang komunikatif dan ramah, seolah dosen menjelaskan langsung kepada mahasiswa.
- Tulis artikel dalam format MARKDOWN yang rapi: gunakan heading (##, ###), paragraf, daftar berpoin, penekanan (**tebal**), dan kutipan bila perlu.
- Susun materi dari yang paling mudah ke yang paling kompleks, dengan alur yang logis.
- Buat HANYA berdasarkan isi materi yang diberikan. JANGAN mengarang fakta di luar materi. Jika informasi tidak ada di materi, jangan menambahkannya.
- Jika diberikan daftar CPL/CPMK, selaraskan pembahasan artikel agar mendukung ketercapaian capaian pembelajaran tersebut (tanpa menambah fakta di luar materi).
- Sertakan contoh penerapan nyata untuk konteks guru SD bila relevan.
- Akhiri dengan bagian "## Rangkuman" berisi poin-poin kunci.
- Panjang artikel proporsional dengan materi (jangan terlalu pendek, jangan bertele-tele).

Balas HANYA dalam format JSON valid dengan struktur:
{
  "judul": "Judul artikel yang menarik",
  "ringkasan": "Ringkasan 1-2 kalimat tentang isi artikel",
  "artikelMarkdown": "Isi artikel lengkap dalam format Markdown"
}`;
}

function buildUserPrompt(
  input: ResourceArticleGeneratorInput,
  materialText: string,
): string {
  const cplBlock =
    input.cpls && input.cpls.length > 0
      ? [
          "",
          "=== CPL acuan ===",
          ...input.cpls.map((c) => `- ${c.code}: ${c.statement}`),
        ]
      : [];

  const cpmkBlock =
    input.cpmks && input.cpmks.length > 0
      ? [
          "",
          "=== CPMK yang harus didukung ===",
          ...input.cpmks.map((c) => `- ${c.code}: ${c.statement}`),
        ]
      : [];

  return [
    `Mata kuliah: ${input.courseTitle}`,
    `Judul materi sumber: ${input.materialTitle}`,
    input.focus ? `Fokus/permintaan khusus dosen: ${input.focus}` : null,
    ...cplBlock,
    ...cpmkBlock,
    "",
    "=== Isi Materi PDF ===",
    materialText,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

/**
 * Memanggil OpenAI untuk menghasilkan artikel bahan belajar (Markdown) dari
 * teks materi PDF. Hasil bisa disunting dosen sebelum diterbitkan.
 */
export async function generateResourceArticle(
  input: ResourceArticleGeneratorInput,
): Promise<ResourceArticleGeneratorResult> {
  const client = getOpenAIClient();

  const truncated = input.materialText.length > MAX_RESOURCE_MATERIAL_CHARS;
  const materialText = truncated
    ? input.materialText.slice(0, MAX_RESOURCE_MATERIAL_CHARS)
    : input.materialText;

  const systemPrompt = buildSystemPrompt();
  const promptText = buildUserPrompt(input, materialText);

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

  const parsed = generatedArticleSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("Struktur artikel AI tidak sesuai");
  }

  const data = parsed.data;
  const content = data.artikelMarkdown.trim();

  if (content.length === 0) {
    throw new Error("Artikel yang dihasilkan kosong");
  }

  return {
    title: data.judul.trim() || input.materialTitle,
    description: data.ringkasan.trim(),
    content,
    promptText,
    rawResponse,
    modelName: completion.model || DEFAULT_OPENAI_MODEL,
    inputTokens: completion.usage?.prompt_tokens ?? null,
    outputTokens: completion.usage?.completion_tokens ?? null,
    truncated,
  };
}
