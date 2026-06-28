/** @format */

import { describe, expect, it } from "vitest";
import { emptyModuleLearningContent } from "@/lib/validators/module-content.schema";
import {
  evaluateModulePublishReadiness,
  moduleContentHasBody,
  moduleContentSummary,
  moduleLearningContentToMarkdown,
} from "./module-content-format";

function sampleContent() {
  const content = emptyModuleLearningContent();
  content.introduction.description = "Modul ini membahas nilai Pancasila.";
  content.introduction.learningOutcomes = ["Menjelaskan sila pertama"];
  content.activities = [
    {
      title: "Memahami Pancasila",
      content: "Uraian materi kegiatan pertama.",
      caseStudy: "Studi kasus gotong royong.",
      reflectionPrompts: ["Apa makna sila kedua?"],
      summary: "Rangkuman kegiatan.",
    },
  ];
  content.assessment.formativeQuestions = [
    { question: "Sebutkan isi sila ketiga.", answer: "Persatuan Indonesia" },
  ];
  content.support.glossary = [
    { term: "Pancasila", definition: "Dasar negara Indonesia" },
  ];
  return content;
}

describe("evaluateModulePublishReadiness", () => {
  it("menandai konten kosong sebagai belum siap", () => {
    const result = evaluateModulePublishReadiness(emptyModuleLearningContent());
    expect(result.ready).toBe(false);
    expect(result.missing.length).toBe(3);
  });

  it("menandai konten lengkap sebagai siap", () => {
    const result = evaluateModulePublishReadiness(sampleContent());
    expect(result.ready).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("mendeteksi kekurangan tes formatif", () => {
    const content = sampleContent();
    content.assessment.formativeQuestions = [];
    const result = evaluateModulePublishReadiness(content);
    expect(result.ready).toBe(false);
    expect(result.missing).toContain("Minimal satu pertanyaan tes formatif");
  });
});

describe("moduleContentHasBody", () => {
  it("false untuk konten kosong", () => {
    expect(moduleContentHasBody(emptyModuleLearningContent())).toBe(false);
  });

  it("true bila ada deskripsi pendahuluan", () => {
    const content = emptyModuleLearningContent();
    content.introduction.description = "Ada isi";
    expect(moduleContentHasBody(content)).toBe(true);
  });

  it("true bila ada kegiatan berisi", () => {
    const content = emptyModuleLearningContent();
    content.activities = [
      {
        title: "",
        content: "Materi",
        caseStudy: "",
        reflectionPrompts: [],
        summary: "",
      },
    ];
    expect(moduleContentHasBody(content)).toBe(true);
  });
});

describe("moduleLearningContentToMarkdown", () => {
  it("merender bagian utama tanpa kunci jawaban", () => {
    const md = moduleLearningContentToMarkdown(sampleContent(), "Modul PKn");
    expect(md).toContain("## Pendahuluan");
    expect(md).toContain("## Memahami Pancasila");
    expect(md).toContain("### Studi Kasus");
    expect(md).toContain("## Tes Formatif");
    expect(md).toContain("## Glosarium");
    // Kunci jawaban tidak boleh muncul.
    expect(md).not.toContain("Persatuan Indonesia");
  });

  it("memberi placeholder bila konten kosong", () => {
    const md = moduleLearningContentToMarkdown(
      emptyModuleLearningContent(),
      "Modul Kosong",
    );
    expect(md).toContain("Modul Kosong");
    expect(md).toContain("Materi belum tersedia");
  });
});

describe("moduleContentSummary", () => {
  it("memakai deskripsi pendahuluan bila ada", () => {
    expect(moduleContentSummary(sampleContent())).toContain("Pancasila");
  });

  it("kosong bila tidak ada isi", () => {
    expect(moduleContentSummary(emptyModuleLearningContent())).toBe("");
  });
});
