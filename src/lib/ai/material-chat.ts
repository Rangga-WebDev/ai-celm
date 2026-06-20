/** @format */

import { DEFAULT_OPENAI_MODEL, getOpenAIClient } from "@/lib/ai/openai";
import type { RetrievedChunk } from "@/lib/ai/material-retrieval";

export type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export type MaterialChatInput = {
  courseTitle: string;
  question: string;
  chunks: RetrievedChunk[];
  history: ChatHistoryItem[];
};

export type MaterialChatResult = {
  answer: string;
  usedMaterials: { materialId: string; materialTitle: string }[];
  modelName: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

const SYSTEM_PROMPT = `Anda adalah "Asisten Belajar" untuk mata kuliah "Pembelajaran PKn SD" (pendidikan kewarganegaraan untuk calon guru SD).
Tugas Anda menjawab pertanyaan mahasiswa HANYA berdasarkan kutipan materi yang diberikan dosen.

Aturan penting:
- Gunakan Bahasa Indonesia yang ramah, jelas, dan mendukung untuk calon guru SD.
- Jawab HANYA berdasarkan "KONTEKS MATERI" di bawah. JANGAN menambah informasi dari luar materi.
- Jika jawaban tidak ada di dalam konteks, katakan dengan jujur bahwa materi tersebut belum tersedia, dan sarankan mahasiswa bertanya kepada dosen atau membaca materi lain.
- Jangan mengarang, jangan menebak. Lebih baik mengakui keterbatasan.
- Bila relevan, dorong mahasiswa berpikir kritis dengan pertanyaan lanjutan singkat.
- Jawab ringkas dan terstruktur (boleh memakai poin bila perlu).`;

function buildContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "(Tidak ada kutipan materi yang relevan ditemukan.)";
  }
  return chunks
    .map(
      (chunk, index) =>
        `[Kutipan ${index + 1} — dari "${chunk.materialTitle}"]\n${chunk.content}`,
    )
    .join("\n\n");
}

/**
 * Menjawab pertanyaan mahasiswa berbasis kutipan materi (RAG).
 */
export async function answerMaterialQuestion(
  input: MaterialChatInput,
): Promise<MaterialChatResult> {
  const client = getOpenAIClient();
  const context = buildContext(input.chunks);

  const userContent = [
    `Mata kuliah: ${input.courseTitle}`,
    "",
    "=== KONTEKS MATERI ===",
    context,
    "",
    "=== PERTANYAAN MAHASISWA ===",
    input.question,
    "",
    "Jawab pertanyaan di atas hanya berdasarkan KONTEKS MATERI.",
  ].join("\n");

  // Sertakan beberapa giliran percakapan terakhir untuk konteks lanjutan.
  const historyMessages = input.history.slice(-6).map((item) => ({
    role: item.role,
    content: item.content,
  }));

  const completion = await client.chat.completions.create({
    model: DEFAULT_OPENAI_MODEL,
    temperature: 0.3,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...historyMessages,
      { role: "user", content: userContent },
    ],
  });

  const answer = completion.choices[0]?.message?.content?.trim() ?? "";

  if (!answer) {
    throw new Error("Model tidak mengembalikan respons");
  }

  // Materi unik yang dipakai sebagai sumber jawaban.
  const seen = new Set<string>();
  const usedMaterials: { materialId: string; materialTitle: string }[] = [];
  for (const chunk of input.chunks) {
    if (!seen.has(chunk.materialId)) {
      seen.add(chunk.materialId);
      usedMaterials.push({
        materialId: chunk.materialId,
        materialTitle: chunk.materialTitle,
      });
    }
  }

  return {
    answer,
    usedMaterials,
    modelName: completion.model || DEFAULT_OPENAI_MODEL,
    inputTokens: completion.usage?.prompt_tokens ?? null,
    outputTokens: completion.usage?.completion_tokens ?? null,
  };
}
