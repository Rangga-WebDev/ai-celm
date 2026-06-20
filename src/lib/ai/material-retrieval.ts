/** @format */

/**
 * Retrieval ringan untuk chatbot materi (tanpa vector database).
 *
 * Pendekatan: teks tiap materi dipecah menjadi potongan (chunk), lalu tiap
 * chunk diberi skor berdasarkan irisan kata kunci dengan pertanyaan mahasiswa.
 * Chunk dengan skor tertinggi dikirim sebagai konteks ke model. Ini menjaga
 * jawaban tetap berbasis materi dosen dan hemat token.
 */

export type MaterialChunkSource = {
  materialId: string;
  materialTitle: string;
  text: string;
};

export type RetrievedChunk = {
  materialId: string;
  materialTitle: string;
  content: string;
  score: number;
};

const CHUNK_SIZE = 900;
const CHUNK_OVERLAP = 150;

/** Kata umum Bahasa Indonesia yang diabaikan saat skoring. */
const STOP_WORDS = new Set([
  "yang",
  "dan",
  "di",
  "ke",
  "dari",
  "untuk",
  "pada",
  "dengan",
  "adalah",
  "itu",
  "ini",
  "atau",
  "juga",
  "akan",
  "tidak",
  "ada",
  "dalam",
  "oleh",
  "sebagai",
  "agar",
  "karena",
  "apa",
  "apakah",
  "bagaimana",
  "mengapa",
  "kenapa",
  "siapa",
  "kapan",
  "dimana",
  "jelaskan",
  "sebutkan",
  "tolong",
  "saya",
  "kamu",
  "kita",
  "mereka",
  "bisa",
  "dapat",
  "harus",
  "para",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F\s]/gi, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

/** Memecah teks panjang menjadi chunk dengan sedikit tumpang tindih. */
function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= CHUNK_SIZE) {
    return clean.length > 0 ? [clean] : [];
  }

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + CHUNK_SIZE, clean.length);

    // Usahakan memotong di batas kalimat/spasi terdekat agar rapi.
    if (end < clean.length) {
      const lastBreak = clean.lastIndexOf(" ", end);
      if (lastBreak > start + CHUNK_SIZE / 2) {
        end = lastBreak;
      }
    }

    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = end - CHUNK_OVERLAP;
  }

  return chunks;
}

/**
 * Mengambil chunk paling relevan terhadap pertanyaan dari kumpulan materi.
 */
export function retrieveRelevantChunks(
  sources: MaterialChunkSource[],
  question: string,
  topK = 4,
): RetrievedChunk[] {
  const queryTokens = tokenize(question);
  if (queryTokens.length === 0) return [];

  const querySet = new Set(queryTokens);
  const scored: RetrievedChunk[] = [];

  for (const source of sources) {
    const chunks = chunkText(source.text);
    for (const chunk of chunks) {
      const tokens = tokenize(chunk);
      if (tokens.length === 0) continue;

      let overlap = 0;
      const seen = new Set<string>();
      for (const token of tokens) {
        if (querySet.has(token) && !seen.has(token)) {
          overlap += 1;
          seen.add(token);
        }
      }

      if (overlap === 0) continue;

      // Normalisasi ringan agar chunk panjang tidak selalu menang.
      const score = overlap / Math.sqrt(tokens.length);
      scored.push({
        materialId: source.materialId,
        materialTitle: source.materialTitle,
        content: chunk,
        score,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
