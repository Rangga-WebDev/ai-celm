/** @format */

import { randomUUID } from "node:crypto";
import { getStorage } from "@/lib/storage";

/**
 * Penyimpanan foto profil (avatar). Memakai namespace "avatars" pada driver
 * penyimpanan yang sama (lokal/Supabase). Kunci yang disimpan di database
 * berupa nama berkas polos (mis. "<uuid>.png").
 */

const storage = getStorage("avatars");

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export const ALLOWED_AVATAR_MIME = new Set(Object.keys(EXTENSION_BY_MIME));
export const MAX_AVATAR_BYTES = 3 * 1024 * 1024; // 3 MB

export function isAllowedAvatarMime(mimeType: string): boolean {
  return ALLOWED_AVATAR_MIME.has(mimeType);
}

export function contentTypeForAvatarKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

export async function saveAvatarFile(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const ext = EXTENSION_BY_MIME[mimeType] ?? "jpg";
  const key = `${randomUUID()}.${ext}`;
  await storage.save(key, buffer, mimeType);
  return key;
}

export async function readAvatarFile(storageKey: string): Promise<Buffer> {
  return storage.read(storageKey);
}

export async function deleteAvatarFile(storageKey: string): Promise<void> {
  await storage.delete(storageKey);
}
