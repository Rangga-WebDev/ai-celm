/** @format */

export type CivicDimension = "COGNITIVE" | "AFFECTIVE" | "BEHAVIORAL";

export type CivicSurveyItem = {
  id: string;
  dimension: CivicDimension;
  text: string;
};

export const CIVIC_DIMENSION_LABELS: Record<CivicDimension, string> = {
  COGNITIVE: "Kognitif (Pemahaman)",
  AFFECTIVE: "Afektif (Kepedulian)",
  BEHAVIORAL: "Perilaku (Aksi Nyata)",
};

export const CIVIC_LIKERT_LABELS = [
  "Sangat tidak setuju",
  "Tidak setuju",
  "Netral",
  "Setuju",
  "Sangat setuju",
];

/**
 * Instrumen baku pre-test/post-test civic engagement.
 * Skala Likert 1-5. Item dikelompokkan ke tiga dimensi.
 */
export const CIVIC_SURVEY_ITEMS: CivicSurveyItem[] = [
  // Kognitif
  {
    id: "kog1",
    dimension: "COGNITIVE",
    text: "Saya memahami isu-isu kewargaan yang terjadi di masyarakat saya.",
  },
  {
    id: "kog2",
    dimension: "COGNITIVE",
    text: "Saya dapat menganalisis sebab dan akibat dari suatu masalah sosial.",
  },
  {
    id: "kog3",
    dimension: "COGNITIVE",
    text: "Saya mampu menilai kekuatan bukti dalam sebuah argumen.",
  },
  {
    id: "kog4",
    dimension: "COGNITIVE",
    text: "Saya memahami hak dan kewajiban saya sebagai warga negara.",
  },
  // Afektif
  {
    id: "afe1",
    dimension: "AFFECTIVE",
    text: "Saya peduli terhadap masalah yang dihadapi orang lain di sekitar saya.",
  },
  {
    id: "afe2",
    dimension: "AFFECTIVE",
    text: "Saya menghargai pendapat yang berbeda dari pendapat saya.",
  },
  {
    id: "afe3",
    dimension: "AFFECTIVE",
    text: "Saya merasa bertanggung jawab untuk ikut memperbaiki keadaan masyarakat.",
  },
  {
    id: "afe4",
    dimension: "AFFECTIVE",
    text: "Saya berempati terhadap kelompok yang kurang beruntung.",
  },
  // Perilaku
  {
    id: "per1",
    dimension: "BEHAVIORAL",
    text: "Saya aktif berpartisipasi dalam diskusi tentang isu kewargaan.",
  },
  {
    id: "per2",
    dimension: "BEHAVIORAL",
    text: "Saya pernah terlibat dalam kegiatan sosial atau aksi nyata di masyarakat.",
  },
  {
    id: "per3",
    dimension: "BEHAVIORAL",
    text: "Saya bersedia berkolaborasi dengan orang lain untuk kebaikan bersama.",
  },
  {
    id: "per4",
    dimension: "BEHAVIORAL",
    text: "Saya mengambil tindakan ketika melihat hal yang tidak adil.",
  },
];

export type CivicScores = {
  scoreCognitive: number;
  scoreAffective: number;
  scoreBehavioral: number;
  scoreOverall: number;
};

function average(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((total, value) => total + value, 0);
  return sum / values.length;
}

/**
 * Mengubah jawaban Likert (1-5) menjadi skor 0-100 per dimensi dan keseluruhan.
 * `answers` adalah peta itemId -> nilai 1..5.
 */
export function computeCivicScores(
  answers: Record<string, number>,
): CivicScores {
  const toPercent = (likert: number) => ((likert - 1) / 4) * 100;

  const byDimension = (dimension: CivicDimension) =>
    average(
      CIVIC_SURVEY_ITEMS.filter((item) => item.dimension === dimension)
        .map((item) => answers[item.id])
        .filter((value): value is number => typeof value === "number")
        .map(toPercent),
    );

  const scoreCognitive = Math.round(byDimension("COGNITIVE"));
  const scoreAffective = Math.round(byDimension("AFFECTIVE"));
  const scoreBehavioral = Math.round(byDimension("BEHAVIORAL"));
  const scoreOverall = Math.round(
    average([scoreCognitive, scoreAffective, scoreBehavioral]),
  );

  return { scoreCognitive, scoreAffective, scoreBehavioral, scoreOverall };
}

/**
 * Memastikan semua item terisi dengan nilai 1..5. Mengembalikan daftar id yang
 * belum valid (kosong jika lengkap & valid).
 */
export function findInvalidCivicAnswers(
  answers: Record<string, unknown>,
): string[] {
  return CIVIC_SURVEY_ITEMS.filter((item) => {
    const value = answers[item.id];
    return (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 1 ||
      value > 5
    );
  }).map((item) => item.id);
}
