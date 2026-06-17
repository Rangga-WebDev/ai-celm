/** @format */

import OpenAI from "openai";

let cachedClient: OpenAI | null = null;

export const DEFAULT_OPENAI_MODEL =
  process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

/**
 * Apakah lapisan AI aktif (API key tersedia).
 * Dipakai untuk menonaktifkan fitur AI dengan rapi saat key belum diisi.
 */
export function isAiEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/**
 * Mengambil client OpenAI (lazy + cached). Melempar error jika key belum diset.
 */
export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY belum dikonfigurasi");
  }

  if (!cachedClient) {
    const baseURL = process.env.OPENAI_BASE_URL?.trim();
    cachedClient = new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
  }

  return cachedClient;
}
