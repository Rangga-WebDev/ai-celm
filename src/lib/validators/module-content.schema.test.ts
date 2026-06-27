/** @format */

import { describe, it, expect } from "vitest";
import {
  emptyModuleLearningContent,
  normalizeModuleLearningContent,
} from "./module-content.schema";

describe("emptyModuleLearningContent", () => {
  it("mengembalikan struktur kosong yang lengkap", () => {
    const empty = emptyModuleLearningContent();
    expect(empty.introduction.learningOutcomes).toEqual([]);
    expect(empty.introduction.description).toBe("");
    expect(empty.activities).toEqual([]);
    expect(empty.assessment.formativeQuestions).toEqual([]);
    expect(empty.support.glossary).toEqual([]);
    expect(empty.support.references).toEqual([]);
    expect(empty.support.furtherReading).toEqual([]);
  });
});

describe("normalizeModuleLearningContent", () => {
  it("mengembalikan struktur kosong untuk null/undefined", () => {
    expect(normalizeModuleLearningContent(null)).toEqual(
      emptyModuleLearningContent(),
    );
    expect(normalizeModuleLearningContent(undefined)).toEqual(
      emptyModuleLearningContent(),
    );
  });

  it("mengembalikan struktur kosong untuk objek kosong", () => {
    expect(normalizeModuleLearningContent({})).toEqual(
      emptyModuleLearningContent(),
    );
  });

  it("mengembalikan struktur kosong untuk nilai tidak valid", () => {
    expect(normalizeModuleLearningContent("bukan objek")).toEqual(
      emptyModuleLearningContent(),
    );
    expect(normalizeModuleLearningContent(42)).toEqual(
      emptyModuleLearningContent(),
    );
  });

  it("mengisi default untuk konten parsial", () => {
    const result = normalizeModuleLearningContent({
      introduction: { description: "Pendahuluan" },
    });
    expect(result.introduction.description).toBe("Pendahuluan");
    expect(result.introduction.learningOutcomes).toEqual([]);
    expect(result.activities).toEqual([]);
    expect(result.assessment.assignment).toBe("");
  });

  it("mempertahankan konten aktivitas yang valid", () => {
    const result = normalizeModuleLearningContent({
      activities: [
        {
          title: "Aktivitas 1",
          content: "Isi materi",
          reflectionPrompts: ["Apa pendapatmu?"],
        },
      ],
    });
    expect(result.activities).toHaveLength(1);
    expect(result.activities[0].title).toBe("Aktivitas 1");
    expect(result.activities[0].reflectionPrompts).toEqual(["Apa pendapatmu?"]);
    expect(result.activities[0].summary).toBe("");
  });

  it("memangkas spasi pada string", () => {
    const result = normalizeModuleLearningContent({
      introduction: { description: "  Pendahuluan  " },
    });
    expect(result.introduction.description).toBe("Pendahuluan");
  });
});
