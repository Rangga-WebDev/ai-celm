/** @format */

/**
 * Ekstraksi teks dari berkas materi (PDF / Word / teks biasa).
 * Teks hasil ekstraksi inilah yang menjadi sumber untuk fitur AI
 * (ringkasan, kuis, flashcard, chatbot) pada tahap berikutnya.
 */

export const ALLOWED_MATERIAL_MIME: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "Word (.doc)",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "Word (.docx)",
  "text/plain": "Teks (.txt)",
  "text/markdown": "Markdown (.md)",
};

export const MAX_MATERIAL_BYTES = 15 * 1024 * 1024; // 15 MB

export type ExtractionResult = {
  text: string;
  charCount: number;
};

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // pdf-parse v2: gunakan kelas PDFParse (berbasis pdfjs-dist).
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}

/**
 * Mengekstrak teks sesuai tipe berkas. Melempar error bila gagal/tak didukung.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
): Promise<ExtractionResult> {
  let raw = "";

  switch (mimeType) {
    case "application/pdf":
      raw = await extractPdf(buffer);
      break;
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      raw = await extractDocx(buffer);
      break;
    case "application/msword":
      // .doc (format biner lama) tidak didukung mammoth; coba baca sebagai teks.
      raw = buffer.toString("utf8");
      break;
    case "text/plain":
    case "text/markdown":
      raw = buffer.toString("utf8");
      break;
    default:
      throw new Error("Tipe berkas tidak didukung untuk ekstraksi teks.");
  }

  const text = normalizeWhitespace(raw);
  return { text, charCount: text.length };
}
