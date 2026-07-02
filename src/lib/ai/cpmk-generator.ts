/** @format */

import { z } from "zod";
import { DEFAULT_OPENAI_MODEL, getOpenAIClient } from "@/lib/ai/openai";

/**
 * Batas karakter dokumen kurikulum yang dikirim ke model agar hemat token dan
 * tetap berada dalam jendela konteks. Dokumen lebih panjang dipotong.
 */
export const MAX_CURRICULUM_CHARS = 12000;

export type CpmkGeneratorCpl = {
  code: string;
  statement: string;
  domain: string;
};

export type CpmkGeneratorInput = {
  courseTitle: string;
  courseDescription: string | null;
  cpls: CpmkGeneratorCpl[];
  curriculumText: string;
};

export type GeneratedCpmk = {
  code: string;
  statement: string;
  cplCodes: string[];
};

export type CpmkGeneratorResult = {
  cpmks: GeneratedCpmk[];
  promptText: string;
  rawResponse: string;
  modelName: string;
  inputTokens: number | null;
  outputTokens: number | null;
  truncated: boolean;
};

const generatedSchema = z.object({
  cpmk: z
    .array(
      z.object({
        kode: z.string().default(""),
        rumusan: z.string().default(""),
        cpl: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});

function buildSystemPrompt(): string {
  return `Anda adalah asisten dosen ahli desain kurikulum untuk pendidikan tinggi (khususnya calon guru SD, mata kuliah Pendidikan Kewarganegaraan/PKn dan Pancasila).
Tugas Anda merumuskan CPMK (Capaian Pembelajaran Mata Kuliah) yang menurunkan CPL (Capaian Pembelajaran Lulusan) menjadi capaian yang lebih spesifik dan terukur pada level mata kuliah, selaras dengan dokumen kurikulum yang diberikan.

Aturan penting:
- Gunakan Bahasa Indonesia akademik yang jelas.
- Setiap CPMK HARUS diturunkan dari satu atau beberapa CPL yang diberikan. Cantumkan kode CPL yang relevan pada field "cpl".
- Gunakan kata kerja operasional Taksonomi Bloom yang terukur (mis. "menganalisis", "merancang", "mengevaluasi", "menerapkan").
- Rumusan CPMK diawali pola "Mahasiswa mampu ...".
- Buat 4 sampai 8 CPMK yang saling melengkapi dan mencakup ranah sikap, pengetahuan, dan keterampilan sesuai CPL.
- Kode CPMK memakai format "CPMK1", "CPMK2", dan seterusnya, berurutan.
- Rumuskan HANYA berdasarkan CPL dan dokumen kurikulum yang diberikan. Jangan mengarang kompetensi di luar konteks.

Balas HANYA dalam format JSON valid dengan struktur:
{
  "cpmk": [
    { "kode": "CPMK1", "rumusan": "Mahasiswa mampu ...", "cpl": ["CPL1", "CPL3"] }
  ]
}`;
}

function buildUserPrompt(
  input: CpmkGeneratorInput,
  curriculumText: string,
): string {
  const cplLines = input.cpls
    .map((cpl) => `- ${cpl.code} [${cpl.domain}]: ${cpl.statement}`)
    .join("\n");

  return [
    `Mata kuliah: ${input.courseTitle}`,
    input.courseDescription
      ? `Deskripsi mata kuliah: ${input.courseDescription}`
      : null,
    "",
    "=== Daftar CPL yang harus diturunkan ===",
    cplLines,
    "",
    "=== Dokumen Kurikulum ===",
    curriculumText,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

/**
 * Memanggil model untuk menghasilkan draf CPMK dari daftar CPL mata kuliah dan
 * teks dokumen kurikulum. Hasil masih perlu ditinjau dosen sebelum disimpan.
 */
export async function generateCpmk(
  input: CpmkGeneratorInput,
): Promise<CpmkGeneratorResult> {
  const client = getOpenAIClient();

  const truncated = input.curriculumText.length > MAX_CURRICULUM_CHARS;
  const curriculumText = truncated
    ? input.curriculumText.slice(0, MAX_CURRICULUM_CHARS)
    : input.curriculumText;

  const systemPrompt = buildSystemPrompt();
  const promptText = buildUserPrompt(input, curriculumText);

  const completion = await client.chat.completions.create({
    model: DEFAULT_OPENAI_MODEL,
    temperature: 0.4,
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

  const parsed = generatedSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("Struktur CPMK AI tidak sesuai");
  }

  const validCplCodes = new Set(
    input.cpls.map((cpl) => cpl.code.toUpperCase()),
  );

  const seenCodes = new Set<string>();
  const cpmks: GeneratedCpmk[] = [];

  parsed.data.cpmk.forEach((item, index) => {
    const statement = item.rumusan.trim();
    if (statement.length < 5) return;

    let code = item.kode.trim().toUpperCase();
    if (code.length === 0 || seenCodes.has(code)) {
      code = `CPMK${index + 1}`;
    }
    // Jika masih bentrok, tambahkan sufiks urutan.
    while (seenCodes.has(code)) {
      code = `${code}-${index + 1}`;
    }
    seenCodes.add(code);

    const cplCodes = Array.from(
      new Set(
        item.cpl
          .map((value) => value.trim().toUpperCase())
          .filter((value) => validCplCodes.has(value)),
      ),
    );

    cpmks.push({ code, statement, cplCodes });
  });

  return {
    cpmks,
    promptText,
    rawResponse,
    modelName: completion.model || DEFAULT_OPENAI_MODEL,
    inputTokens: completion.usage?.prompt_tokens ?? null,
    outputTokens: completion.usage?.completion_tokens ?? null,
    truncated,
  };
}
