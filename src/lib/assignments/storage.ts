/** @format */

import path from "node:path";
import { randomUUID } from "node:crypto";
import { getStorage } from "@/lib/storage";

/**
 * Penyimpanan berkas jawaban tugas besar mahasiswa.
 *
 * Operasi I/O didelegasikan ke abstraksi `getStorage("assignments")` agar
 * dapat berjalan di filesystem lokal (default) maupun Supabase Storage
 * tergantung env `STORAGE_DRIVER`.
 */

const storage = getStorage("assignments");

const EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "text/plain": "txt",
  "text/markdown": "md",
  "image/png": "png",
  "image/jpeg": "jpg",
  "application/zip": "zip",
};

export function assignmentExtensionForMime(
  mimeType: string,
  fallbackName: string,
) {
  const fromMime = EXTENSION_BY_MIME[mimeType];
  if (fromMime) return fromMime;

  const ext = path.extname(fallbackName).replace(".", "").toLowerCase();
  return ext.length > 0 ? ext : "bin";
}

export async function saveAssignmentFile(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
): Promise<string> {
  const ext = assignmentExtensionForMime(mimeType, originalName);
  const key = `${randomUUID()}.${ext}`;

  await storage.save(key, buffer, mimeType);

  return key;
}

export async function readAssignmentFile(storageKey: string): Promise<Buffer> {
  return storage.read(storageKey);
}

export async function deleteAssignmentFile(storageKey: string): Promise<void> {
  await storage.delete(storageKey);
}
