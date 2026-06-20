/** @format */

import { z } from "zod";
import { DEFAULT_OPENAI_MODEL, getOpenAIClient } from "@/lib/ai/openai";

export type CerAssignmentAssistInput = {
  courseTitle: string;
  topic: string;
  targetTitle?: string | null;
  notes?: string | null;
};

const draftSchema = z.object({
  judul: z.string(),
  deskripsi: z.string(),
  pertanyaanUtama: z.string(),
  pertanyaanKlaim: z.string(),
  pertanyaanBukti: z.string(),
  pertanyaanPenalaran: z.string(),
  rubrik: z.string(),
});

export type CerAssignmentDraft = z.infer<typeof draftSchema>;

export type CerAssignmentAssistResult = {
  draft: CerAssignmentDraft;
  promptText: string;
  rawResponse: string;
  modelName: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

const SYSTEM_PROMPT = `Anda adalah asisten dosen untuk mata kuliah "Pembelajaran PKn SD" (calon guru Sekolah Dasar).
Tugas Anda membantu dosen MENYUSUN DRAF tugas argumentasi berbasis CER (Claim-Evidence-Reasoning / Pendapat-Bukti-Penalaran).

Aturan penting:
- Gunakan Bahasa Indonesia yang jelas, ramah, dan sesuai konteks pendidikan PKn untuk calon guru SD.
- Buat kasus/isu kewargaan yang relevan, konkret, dan memancing penalaran (bukan pertanyaan ya/tidak).
- Pertanyaan klaim, bukti, dan penalaran harus saling terkait dan memandu mahasiswa berpikir kritis.
- Rubrik berupa teks ringkas: sebutkan komponen penilaian beserta bobot persen dan kriteria singkat tiap tingkatan.
- Ini hanya DRAF. Dosen akan meninjau dan mengeditnya sebelum dipakai.
- JANGAN mengarang data statistik yang spesifik seolah fakta; gunakan kasus yang masuk akal dan umum.

Balas HANYA dalam format JSON valid dengan struktur:
{
  "judul": "judul tugas yang singkat dan jelas",
  "deskripsi": "1-3 kalimat konteks dan tujuan tugas",
  "pertanyaanUtama": "uraian kasus/isu yang harus dianalisis mahasiswa (boleh beberapa kalimat)",
  "pertanyaanKlaim": "pertanyaan pemandu untuk komponen Pendapat/Klaim",
  "pertanyaanBukti": "pertanyaan pemandu untuk komponen Bukti",
  "pertanyaanPenalaran": "pertanyaan pemandu untuk komponen Alasan/Penalaran",
  "rubrik": "catatan rubrik penilaian dengan bobot dan kriteria singkat"
}`;

function buildUserPrompt(input: CerAssignmentAssistInput): string {
  return [
    `Mata kuliah: ${input.courseTitle}`,
    input.targetTitle ? `Konteks materi/modul: ${input.targetTitle}` : null,
    `Topik/isu yang diminta dosen: ${input.topic}`,
    input.notes ? `Catatan tambahan dari dosen: ${input.notes}` : null,
    "",
    "Susun draf tugas argumentasi CER sesuai format JSON yang diminta.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/**
 * Memanggil OpenAI untuk menyusun draf tugas argumentasi CER.
 * Mengembalikan draf terstruktur + metadata untuk dicatat ke AIResponseLog.
 */
export async function generateCerAssignmentDraft(
  input: CerAssignmentAssistInput,
): Promise<CerAssignmentAssistResult> {
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

  const parsed = draftSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("Struktur draf AI tidak sesuai");
  }

  return {
    draft: parsed.data,
    promptText,
    rawResponse,
    modelName: completion.model || DEFAULT_OPENAI_MODEL,
    inputTokens: completion.usage?.prompt_tokens ?? null,
    outputTokens: completion.usage?.completion_tokens ?? null,
  };
}
