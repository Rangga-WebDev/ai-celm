/** @format */

import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Abstraksi penyimpanan berkas.
 *
 * Driver dipilih lewat env `STORAGE_DRIVER`:
 * - "local" (default) → filesystem lokal di folder `uploads/<namespace>`.
 * - "supabase"        → Supabase Storage via REST (tanpa dependency SDK).
 *
 * Env untuk driver Supabase:
 * - SUPABASE_URL                 URL proyek, mis. https://xxxx.supabase.co
 * - SUPABASE_SERVICE_ROLE_KEY    Service role key (rahasia, server-only)
 * - SUPABASE_STORAGE_BUCKET      Nama bucket (default "materials")
 *
 * `key` yang disimpan di database tetap berupa nama berkas polos
 * (mis. "<uuid>.pdf") agar kompatibel lintas driver.
 */
export interface StorageDriver {
  save(key: string, buffer: Buffer, contentType: string): Promise<void>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

/** Driver penyimpanan lokal di `uploads/<namespace>`. */
class LocalStorageDriver implements StorageDriver {
  private readonly root: string;

  constructor(namespace: string) {
    this.root = path.join(process.cwd(), "uploads", namespace);
  }

  private safePath(key: string): string {
    return path.join(this.root, path.basename(key));
  }

  async save(key: string, buffer: Buffer): Promise<void> {
    await mkdir(this.root, { recursive: true });
    await writeFile(this.safePath(key), buffer);
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.safePath(key));
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.safePath(key));
    } catch {
      // Berkas mungkin sudah tidak ada; abaikan.
    }
  }
}

/** Driver Supabase Storage via REST API. */
class SupabaseStorageDriver implements StorageDriver {
  private readonly baseUrl: string;
  private readonly serviceKey: string;
  private readonly bucket: string;
  private readonly prefix: string;

  constructor(namespace: string) {
    const url = process.env.SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!url || !serviceKey) {
      throw new Error(
        "Driver Supabase Storage membutuhkan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.",
      );
    }

    this.baseUrl = url.replace(/\/+$/, "");
    this.serviceKey = serviceKey;
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "materials";
    this.prefix = namespace;
  }

  private objectUrl(key: string): string {
    const objectPath = `${this.prefix}/${path.basename(key)}`;
    return `${this.baseUrl}/storage/v1/object/${this.bucket}/${objectPath}`;
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.serviceKey}`,
      apikey: this.serviceKey,
    };
  }

  async save(key: string, buffer: Buffer, contentType: string): Promise<void> {
    const res = await fetch(this.objectUrl(key), {
      method: "POST",
      headers: {
        ...this.authHeaders(),
        "Content-Type": contentType || "application/octet-stream",
        "x-upsert": "true",
      },
      body: new Uint8Array(buffer),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Supabase upload gagal (${res.status}): ${detail}`);
    }
  }

  async read(key: string): Promise<Buffer> {
    const res = await fetch(this.objectUrl(key), {
      method: "GET",
      headers: this.authHeaders(),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Supabase download gagal (${res.status}): ${detail}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(key: string): Promise<void> {
    const res = await fetch(this.objectUrl(key), {
      method: "DELETE",
      headers: this.authHeaders(),
    });

    if (!res.ok && res.status !== 404) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Supabase delete gagal (${res.status}): ${detail}`);
    }
  }
}

/** Ambil driver penyimpanan untuk sebuah namespace (mis. "materials"). */
export function getStorage(namespace: string): StorageDriver {
  const driver = (process.env.STORAGE_DRIVER ?? "local").toLowerCase();

  if (driver === "supabase") {
    return new SupabaseStorageDriver(namespace);
  }

  return new LocalStorageDriver(namespace);
}
