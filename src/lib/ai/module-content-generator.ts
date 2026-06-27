/** @format */

import { z } from "zod";
import { DEFAULT_OPENAI_MODEL, getOpenAIClient } from "@/lib/ai/openai";
import {
  type ModuleLearningContent,
  normalizeModuleLearningContent,
} from "@/lib/validators/module-content.schema";

/**
 * Batas karakter materi PDF yang dikirim ke model agar hemat token dan tetap
 * berada dalam jendela konteks. Materi lebih panjang dipotong.
 */
export const MAX_MODULE_MATERIAL_CHARS = 14000;

export type ModuleContentGeneratorInput = {
  courseTitle: string;
  moduleTitle: string;
  moduleDescription: string | null;
  materialTitle: string;
  materialText: string;
};

const generatedContentSchema = z.object({
  pendahuluan: z.object({
    capaianPembelajaran: z.array(z.string()).default([]),
    deskripsi: z.string().default(""),
    prasyarat: z.string().default(""),
    petunjukPenggunaan: z.string().default(""),
  }),
  kegiatanBelajar: z
    .array(
      z.object({
        judul: z.string().default(""),
        uraian: z.string().default(""),
        studiKasus: z.string().default(""),
        pertanyaanRefleksi: z.array(z.string()).default([]),
        rangkuman: z.string().default(""),
      }),
    )
    .default([]),
  evaluasi: z.object({
    tugasMandiri: z.string().default(""),
    rubrik: z.string().default(""),
    tesFormatif: z
      .array(
        z.object({
          pertanyaan: z.string().default(""),
          kunciJawaban: z.string().default(""),
        }),
      )
      .default([]),
    aturanKetuntasan: z.string().default(""),
  }),
  pendukung: z.object({
    glosarium: z
      .array(
        z.object({
          istilah: z.string().default(""),
          definisi: z.string().default(""),
        }),
      )
      .default([]),
    daftarPustaka: z.array(z.string()).default([]),
    pengayaan: z
      .array(
        z.object({
          label: z.string().default(""),
          url: z.string().default(""),
        }),
      )
      .default([]),
  }),
});

export type ModuleContentGeneratorResult = {
  content: ModuleLearningContent;
  promptText: string;
  rawResponse: string;
  modelName: string;
  inputTokens: number | null;
  outputTokens: number | null;
  truncated: boolean;
};

function buildSystemPrompt(): string {
  return `Anda adalah asisten dosen yang menyusun MODUL AJAR untuk mata kuliah "Pembelajaran PKn SD" (pendidikan kewarganegaraan untuk calon guru SD).
Tugas Anda menyusun draf modul belajar terstruktur dari materi PDF yang diberikan dosen. Draf ini akan ditinjau dan disunting dosen sebelum diterbitkan ke mahasiswa.

Aturan penting:
- Gunakan Bahasa Indonesia yang komunikatif, seolah dosen berbicara langsung dengan mahasiswa (bukan bahasa kaku buku teks).
- Susun materi dari yang paling mudah ke yang paling kompleks.
- Buat HANYA berdasarkan isi materi yang diberikan. JANGAN mengarang fakta di luar materi. Jika informasi tidak ada di materi, biarkan bagian itu singkat atau kosong.
- Capaian Pembelajaran memakai kata kerja operasional Taksonomi Bloom tingkat tinggi (mis. "Mahasiswa mampu menganalisis...", "Mahasiswa mampu mendesain...").
- Buat 1 sampai 3 kegiatan belajar sesuai cakupan materi. Setiap kegiatan memuat uraian materi mendalam, contoh/studi kasus nyata, pertanyaan refleksi sisipan, dan rangkuman poin.
- Tes formatif berisi 3-5 soal pemahaman beserta kunci jawaban singkat.
- Glosarium memuat istilah teknis penting beserta definisinya.

Balas HANYA dalam format JSON valid dengan struktur:
{
  "pendahuluan": {
    "capaianPembelajaran": ["..."],
    "deskripsi": "...",
    "prasyarat": "...",
    "petunjukPenggunaan": "..."
  },
  "kegiatanBelajar": [
    {
      "judul": "...",
      "uraian": "...",
      "studiKasus": "...",
      "pertanyaanRefleksi": ["..."],
      "rangkuman": "..."
    }
  ],
  "evaluasi": {
    "tugasMandiri": "...",
    "rubrik": "...",
    "tesFormatif": [{ "pertanyaan": "...", "kunciJawaban": "..." }],
    "aturanKetuntasan": "..."
  },
  "pendukung": {
    "glosarium": [{ "istilah": "...", "definisi": "..." }],
    "daftarPustaka": ["..."],
    "pengayaan": [{ "label": "...", "url": "..." }]
  }
}`;
}

function buildUserPrompt(
  input: ModuleContentGeneratorInput,
  materialText: string,
): string {
  return [
    `Mata kuliah: ${input.courseTitle}`,
    `Judul modul: ${input.moduleTitle}`,
    input.moduleDescription
      ? `Deskripsi modul: ${input.moduleDescription}`
      : null,
    `Judul materi sumber: ${input.materialTitle}`,
    "",
    "=== Isi Materi PDF ===",
    materialText,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

/**
 * Memanggil OpenAI untuk menghasilkan draf konten modul belajar terstruktur
 * dari teks materi PDF. Mengembalikan konten siap simpan ke Module.learningContent
 * beserta metadata untuk pencatatan AIResponseLog.
 */
export async function generateModuleContent(
  input: ModuleContentGeneratorInput,
): Promise<ModuleContentGeneratorResult> {
  const client = getOpenAIClient();

  const truncated = input.materialText.length > MAX_MODULE_MATERIAL_CHARS;
  const materialText = truncated
    ? input.materialText.slice(0, MAX_MODULE_MATERIAL_CHARS)
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

  const parsed = generatedContentSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("Struktur modul AI tidak sesuai");
  }

  const data = parsed.data;

  const content = normalizeModuleLearningContent({
    introduction: {
      learningOutcomes: data.pendahuluan.capaianPembelajaran
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      description: data.pendahuluan.deskripsi.trim(),
      prerequisites: data.pendahuluan.prasyarat.trim(),
      usageGuide: data.pendahuluan.petunjukPenggunaan.trim(),
    },
    activities: data.kegiatanBelajar.map((a) => ({
      title: a.judul.trim(),
      content: a.uraian.trim(),
      caseStudy: a.studiKasus.trim(),
      reflectionPrompts: a.pertanyaanRefleksi
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      summary: a.rangkuman.trim(),
    })),
    assessment: {
      assignment: data.evaluasi.tugasMandiri.trim(),
      rubric: data.evaluasi.rubrik.trim(),
      formativeQuestions: data.evaluasi.tesFormatif.map((q) => ({
        question: q.pertanyaan.trim(),
        answer: q.kunciJawaban.trim(),
      })),
      masteryRule: data.evaluasi.aturanKetuntasan.trim(),
    },
    support: {
      glossary: data.pendukung.glosarium.map((g) => ({
        term: g.istilah.trim(),
        definition: g.definisi.trim(),
      })),
      references: data.pendukung.daftarPustaka
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      furtherReading: data.pendukung.pengayaan.map((p) => ({
        label: p.label.trim(),
        url: p.url.trim(),
      })),
    },
  });

  return {
    content,
    promptText,
    rawResponse,
    modelName: completion.model || DEFAULT_OPENAI_MODEL,
    inputTokens: completion.usage?.prompt_tokens ?? null,
    outputTokens: completion.usage?.completion_tokens ?? null,
    truncated,
  };
}

/**
 * Membungkus teks mentah PDF menjadi satu kegiatan belajar tanpa AI.
 * Dipakai untuk mode "unggah PDF langsung jadi modul".
 */
export function buildRawModuleContentFromText(
  moduleTitle: string,
  materialText: string,
): ModuleLearningContent {
  return normalizeModuleLearningContent({
    introduction: {
      learningOutcomes: [],
      description: "",
      prerequisites: "",
      usageGuide: "",
    },
    activities: [
      {
        title: moduleTitle,
        content: materialText.trim(),
        caseStudy: "",
        reflectionPrompts: [],
        summary: "",
      },
    ],
    assessment: {
      assignment: "",
      rubric: "",
      formativeQuestions: [],
      masteryRule: "",
    },
    support: {
      glossary: [],
      references: [],
      furtherReading: [],
    },
  });
}
