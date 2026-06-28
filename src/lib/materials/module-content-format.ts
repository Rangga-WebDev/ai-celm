/** @format */

import type { ModuleLearningContent } from "@/lib/validators/module-content.schema";

/**
 * Mengubah konten belajar modul (struktur modul ajar) menjadi satu dokumen
 * Markdown yang dapat dibaca mahasiswa pada satu "bagian" (MicroUnit).
 *
 * Kunci jawaban tes formatif TIDAK disertakan agar pertanyaan bisa dipakai
 * sebagai latihan mandiri.
 */
export function moduleLearningContentToMarkdown(
  content: ModuleLearningContent,
  moduleTitle: string,
): string {
  const lines: string[] = [];

  const intro = content.introduction;
  if (intro.description.trim()) {
    lines.push("## Pendahuluan", "", intro.description.trim(), "");
  }

  if (intro.learningOutcomes.length > 0) {
    lines.push("### Capaian Pembelajaran", "");
    for (const outcome of intro.learningOutcomes) {
      lines.push(`- ${outcome.trim()}`);
    }
    lines.push("");
  }

  if (intro.prerequisites.trim()) {
    lines.push("### Prasyarat", "", intro.prerequisites.trim(), "");
  }

  if (intro.usageGuide.trim()) {
    lines.push("### Petunjuk Penggunaan", "", intro.usageGuide.trim(), "");
  }

  content.activities.forEach((activity, index) => {
    const heading = activity.title.trim() || `Kegiatan Belajar ${index + 1}`;
    lines.push(`## ${heading}`, "");

    if (activity.content.trim()) {
      lines.push(activity.content.trim(), "");
    }

    if (activity.caseStudy.trim()) {
      lines.push("### Studi Kasus", "", activity.caseStudy.trim(), "");
    }

    if (activity.reflectionPrompts.length > 0) {
      lines.push("### Pertanyaan Refleksi", "");
      for (const prompt of activity.reflectionPrompts) {
        lines.push(`- ${prompt.trim()}`);
      }
      lines.push("");
    }

    if (activity.summary.trim()) {
      lines.push("### Rangkuman", "", activity.summary.trim(), "");
    }
  });

  const assessment = content.assessment;
  if (assessment.formativeQuestions.length > 0) {
    lines.push("## Tes Formatif (Latihan Mandiri)", "");
    assessment.formativeQuestions.forEach((item, index) => {
      if (item.question.trim()) {
        lines.push(`${index + 1}. ${item.question.trim()}`);
      }
    });
    lines.push("");
  }

  const support = content.support;
  if (support.glossary.length > 0) {
    lines.push("## Glosarium", "");
    for (const entry of support.glossary) {
      if (entry.term.trim()) {
        lines.push(`- **${entry.term.trim()}**: ${entry.definition.trim()}`);
      }
    }
    lines.push("");
  }

  if (support.references.length > 0) {
    lines.push("## Daftar Pustaka", "");
    for (const reference of support.references) {
      lines.push(`- ${reference.trim()}`);
    }
    lines.push("");
  }

  const body = lines.join("\n").trim();
  return body.length > 0 ? body : `# ${moduleTitle}\n\nMateri belum tersedia.`;
}

/**
 * Membuat ringkasan singkat (deskripsi unit) dari konten modul.
 */
export function moduleContentSummary(content: ModuleLearningContent): string {
  const intro = content.introduction.description.trim();
  if (intro) {
    return intro.length > 240 ? `${intro.slice(0, 237)}...` : intro;
  }
  const firstActivity = content.activities.find((a) => a.content.trim());
  if (firstActivity) {
    const text = firstActivity.content.trim();
    return text.length > 240 ? `${text.slice(0, 237)}...` : text;
  }
  return "";
}

/**
 * Apakah konten modul punya isi yang layak (minimal pendahuluan atau satu
 * kegiatan belajar berisi). Dipakai untuk memutuskan sinkronisasi unit.
 */
export function moduleContentHasBody(content: ModuleLearningContent): boolean {
  if (content.introduction.description.trim().length > 0) return true;
  return content.activities.some((a) => a.content.trim().length > 0);
}

export type ModulePublishCheck = {
  ready: boolean;
  missing: string[];
};

/**
 * Memeriksa kelengkapan modul sebelum diterbitkan ke mahasiswa.
 * Mengembalikan daftar hal yang masih kurang (bahasa Indonesia).
 */
export function evaluateModulePublishReadiness(
  content: ModuleLearningContent,
): ModulePublishCheck {
  const missing: string[] = [];

  if (content.introduction.description.trim().length === 0) {
    missing.push("Deskripsi pendahuluan modul");
  }

  const hasActivityBody = content.activities.some(
    (activity) => activity.content.trim().length > 0,
  );
  if (!hasActivityBody) {
    missing.push("Minimal satu kegiatan belajar yang berisi");
  }

  const hasFormative = content.assessment.formativeQuestions.some(
    (item) => item.question.trim().length > 0,
  );
  if (!hasFormative) {
    missing.push("Minimal satu pertanyaan tes formatif");
  }

  return { ready: missing.length === 0, missing };
}
