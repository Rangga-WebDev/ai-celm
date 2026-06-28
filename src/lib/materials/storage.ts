/** @format */

import path from "node:path";
import { randomUUID } from "node:crypto";
import { getStorage } from "@/lib/storage";

/**
 * Penyimpanan berkas materi.
 *
 * Operasi I/O didelegasikan ke abstraksi `getStorage("materials")` sehingga
 * dapat berjalan di filesystem lokal (default) maupun Supabase Storage
 * tergantung env `STORAGE_DRIVER`. Kunci (`storageKey`) yang disimpan di
 * database tetap berupa nama berkas polos agar kompatibel lintas driver.
 */

const storage = getStorage("materials");

const EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "text/plain": "txt",
  "text/markdown": "md",
};

export function extensionForMime(mimeType: string, fallbackName: string) {
  const fromMime = EXTENSION_BY_MIME[mimeType];
  if (fromMime) return fromMime;

  const ext = path.extname(fallbackName).replace(".", "").toLowerCase();
  return ext.length > 0 ? ext : "bin";
}

export async function saveMaterialFile(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
): Promise<string> {
  const ext = extensionForMime(mimeType, originalName);
  const key = `${randomUUID()}.${ext}`;

  await storage.save(key, buffer, mimeType);

  return key;
}

export async function readMaterialFile(storageKey: string): Promise<Buffer> {
  return storage.read(storageKey);
}

export async function deleteMaterialFile(storageKey: string): Promise<void> {
  await storage.delete(storageKey);
}
