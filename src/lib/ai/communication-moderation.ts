/** @format */

import { z } from "zod";
import {
  DEFAULT_OPENAI_MODEL,
  getOpenAIClient,
  isAiEnabled,
} from "@/lib/ai/openai";

export type ModerationFlagValue = "CLEAN" | "CAUTION" | "SEVERE";

export type CommunicationModerationResult = {
  flag: ModerationFlagValue;
  categories: string[];
  message: string | null;
  revision: string | null;
  modelName: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
};

const moderationSchema = z.object({
  flag: z.enum(["CLEAN", "CAUTION", "SEVERE"]),
  categories: z.array(z.string()).default([]),
  message: z.string().nullable().default(null),
  revision: z.string().nullable().default(null),
});

const SYSTEM_PROMPT = `Anda adalah moderator etika komunikasi digital untuk forum akademik mahasiswa.
Tujuan Anda MENDIDIK, bukan menghukum. Gunakan pendekatan edukatif-restoratif.

Tugas: nilai apakah teks mahasiswa mengandung komunikasi tidak etis, seperti:
- ujaran kebencian (hate speech)
- serangan personal / merendahkan orang lain
- bahasa kasar / makian
- pelecehan, ancaman, atau diskriminasi (SARA)
- provokasi yang memecah belah

Tetapkan "flag":
- "CLEAN": sopan dan layak. Tidak perlu pesan.
- "CAUTION": ada nada kurang sopan/kasar ringan-sedang. Beri pesan edukatif lembut dan saran kalimat yang lebih santun.
- "SEVERE": pelanggaran berat (hate speech, ancaman, SARA, serangan personal kasar). Beri pesan tegas namun mendidik dan saran revisi.

Aturan:
- Gunakan Bahasa Indonesia yang ramah dan tidak menghakimi pribadi mahasiswa.
- Untuk CAUTION/SEVERE, "message" berisi penjelasan singkat (1-2 kalimat) mengapa kurang etis dan ajakan memperbaiki.
- Untuk CAUTION/SEVERE, "revision" berisi versi kalimat yang menyampaikan maksud yang sama dengan lebih sopan.
- Untuk CLEAN, "message" dan "revision" boleh null, "categories" array kosong.
- JANGAN menambah opini di luar tugas moderasi.

Balas HANYA JSON valid dengan struktur:
{
  "flag": "CLEAN" | "CAUTION" | "SEVERE",
  "categories": ["kategori pelanggaran singkat", "..."],
  "message": "pesan edukatif atau null",
  "revision": "saran kalimat lebih sopan atau null"
}`;

/**
 * Memeriksa teks komunikasi mahasiswa untuk potensi pelanggaran etika.
 * Mengembalikan hasil moderasi edukatif (bukan hukuman langsung).
 *
 * Jika lapisan AI tidak aktif, dianggap CLEAN agar diskusi tetap berjalan.
 */
export async function moderateCommunication(
  text: string,
): Promise<CommunicationModerationResult> {
  const cleanResult: CommunicationModerationResult = {
    flag: "CLEAN",
    categories: [],
    message: null,
    revision: null,
    modelName: null,
    inputTokens: null,
    outputTokens: null,
  };

  const trimmed = text.trim();
  if (!trimmed || !isAiEnabled()) {
    return cleanResult;
  }

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: DEFAULT_OPENAI_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `=== Teks Mahasiswa ===\n${trimmed}` },
      ],
    });

    const rawResponse = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!rawResponse) {
      return cleanResult;
    }

    const parsed = moderationSchema.safeParse(JSON.parse(rawResponse));
    if (!parsed.success) {
      return cleanResult;
    }

    return {
      flag: parsed.data.flag,
      categories: parsed.data.categories,
      message: parsed.data.message,
      revision: parsed.data.revision,
      modelName: completion.model ?? DEFAULT_OPENAI_MODEL,
      inputTokens: completion.usage?.prompt_tokens ?? null,
      outputTokens: completion.usage?.completion_tokens ?? null,
    };
  } catch (error) {
    // Moderasi tidak boleh memblokir diskusi jika AI gagal.
    console.error("moderateCommunication error:", error);
    return cleanResult;
  }
}
