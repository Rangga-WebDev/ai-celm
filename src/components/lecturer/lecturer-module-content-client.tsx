/** @format */

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  FileText,
  ListChecks,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import {
  emptyModuleLearningContent,
  type ModuleLearningContent,
  normalizeModuleLearningContent,
} from "@/lib/validators/module-content.schema";
import { evaluateModulePublishReadiness } from "@/lib/materials/module-content-format";

type LecturerModuleContentClientProps = {
  user: {
    id: string;
    email: string;
    role: string;
  };
  courseSlug: string;
  moduleId: string;
};

type MaterialOption = {
  id: string;
  title: string;
  fileName: string;
  charCount: number | null;
  moduleId: string | null;
};

type ContentResponse = {
  success: boolean;
  message: string;
  data: {
    course: { title: string; slug: string };
    module: {
      id: string;
      title: string;
      description: string | null;
      generatedByAi: boolean;
      sourceMaterialId: string | null;
      updatedAt: string | null;
    };
    content: ModuleLearningContent;
    materials: MaterialOption[];
  };
};

export default function LecturerModuleContentClient({
  user,
  courseSlug,
  moduleId,
}: LecturerModuleContentClientProps) {
  const [moduleTitle, setModuleTitle] = useState("");
  const [content, setContent] = useState<ModuleLearningContent>(
    emptyModuleLearningContent(),
  );
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [generatedByAi, setGeneratedByAi] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<"ai" | "raw" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [quizGenerating, setQuizGenerating] = useState(false);
  const [generatedQuizId, setGeneratedQuizId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const basePath = `/api/lecturers/${user.id}/courses/${courseSlug}/modules/${moduleId}/content`;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(basePath, { cache: "no-store" });
      const json = (await res.json()) as ContentResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat konten modul");
      }

      setModuleTitle(json.data.module.title);
      setContent(normalizeModuleLearningContent(json.data.content));
      setMaterials(json.data.materials);
      setGeneratedByAi(json.data.module.generatedByAi);
      setSelectedMaterialId(json.data.module.sourceMaterialId ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGenerate(mode: "ai" | "raw") {
    if (!selectedMaterialId) {
      setError("Pilih materi PDF sumber terlebih dahulu.");
      return;
    }

    const confirmMsg =
      mode === "ai"
        ? "Buat ulang konten modul dengan AI? Konten yang ada akan ditimpa."
        : "Jadikan teks PDF sebagai konten modul? Konten yang ada akan ditimpa.";
    if (!window.confirm(confirmMsg)) return;

    setGenerating(mode);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(`${basePath}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId: selectedMaterialId, mode }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal membuat konten modul");
      }

      setContent(normalizeModuleLearningContent(json.data.content));
      setGeneratedByAi(Boolean(json.data.generatedByAi));
      setNotice(json.message as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(null);
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("moduleId", moduleId);

      const res = await fetch(
        `/api/lecturers/${user.id}/courses/${courseSlug}/materials`,
        { method: "POST", body: formData },
      );
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengunggah materi.");
      }

      const uploaded = json.data as {
        id: string;
        title: string;
        fileName: string;
        charCount: number | null;
        status: string;
        moduleId: string | null;
      };

      if (uploaded.status !== "READY") {
        setError(
          "Materi terunggah, tetapi teksnya tidak terbaca (mungkin PDF hasil pindai/gambar). Coba berkas lain.",
        );
      } else {
        setMaterials((prev) => [
          {
            id: uploaded.id,
            title: uploaded.title,
            fileName: uploaded.fileName,
            charCount: uploaded.charCount,
            moduleId: uploaded.moduleId,
          },
          ...prev,
        ]);
        setSelectedMaterialId(uploaded.id);
        setNotice(
          "Materi PDF berhasil diunggah. Klik 'Buat dengan AI' untuk menyusun modul.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void handleUpload(file);
    }
  }

  async function handleGenerateQuiz() {
    if (!selectedMaterialId) {
      setError("Pilih atau unggah materi PDF terlebih dahulu.");
      return;
    }

    setQuizGenerating(true);
    setError(null);
    setNotice(null);
    setGeneratedQuizId(null);

    try {
      const res = await fetch(
        `/api/lecturers/${user.id}/courses/${courseSlug}/quizzes/ai-generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            materialId: selectedMaterialId,
            moduleId,
            questionCount: 5,
          }),
        },
      );
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal membuat kuis dari modul.");
      }

      setGeneratedQuizId(json.data?.quizId ?? null);
      setNotice(
        json.message ||
          "Kuis draf berhasil dibuat. Tinjau dan terbitkan dari menu Kuis.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setQuizGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(basePath, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan konten modul");
      }

      setGeneratedByAi(false);
      setNotice(json.message as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  // ---- Helper pembaruan konten ----
  function patchIntro(patch: Partial<ModuleLearningContent["introduction"]>) {
    setContent((c) => ({
      ...c,
      introduction: { ...c.introduction, ...patch },
    }));
  }

  function patchAssessment(
    patch: Partial<ModuleLearningContent["assessment"]>,
  ) {
    setContent((c) => ({ ...c, assessment: { ...c.assessment, ...patch } }));
  }

  function patchSupport(patch: Partial<ModuleLearningContent["support"]>) {
    setContent((c) => ({ ...c, support: { ...c.support, ...patch } }));
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-3xl bg-slate-200" />
        <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/lecturer/courses/${courseSlug}/modules`}
        className="inline-flex items-center gap-2 text-base font-medium text-teal-700 transition hover:text-teal-800"
      >
        <ArrowLeft size={18} aria-hidden />
        Kembali ke Daftar Modul
      </Link>

      <div className="rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm">
          Konten Belajar
        </span>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          {moduleTitle || "Modul"}
        </h1>
        <p className="mt-2 max-w-2xl text-base text-teal-50">
          Susun modul ajar terstruktur (pendahuluan, kegiatan belajar, evaluasi,
          dan pendukung). Anda bisa menulis manual, mengunggah dari PDF, atau
          dibuatkan AI dari PDF.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {generatedByAi ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm">
              <Sparkles size={14} aria-hidden />
              Draf dibuat AI
            </span>
          ) : null}
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-base font-semibold text-teal-700 transition hover:bg-teal-50 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" aria-hidden />
            ) : (
              <Save size={18} aria-hidden />
            )}
            Simpan Konten
          </button>
        </div>
      </div>

      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base text-emerald-700">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-700">
          {error}
        </div>
      ) : null}

      <PublishChecklist content={content} />

      {/* Panel pembuatan dari PDF / AI */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">
          Buat dari PDF atau AI
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Unggah PDF baru di sini, atau pilih materi PDF yang sudah ada di kelas
          ini.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-teal-300 bg-teal-50/60 px-4 py-4">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 size={18} className="animate-spin" aria-hidden />
            ) : (
              <Upload size={18} aria-hidden />
            )}
            {uploading ? "Mengunggah..." : "Unggah PDF Modul"}
          </button>
          <span className="text-sm text-slate-600">
            Format PDF, Word, TXT, atau Markdown (maks 15 MB). Teks akan dibaca
            otomatis untuk bahan AI.
          </span>
        </div>

        {materials.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-800">
            Belum ada materi PDF siap pakai. Unggah PDF di atas untuk memulai.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <select
              value={selectedMaterialId}
              onChange={(event) => setSelectedMaterialId(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              <option value="">Pilih materi PDF...</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.title} ({material.fileName})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={generating !== null || !selectedMaterialId}
              onClick={() => handleGenerate("ai")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
            >
              {generating === "ai" ? (
                <Loader2 size={18} className="animate-spin" aria-hidden />
              ) : (
                <Sparkles size={18} aria-hidden />
              )}
              Buat dengan AI
            </button>
            <button
              type="button"
              disabled={generating !== null || !selectedMaterialId}
              onClick={() => handleGenerate("raw")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {generating === "raw" ? (
                <Loader2 size={18} className="animate-spin" aria-hidden />
              ) : (
                <Upload size={18} aria-hidden />
              )}
              Jadikan Modul dari PDF
            </button>
          </div>
        )}
      </section>

      {/* Panel pembuatan kuis dari modul */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <ListChecks size={20} aria-hidden className="text-teal-600" />
              Kuis dari Modul
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              AI menyusun soal pilihan ganda dari materi terpilih, otomatis
              terkait modul ini. Tinjau dan terbitkan di menu Kuis.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {generatedQuizId ? (
              <Link
                href={`/lecturer/courses/${courseSlug}/quizzes/${generatedQuizId}`}
                className="inline-flex items-center gap-2 rounded-2xl border border-teal-200 px-4 py-3 text-base font-semibold text-teal-700 transition hover:bg-teal-50"
              >
                Buka Kuis
              </Link>
            ) : null}
            <button
              type="button"
              disabled={quizGenerating || !selectedMaterialId}
              onClick={handleGenerateQuiz}
              className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
            >
              {quizGenerating ? (
                <Loader2 size={18} className="animate-spin" aria-hidden />
              ) : (
                <Sparkles size={18} aria-hidden />
              )}
              Buat Kuis dari Modul
            </button>
          </div>
        </div>
        {!selectedMaterialId ? (
          <p className="mt-3 text-sm text-amber-700">
            Pilih atau unggah materi PDF di atas terlebih dahulu untuk membuat
            kuis.
          </p>
        ) : null}
      </section>

      {/* I. Pendahuluan */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">I. Pendahuluan</h2>
        <div className="mt-4 grid gap-4">
          <StringListEditor
            label="Capaian Pembelajaran"
            placeholder="Mis. Mahasiswa mampu menganalisis nilai Pancasila..."
            values={content.introduction.learningOutcomes}
            onChange={(learningOutcomes) => patchIntro({ learningOutcomes })}
          />
          <Field
            label="Deskripsi Singkat"
            value={content.introduction.description}
            onChange={(description) => patchIntro({ description })}
            rows={3}
            placeholder="Gambaran umum ruang lingkup dan urgensi materi"
          />
          <Field
            label="Prasyarat"
            value={content.introduction.prerequisites}
            onChange={(prerequisites) => patchIntro({ prerequisites })}
            rows={2}
            placeholder="Pengetahuan/modul yang harus dikuasai sebelumnya"
          />
          <Field
            label="Petunjuk Penggunaan Modul"
            value={content.introduction.usageGuide}
            onChange={(usageGuide) => patchIntro({ usageGuide })}
            rows={3}
            placeholder="Cara mempelajari modul, estimasi waktu, tools yang disiapkan"
          />
        </div>
      </section>

      {/* II. Kegiatan Belajar */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">
            II. Kegiatan Belajar
          </h2>
          <button
            type="button"
            onClick={() =>
              setContent((c) => ({
                ...c,
                activities: [
                  ...c.activities,
                  {
                    title: "",
                    content: "",
                    caseStudy: "",
                    reflectionPrompts: [],
                    summary: "",
                  },
                ],
              }))
            }
            className="inline-flex items-center gap-1 rounded-2xl border border-teal-200 px-4 py-2.5 text-base font-medium text-teal-700 transition hover:bg-teal-50"
          >
            <Plus size={16} aria-hidden />
            Tambah Kegiatan
          </button>
        </div>

        <div className="mt-4 grid gap-4">
          {content.activities.length === 0 ? (
            <p className="text-base text-slate-600">
              Belum ada kegiatan belajar. Tambahkan minimal satu kegiatan.
            </p>
          ) : null}

          {content.activities.map((activity, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-bold text-slate-900">
                  Kegiatan Belajar {index + 1}
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setContent((c) => ({
                      ...c,
                      activities: c.activities.filter((_, i) => i !== index),
                    }))
                  }
                  className="inline-flex items-center gap-1 rounded-2xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                >
                  <Trash2 size={15} aria-hidden />
                  Hapus
                </button>
              </div>

              <div className="mt-3 grid gap-3">
                <Field
                  label="Judul Kegiatan"
                  value={activity.title}
                  onChange={(title) =>
                    setContent((c) => ({
                      ...c,
                      activities: c.activities.map((a, i) =>
                        i === index ? { ...a, title } : a,
                      ),
                    }))
                  }
                  rows={1}
                  placeholder="Judul kegiatan belajar"
                />
                <Field
                  label="Uraian Materi"
                  value={activity.content}
                  onChange={(value) =>
                    setContent((c) => ({
                      ...c,
                      activities: c.activities.map((a, i) =>
                        i === index ? { ...a, content: value } : a,
                      ),
                    }))
                  }
                  rows={8}
                  placeholder="Penjelasan konsep secara mendalam dengan bahasa komunikatif"
                />
                <Field
                  label="Studi Kasus / Contoh Nyata"
                  value={activity.caseStudy}
                  onChange={(caseStudy) =>
                    setContent((c) => ({
                      ...c,
                      activities: c.activities.map((a, i) =>
                        i === index ? { ...a, caseStudy } : a,
                      ),
                    }))
                  }
                  rows={3}
                  placeholder="Masalah nyata di lapangan yang relevan dengan teori"
                />
                <StringListEditor
                  label="Pertanyaan Refleksi (Prompt Sisipan)"
                  placeholder="Pertanyaan pemicu berpikir aktif"
                  values={activity.reflectionPrompts}
                  onChange={(reflectionPrompts) =>
                    setContent((c) => ({
                      ...c,
                      activities: c.activities.map((a, i) =>
                        i === index ? { ...a, reflectionPrompts } : a,
                      ),
                    }))
                  }
                />
                <Field
                  label="Rangkuman"
                  value={activity.summary}
                  onChange={(summary) =>
                    setContent((c) => ({
                      ...c,
                      activities: c.activities.map((a, i) =>
                        i === index ? { ...a, summary } : a,
                      ),
                    }))
                  }
                  rows={3}
                  placeholder="Intisari materi dalam poin-poin padat"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* III. Evaluasi & Tindak Lanjut */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">
          III. Evaluasi &amp; Tindak Lanjut
        </h2>

        <div className="mt-4 grid gap-4">
          <Field
            label="Tugas Mandiri / Proyek"
            value={content.assessment.assignment}
            onChange={(assignment) => patchAssessment({ assignment })}
            rows={4}
            placeholder="Instruksi kerja atau tugas analisis kasus mandiri"
          />
          <Field
            label="Rubrik Penilaian"
            value={content.assessment.rubric}
            onChange={(rubric) => patchAssessment({ rubric })}
            rows={4}
            placeholder="Standar penilaian yang transparan"
          />

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                Tes Formatif (soal + kunci)
              </span>
              <button
                type="button"
                onClick={() =>
                  patchAssessment({
                    formativeQuestions: [
                      ...content.assessment.formativeQuestions,
                      { question: "", answer: "" },
                    ],
                  })
                }
                className="inline-flex items-center gap-1 text-base font-medium text-teal-700 transition hover:text-teal-800"
              >
                <Plus size={16} aria-hidden />
                Tambah Soal
              </button>
            </div>
            {content.assessment.formativeQuestions.map((item, index) => (
              <div
                key={index}
                className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex items-start gap-2">
                  <input
                    type="text"
                    value={item.question}
                    onChange={(event) =>
                      patchAssessment({
                        formativeQuestions:
                          content.assessment.formativeQuestions.map((q, i) =>
                            i === index
                              ? { ...q, question: event.target.value }
                              : q,
                          ),
                      })
                    }
                    placeholder="Pertanyaan"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      patchAssessment({
                        formativeQuestions:
                          content.assessment.formativeQuestions.filter(
                            (_, i) => i !== index,
                          ),
                      })
                    }
                    className="shrink-0 rounded-xl border border-slate-200 p-2.5 text-slate-400 transition hover:text-rose-600"
                    aria-label="Hapus soal"
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </div>
                <input
                  type="text"
                  value={item.answer}
                  onChange={(event) =>
                    patchAssessment({
                      formativeQuestions:
                        content.assessment.formativeQuestions.map((q, i) =>
                          i === index
                            ? { ...q, answer: event.target.value }
                            : q,
                        ),
                    })
                  }
                  placeholder="Kunci jawaban"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>
            ))}
          </div>

          <Field
            label="Aturan Ketuntasan / Umpan Balik"
            value={content.assessment.masteryRule}
            onChange={(masteryRule) => patchAssessment({ masteryRule })}
            rows={2}
            placeholder="Mis. Jika skor >80% lanjut ke modul berikutnya, jika <80% ulangi"
          />
        </div>
      </section>

      {/* IV. Pendukung */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">IV. Pendukung</h2>

        <div className="mt-4 grid gap-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                Glosarium
              </span>
              <button
                type="button"
                onClick={() =>
                  patchSupport({
                    glossary: [
                      ...content.support.glossary,
                      { term: "", definition: "" },
                    ],
                  })
                }
                className="inline-flex items-center gap-1 text-base font-medium text-teal-700 transition hover:text-teal-800"
              >
                <Plus size={16} aria-hidden />
                Tambah Istilah
              </button>
            </div>
            {content.support.glossary.map((item, index) => (
              <div key={index} className="flex items-start gap-2">
                <input
                  type="text"
                  value={item.term}
                  onChange={(event) =>
                    patchSupport({
                      glossary: content.support.glossary.map((g, i) =>
                        i === index ? { ...g, term: event.target.value } : g,
                      ),
                    })
                  }
                  placeholder="Istilah"
                  className="w-40 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
                <input
                  type="text"
                  value={item.definition}
                  onChange={(event) =>
                    patchSupport({
                      glossary: content.support.glossary.map((g, i) =>
                        i === index
                          ? { ...g, definition: event.target.value }
                          : g,
                      ),
                    })
                  }
                  placeholder="Definisi"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
                <button
                  type="button"
                  onClick={() =>
                    patchSupport({
                      glossary: content.support.glossary.filter(
                        (_, i) => i !== index,
                      ),
                    })
                  }
                  className="shrink-0 rounded-xl border border-slate-200 p-2.5 text-slate-400 transition hover:text-rose-600"
                  aria-label="Hapus istilah"
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </div>
            ))}
          </div>

          <StringListEditor
            label="Daftar Pustaka"
            placeholder="Sumber referensi (buku, jurnal, dokumentasi)"
            values={content.support.references}
            onChange={(references) => patchSupport({ references })}
          />

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                Link Pengayaan
              </span>
              <button
                type="button"
                onClick={() =>
                  patchSupport({
                    furtherReading: [
                      ...content.support.furtherReading,
                      { label: "", url: "" },
                    ],
                  })
                }
                className="inline-flex items-center gap-1 text-base font-medium text-teal-700 transition hover:text-teal-800"
              >
                <Plus size={16} aria-hidden />
                Tambah Link
              </button>
            </div>
            {content.support.furtherReading.map((item, index) => (
              <div key={index} className="flex items-start gap-2">
                <input
                  type="text"
                  value={item.label}
                  onChange={(event) =>
                    patchSupport({
                      furtherReading: content.support.furtherReading.map(
                        (r, i) =>
                          i === index ? { ...r, label: event.target.value } : r,
                      ),
                    })
                  }
                  placeholder="Judul/label"
                  className="w-48 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
                <input
                  type="url"
                  value={item.url}
                  onChange={(event) =>
                    patchSupport({
                      furtherReading: content.support.furtherReading.map(
                        (r, i) =>
                          i === index ? { ...r, url: event.target.value } : r,
                      ),
                    })
                  }
                  placeholder="https://..."
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
                <button
                  type="button"
                  onClick={() =>
                    patchSupport({
                      furtherReading: content.support.furtherReading.filter(
                        (_, i) => i !== index,
                      ),
                    })
                  }
                  className="shrink-0 rounded-xl border border-slate-200 p-2.5 text-slate-400 transition hover:text-rose-600"
                  aria-label="Hapus link"
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" aria-hidden />
          ) : (
            <Save size={18} aria-hidden />
          )}
          Simpan Konten
        </button>
      </div>
    </div>
  );
}

function PublishChecklist({ content }: { content: ModuleLearningContent }) {
  const readiness = evaluateModulePublishReadiness(content);

  const items = [
    {
      label: "Deskripsi pendahuluan terisi",
      done: content.introduction.description.trim().length > 0,
    },
    {
      label: "Minimal satu kegiatan belajar berisi",
      done: content.activities.some((a) => a.content.trim().length > 0),
    },
    {
      label: "Minimal satu pertanyaan tes formatif",
      done: content.assessment.formativeQuestions.some(
        (q) => q.question.trim().length > 0,
      ),
    },
  ];

  return (
    <section
      className={`rounded-3xl border p-5 ${
        readiness.ready
          ? "border-emerald-200 bg-emerald-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <h2 className="text-base font-bold text-slate-900">
        Kelengkapan untuk diterbitkan
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        {readiness.ready
          ? "Konten sudah lengkap. Menyimpan akan otomatis membuat bagian 'Materi Pembelajaran' untuk mahasiswa, sehingga progres tidak 0/0."
          : "Lengkapi item berikut agar modul bisa diterbitkan dan tidak tampil 0/0 di halaman belajar mahasiswa."}
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-base">
            {item.done ? (
              <CheckCircle2
                size={18}
                className="shrink-0 text-emerald-600"
                aria-hidden
              />
            ) : (
              <Circle
                size={18}
                className="shrink-0 text-slate-400"
                aria-hidden
              />
            )}
            <span className={item.done ? "text-slate-700" : "text-slate-600"}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  rows,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
      />
    </div>
  );
}

function StringListEditor({
  label,
  placeholder,
  values,
  onChange,
}: {
  label: string;
  placeholder?: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <button
          type="button"
          onClick={() => onChange([...values, ""])}
          className="inline-flex items-center gap-1 text-base font-medium text-teal-700 transition hover:text-teal-800"
        >
          <Plus size={16} aria-hidden />
          Tambah
        </button>
      </div>
      {values.length === 0 ? (
        <p className="text-sm text-slate-400">
          <FileText size={14} className="mr-1 inline" aria-hidden />
          Belum ada item.
        </p>
      ) : null}
      {values.map((value, index) => (
        <div key={index} className="flex items-start gap-2">
          <input
            type="text"
            value={value}
            onChange={(event) =>
              onChange(
                values.map((v, i) => (i === index ? event.target.value : v)),
              )
            }
            placeholder={placeholder}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
          <button
            type="button"
            onClick={() => onChange(values.filter((_, i) => i !== index))}
            className="shrink-0 rounded-xl border border-slate-200 p-2.5 text-slate-400 transition hover:text-rose-600"
            aria-label="Hapus item"
          >
            <Trash2 size={16} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
