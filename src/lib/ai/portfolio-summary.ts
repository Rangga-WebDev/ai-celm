/** @format */

import { z } from "zod";
import { DEFAULT_OPENAI_MODEL, getOpenAIClient } from "@/lib/ai/openai";

export type PortfolioAchievementInput = {
  studentName: string;
  /** Ringkasan capaian terstruktur (sudah diagregasi dari data). */
  courses: Array<{
    title: string;
    progressPercent: number;
    completedModules: number;
    totalModules: number;
  }>;
  quizzes: {
    attempts: number;
    passed: number;
    averagePercent: number | null;
  };
  cer: {
    submitted: number;
    graded: number;
    averageScore: number | null;
  };
  projects: {
    submitted: number;
    graded: number;
    titles: string[];
  };
  reflections: string[];
};

const portfolioSchema = z.object({
  judul: z.string(),
  ringkasan: z.string(),
  kekuatan: z.array(z.string()),
  rekomendasi: z.array(z.string()),
});

export type PortfolioSummary = {
  headline: string;
  summary: string;
  strengths: string[];
  recommendations: string[];
};

export type PortfolioSummaryResult = {
  portfolio: PortfolioSummary;
  promptText: string;
  rawResponse: string;
  modelName: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

const SYSTEM_PROMPT = `Anda adalah asisten akademik yang menyusun narasi portofolio belajar mahasiswa calon guru PKn SD.
Tugas Anda merangkum capaian belajar mahasiswa menjadi narasi portofolio yang reflektif dan profesional.

Aturan penting:
- Gunakan Bahasa Indonesia yang positif, jujur, dan membangun.
- Dasarkan narasi HANYA pada data capaian yang diberikan. JANGAN mengarang capaian yang tidak ada.
- "judul" adalah kalimat headline singkat (maks 12 kata) yang menggambarkan profil belajar mahasiswa.
- "ringkasan" adalah 2-4 kalimat narasi capaian belajar secara menyeluruh.
- "kekuatan" adalah 3-5 poin kekuatan nyata berdasarkan data.
- "rekomendasi" adalah 2-4 saran pengembangan diri yang konkret dan sopan.
- Jika data masih sedikit/kosong, sampaikan dengan jujur dan dorong mahasiswa untuk mulai/menuntaskan aktivitas.

Balas HANYA dalam format JSON valid dengan struktur:
{
  "judul": "headline singkat",
  "ringkasan": "narasi 2-4 kalimat",
  "kekuatan": ["...", "..."],
  "rekomendasi": ["...", "..."]
}`;

function buildUserPrompt(input: PortfolioAchievementInput): string {
  const courseLines =
    input.courses.length > 0
      ? input.courses
          .map(
            (c) =>
              `- ${c.title}: progres ${c.progressPercent}% (${c.completedModules}/${c.totalModules} modul selesai)`,
          )
          .join("\n")
      : "- (belum ada kelas yang diikuti)";

  const reflectionLines =
    input.reflections.length > 0
      ? input.reflections
          .slice(0, 5)
          .map((r, i) => `${i + 1}. ${r.slice(0, 500)}`)
          .join("\n")
      : "(belum ada refleksi)";

  return [
    `Nama mahasiswa: ${input.studentName}`,
    "",
    "=== Kelas & Progres ===",
    courseLines,
    "",
    "=== Kuis ===",
    `Total percobaan: ${input.quizzes.attempts}, lulus: ${input.quizzes.passed}, rata-rata: ${
      input.quizzes.averagePercent ?? "-"
    }%`,
    "",
    "=== Tugas CER (Claim-Evidence-Reasoning) ===",
    `Dikumpulkan: ${input.cer.submitted}, dinilai: ${input.cer.graded}, rata-rata nilai: ${
      input.cer.averageScore ?? "-"
    }`,
    "",
    "=== Proyek Aksi Kewarganegaraan ===",
    `Dikumpulkan: ${input.projects.submitted}, dinilai: ${input.projects.graded}`,
    input.projects.titles.length > 0
      ? `Judul proyek: ${input.projects.titles.slice(0, 5).join("; ")}`
      : "Judul proyek: (belum ada)",
    "",
    "=== Refleksi Mahasiswa ===",
    reflectionLines,
    "",
    "Susun narasi portofolio sesuai format JSON yang diminta.",
  ].join("\n");
}

/**
 * Menghasilkan narasi portofolio belajar dari data capaian yang sudah diagregasi.
 */
export async function generatePortfolioSummary(
  input: PortfolioAchievementInput,
): Promise<PortfolioSummaryResult> {
  const client = getOpenAIClient();
  const promptText = buildUserPrompt(input);

  const completion = await client.chat.completions.create({
    model: DEFAULT_OPENAI_MODEL,
    temperature: 0.5,
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

  const parsed = portfolioSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("Struktur portofolio AI tidak sesuai");
  }

  return {
    portfolio: {
      headline: parsed.data.judul.trim(),
      summary: parsed.data.ringkasan.trim(),
      strengths: parsed.data.kekuatan.map((s) => s.trim()).filter(Boolean),
      recommendations: parsed.data.rekomendasi
        .map((s) => s.trim())
        .filter(Boolean),
    },
    promptText,
    rawResponse,
    modelName: completion.model || DEFAULT_OPENAI_MODEL,
    inputTokens: completion.usage?.prompt_tokens ?? null,
    outputTokens: completion.usage?.completion_tokens ?? null,
  };
}
