/** @format */

import { z } from "zod";
import { DEFAULT_OPENAI_MODEL, getOpenAIClient } from "@/lib/ai/openai";

/** Batas karakter materi yang dikirim ke model agar hemat token. */
export const MAX_ASSIGNMENT_MATERIAL_CHARS = 12000;

export type AssignmentGeneratorInput = {
  courseTitle: string;
  materialTitle: string;
  materialText: string;
};

const rubricItemSchema = z.object({
  kriteria: z.string(),
  bobot: z.number(),
  deskripsi: z.string(),
});

const assignmentGenerationSchema = z.object({
  judul: z.string(),
  deskripsi: z.string(),
  instruksi: z.string(),
  rubrik: z.array(rubricItemSchema),
  estimasiHari: z.number().int().min(1).max(60),
});

export type GeneratedRubricItem = {
  criteria: string;
  weight: number;
  description: string;
};

export type AssignmentGeneratorResult = {
  title: string;
  description: string;
  instructions: string;
  rubric: GeneratedRubricItem[];
  suggestedDays: number;
  promptText: string;
  rawResponse: string;
  modelName: string;
  inputTokens: number | null;
  outputTokens: number | null;
  truncated: boolean;
};

function buildSystemPrompt(): string {
  return `Anda adalah asisten dosen untuk mata kuliah "Pembelajaran PKn SD" (pendidikan kewarganegaraan untuk calon guru SD).
Tugas Anda menyusun DRAF "tugas besar" (proyek/penugasan mendalam) berdasarkan materi modul yang diberikan dosen. Draf ini akan ditinjau dan disunting dosen sebelum diterbitkan ke mahasiswa.

Aturan penting:
- Gunakan Bahasa Indonesia akademik yang jelas untuk calon guru SD.
- Tugas harus mendorong mahasiswa BENAR-BENAR belajar dari modul: menganalisis, menerapkan, dan merefleksikan isi materi.
- "instruksi" berisi langkah-langkah pengerjaan yang konkret (boleh berupa daftar bernomor dalam teks), jenis luaran yang diharapkan, dan ketentuan pengumpulan.
- "rubrik" berisi 3-5 kriteria penilaian. Setiap kriteria punya "bobot" (persentase, total semua bobot = 100) dan "deskripsi" indikator penilaian.
- "estimasiHari" adalah saran tenggat dalam hari (mis. 7, 14) yang masuk akal untuk bobot tugas.
- Buat tugas HANYA berdasarkan isi materi. JANGAN mengarang fakta di luar materi.

Balas HANYA dalam format JSON valid dengan struktur:
{
  "judul": "judul tugas besar",
  "deskripsi": "ringkasan singkat tujuan dan konteks tugas",
  "instruksi": "langkah-langkah pengerjaan dan ketentuan luaran",
  "rubrik": [
    { "kriteria": "nama kriteria", "bobot": 25, "deskripsi": "indikator penilaian" }
  ],
  "estimasiHari": 14
}`;
}

function buildUserPrompt(
  input: AssignmentGeneratorInput,
  materialText: string,
): string {
  return [
    `Mata kuliah: ${input.courseTitle}`,
    `Judul materi/modul: ${input.materialTitle}`,
    "",
    "=== Isi Materi ===",
    materialText,
  ].join("\n");
}

/**
 * Memanggil OpenAI untuk menghasilkan draf tugas besar dari materi modul.
 */
export async function generateAssignmentFromMaterial(
  input: AssignmentGeneratorInput,
): Promise<AssignmentGeneratorResult> {
  const client = getOpenAIClient();

  const truncated = input.materialText.length > MAX_ASSIGNMENT_MATERIAL_CHARS;
  const materialText = truncated
    ? input.materialText.slice(0, MAX_ASSIGNMENT_MATERIAL_CHARS)
    : input.materialText;

  const systemPrompt = buildSystemPrompt();
  const promptText = buildUserPrompt(input, materialText);

  const completion = await client.chat.completions.create({
    model: DEFAULT_OPENAI_MODEL,
    temperature: 0.6,
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

  const parsed = assignmentGenerationSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("Struktur tugas AI tidak sesuai");
  }

  const rubric: GeneratedRubricItem[] = parsed.data.rubrik
    .map((item) => ({
      criteria: item.kriteria.trim(),
      weight: Math.round(item.bobot),
      description: item.deskripsi.trim(),
    }))
    .filter((item) => item.criteria.length > 0);

  return {
    title: parsed.data.judul.trim().slice(0, 200),
    description: parsed.data.deskripsi.trim(),
    instructions: parsed.data.instruksi.trim(),
    rubric,
    suggestedDays: parsed.data.estimasiHari,
    promptText,
    rawResponse,
    modelName: completion.model || DEFAULT_OPENAI_MODEL,
    inputTokens: completion.usage?.prompt_tokens ?? null,
    outputTokens: completion.usage?.completion_tokens ?? null,
    truncated,
  };
}
