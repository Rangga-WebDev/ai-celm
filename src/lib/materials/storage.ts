/** @format */

import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Penyimpanan berkas materi pada filesystem lokal.
 *
 * CATATAN: Penyimpanan ini bersifat lokal (folder `uploads/` di root proyek)
 * dan cocok untuk pengembangan / server yang persisten. Saat dideploy ke
 * lingkungan serverless yang efemeral (mis. Vercel), folder ini tidak permanen
 * dan perlu diganti dengan object storage (Supabase Storage / S3).
 */

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "materials");

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
  await mkdir(UPLOAD_ROOT, { recursive: true });

  const ext = extensionForMime(mimeType, originalName);
  const key = `${randomUUID()}.${ext}`;
  const fullPath = path.join(UPLOAD_ROOT, key);

  await writeFile(fullPath, buffer);

  return key;
}

export async function readMaterialFile(storageKey: string): Promise<Buffer> {
  const fullPath = resolveSafePath(storageKey);
  return readFile(fullPath);
}

export async function deleteMaterialFile(storageKey: string): Promise<void> {
  try {
    const fullPath = resolveSafePath(storageKey);
    await unlink(fullPath);
  } catch {
    // Berkas mungkin sudah tidak ada; abaikan agar penghapusan record tetap jalan.
  }
}

/**
 * Pastikan storageKey tidak keluar dari folder upload (cegah path traversal).
 */
function resolveSafePath(storageKey: string): string {
  const safeKey = path.basename(storageKey);
  return path.join(UPLOAD_ROOT, safeKey);
}
