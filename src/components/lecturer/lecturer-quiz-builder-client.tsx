/** @format */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  Lock,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

type LecturerQuizBuilderClientProps = {
  user: {
    id: string;
    email: string;
    role: string;
  };
  courseSlug: string;
  quizId: string;
};

type OptionDraft = {
  optionText: string;
  isCorrect: boolean;
};

type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY";

type QuestionDraft = {
  questionText: string;
  questionType: QuestionType;
  explanation: string;
  referenceAnswer: string;
  gradingCriteria: string;
  points: number;
  options: OptionDraft[];
};

type QuizMeta = {
  title: string;
  description: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  timeLimitMinutes: string;
  dueAt: string;
  sourceMaterialId: string;
  passingScore: number;
  showScoreToStudent: boolean;
};

type MaterialOption = {
  id: string;
  title: string;
  fileName: string;
};

function isChoiceType(type: QuestionType): boolean {
  return type === "MULTIPLE_CHOICE" || type === "TRUE_FALSE";
}

function toDateTimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type QuizResponse = {
  success: boolean;
  message: string;
  data: {
    quiz: {
      id: string;
      title: string;
      description: string | null;
      status: string;
      timeLimitMinutes: number | null;
      dueAt: string | null;
      sourceMaterialId: string | null;
      passingScore: number;
      showScoreToStudent: boolean;
      module: { id: string; title: string; slug: string };
      questions: Array<{
        id: string;
        questionText: string;
        questionType: string;
        explanation: string | null;
        referenceAnswer: string | null;
        gradingCriteria: string | null;
        order: number;
        points: number;
        options: Array<{
          id: string;
          optionText: string;
          isCorrect: boolean;
          order: number;
        }>;
      }>;
      _count: { attempts: number };
    };
  };
};

function emptyMcQuestion(): QuestionDraft {
  return {
    questionText: "",
    questionType: "MULTIPLE_CHOICE",
    explanation: "",
    referenceAnswer: "",
    gradingCriteria: "",
    points: 1,
    options: [
      { optionText: "", isCorrect: true },
      { optionText: "", isCorrect: false },
    ],
  };
}

function trueFalseOptions(): OptionDraft[] {
  return [
    { optionText: "Benar", isCorrect: true },
    { optionText: "Salah", isCorrect: false },
  ];
}

export default function LecturerQuizBuilderClient({
  user,
  courseSlug,
  quizId,
}: LecturerQuizBuilderClientProps) {
  const [moduleTitle, setModuleTitle] = useState("");
  const [meta, setMeta] = useState<QuizMeta>({
    title: "",
    description: "",
    status: "DRAFT",
    timeLimitMinutes: "",
    dueAt: "",
    sourceMaterialId: "",
    passingScore: 75,
    showScoreToStudent: true,
  });
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [attemptsCount, setAttemptsCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const basePath = `/api/lecturers/${user.id}/courses/${courseSlug}/quizzes/${quizId}`;
  const materialsPath = `/api/lecturers/${user.id}/courses/${courseSlug}/materials`;
  const questionsLocked = attemptsCount > 0;

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [res, materialsRes] = await Promise.all([
          fetch(basePath, { cache: "no-store" }),
          fetch(materialsPath, { cache: "no-store" }),
        ]);
        const json = (await res.json()) as QuizResponse;

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal memuat kuis");
        }

        if (materialsRes.ok) {
          const materialsJson = (await materialsRes.json()) as {
            success: boolean;
            data?: Array<{ id: string; title: string; fileName: string }>;
          };
          if (materialsJson.success && Array.isArray(materialsJson.data)) {
            setMaterials(
              materialsJson.data.map((m) => ({
                id: m.id,
                title: m.title,
                fileName: m.fileName,
              })),
            );
          }
        }

        const quiz = json.data.quiz;
        setModuleTitle(quiz.module.title);
        setMeta({
          title: quiz.title,
          description: quiz.description ?? "",
          status: quiz.status as QuizMeta["status"],
          timeLimitMinutes:
            quiz.timeLimitMinutes !== null ? String(quiz.timeLimitMinutes) : "",
          dueAt: toDateTimeLocal(quiz.dueAt),
          sourceMaterialId: quiz.sourceMaterialId ?? "",
          passingScore: quiz.passingScore,
          showScoreToStudent: quiz.showScoreToStudent,
        });
        setAttemptsCount(quiz._count.attempts);
        setQuestions(
          quiz.questions.map((q) => {
            const type =
              q.questionType === "TRUE_FALSE" ||
              q.questionType === "SHORT_ANSWER" ||
              q.questionType === "ESSAY"
                ? (q.questionType as QuestionType)
                : "MULTIPLE_CHOICE";
            return {
              questionText: q.questionText,
              questionType: type,
              explanation: q.explanation ?? "",
              referenceAnswer: q.referenceAnswer ?? "",
              gradingCriteria: q.gradingCriteria ?? "",
              points: q.points,
              options: q.options.map((o) => ({
                optionText: o.optionText,
                isCorrect: o.isCorrect,
              })),
            };
          }),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [basePath, materialsPath]);

  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
  }

  function setQuestionType(index: number, type: QuestionType) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q;
        if (type === "TRUE_FALSE") {
          return { ...q, questionType: type, options: trueFalseOptions() };
        }
        if (type === "SHORT_ANSWER" || type === "ESSAY") {
          return { ...q, questionType: type, options: [] };
        }
        return {
          ...q,
          questionType: type,
          options:
            q.options.length >= 2
              ? q.options
              : [
                  { optionText: "", isCorrect: true },
                  { optionText: "", isCorrect: false },
                ],
        };
      }),
    );
  }

  function updateOption(
    qIndex: number,
    oIndex: number,
    patch: Partial<OptionDraft>,
  ) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        return {
          ...q,
          options: q.options.map((o, j) =>
            j === oIndex ? { ...o, ...patch } : o,
          ),
        };
      }),
    );
  }

  function setCorrectOption(qIndex: number, oIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        return {
          ...q,
          options: q.options.map((o, j) => ({ ...o, isCorrect: j === oIndex })),
        };
      }),
    );
  }

  function addOption(qIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        if (q.options.length >= 6) return q;
        return {
          ...q,
          options: [...q.options, { optionText: "", isCorrect: false }],
        };
      }),
    );
  }

  function removeOption(qIndex: number, oIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        if (q.options.length <= 2) return q;
        const nextOptions = q.options.filter((_, j) => j !== oIndex);
        if (!nextOptions.some((o) => o.isCorrect)) {
          nextOptions[0].isCorrect = true;
        }
        return { ...q, options: nextOptions };
      }),
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyMcQuestion()]);
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setNotice(null);
    setError(null);

    try {
      const timeLimit = meta.timeLimitMinutes.trim();
      const payload: Record<string, unknown> = {
        title: meta.title,
        description: meta.description,
        status: meta.status,
        timeLimitMinutes:
          timeLimit === "" ? null : Number.parseInt(timeLimit, 10),
        dueAt: meta.dueAt.trim() === "" ? null : meta.dueAt,
        sourceMaterialId:
          meta.sourceMaterialId === "" ? null : meta.sourceMaterialId,
        passingScore: meta.passingScore,
        showScoreToStudent: meta.showScoreToStudent,
      };

      if (!questionsLocked) {
        payload.questions = questions.map((q) => ({
          questionText: q.questionText,
          questionType: q.questionType,
          explanation: q.explanation,
          referenceAnswer: q.referenceAnswer,
          gradingCriteria: q.gradingCriteria,
          points: q.points,
          options: isChoiceType(q.questionType)
            ? q.options.map((o) => ({
                optionText: o.optionText,
                isCorrect: o.isCorrect,
              }))
            : [],
        }));
      }

      const res = await fetch(basePath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan kuis");
      }

      setNotice(json.message as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
          Memuat...
        </div>
      </div>
    );
  }

  const statusBadgeClass =
    meta.status === "PUBLISHED"
      ? "bg-emerald-100 text-emerald-700"
      : meta.status === "DRAFT"
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-600";
  const statusBadgeLabel =
    meta.status === "PUBLISHED"
      ? "Terbit"
      : meta.status === "DRAFT"
        ? "Draf"
        : "Arsip";

  return (
    <div className="space-y-6">
      <Link
        href={`/lecturer/courses/${courseSlug}/quizzes`}
        className="inline-flex items-center gap-2 text-base font-medium text-teal-700 transition hover:text-teal-800"
      >
        <ArrowLeft size={18} aria-hidden />
        Kembali ke Daftar Kuis
      </Link>

      <div className="rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm">
          Modul: {moduleTitle}
        </span>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          {meta.title || "Penyusun Kuis"}
        </h1>
        <p className="mt-2 text-base text-teal-50">
          Susun soal, tandai jawaban benar, lalu terbitkan kuis untuk mahasiswa.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass}`}
          >
            {statusBadgeLabel}
          </span>
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
            Simpan Kuis
          </button>
          {attemptsCount > 0 ? (
            <Link
              href={`/lecturer/courses/${courseSlug}/quizzes/${quizId}/attempts`}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/40 px-5 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Tinjau &amp; Nilai ({attemptsCount})
            </Link>
          ) : null}
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

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">Pengaturan Kuis</h2>

        <div className="mt-4 grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">
              Judul Kuis
            </label>
            <input
              type="text"
              value={meta.title}
              onChange={(event) =>
                setMeta((m) => ({ ...m, title: event.target.value }))
              }
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">
              Deskripsi
            </label>
            <textarea
              value={meta.description}
              onChange={(event) =>
                setMeta((m) => ({ ...m, description: event.target.value }))
              }
              rows={2}
              placeholder="Penjelasan singkat tentang kuis (opsional)"
              className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                value={meta.status}
                onChange={(event) =>
                  setMeta((m) => ({
                    ...m,
                    status: event.target.value as QuizMeta["status"],
                  }))
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="DRAFT">Draf</option>
                <option value="PUBLISHED">Terbit</option>
                <option value="ARCHIVED">Arsip</option>
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                Batas Waktu (menit)
              </label>
              <input
                type="number"
                min={1}
                value={meta.timeLimitMinutes}
                onChange={(event) =>
                  setMeta((m) => ({
                    ...m,
                    timeLimitMinutes: event.target.value,
                  }))
                }
                placeholder="kosongkan = tanpa batas"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                Nilai Lulus
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={meta.passingScore}
                onChange={(event) =>
                  setMeta((m) => ({
                    ...m,
                    passingScore: Number.parseFloat(event.target.value) || 0,
                  }))
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                Tampilkan Nilai
              </label>
              <button
                type="button"
                onClick={() =>
                  setMeta((m) => ({
                    ...m,
                    showScoreToStudent: !m.showScoreToStudent,
                  }))
                }
                className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-base font-medium transition ${
                  meta.showScoreToStudent
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {meta.showScoreToStudent ? "Ya, tampilkan" : "Sembunyikan"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                Tenggat Pengumpulan
              </label>
              <input
                type="datetime-local"
                value={meta.dueAt}
                onChange={(event) =>
                  setMeta((m) => ({ ...m, dueAt: event.target.value }))
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
              <p className="text-xs text-slate-500">
                Kosongkan jika kuis tanpa tenggat. Setelah lewat, mahasiswa
                tidak bisa mengumpulkan.
              </p>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                Materi Sumber (untuk penilaian AI)
              </label>
              <select
                value={meta.sourceMaterialId}
                onChange={(event) =>
                  setMeta((m) => ({
                    ...m,
                    sourceMaterialId: event.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="">Tidak ada materi sumber</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.title} ({material.fileName})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                AI menilai jawaban esai/isian singkat berdasarkan materi PDF
                ini.
              </p>
            </div>
          </div>
        </div>
      </section>

      {questionsLocked ? (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-800">
          <Lock size={18} aria-hidden className="mt-0.5 shrink-0" />
          <span>
            Soal tidak dapat diubah karena kuis sudah dikerjakan {attemptsCount}{" "}
            mahasiswa. Kamu masih bisa mengubah pengaturan di atas.
          </span>
        </div>
      ) : null}

      <section className="grid gap-4">
        {questions.map((question, qIndex) => (
          <div
            key={qIndex}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900">
                Soal {qIndex + 1}
              </h3>
              {!questionsLocked ? (
                <button
                  type="button"
                  onClick={() => removeQuestion(qIndex)}
                  className="inline-flex items-center gap-1 rounded-2xl border border-rose-200 px-4 py-2.5 text-base font-medium text-rose-600 transition hover:bg-rose-50"
                >
                  <Trash2 size={16} aria-hidden />
                  Hapus
                </button>
              ) : null}
            </div>

            <div className="mt-3 grid gap-3">
              <textarea
                value={question.questionText}
                onChange={(event) =>
                  updateQuestion(qIndex, { questionText: event.target.value })
                }
                disabled={questionsLocked}
                rows={2}
                placeholder="Tulis soal..."
                className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
              />

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={question.questionType}
                  onChange={(event) =>
                    setQuestionType(qIndex, event.target.value as QuestionType)
                  }
                  disabled={questionsLocked}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
                >
                  <option value="MULTIPLE_CHOICE">Pilihan Ganda</option>
                  <option value="TRUE_FALSE">Benar / Salah</option>
                  <option value="SHORT_ANSWER">Isian Singkat (AI)</option>
                  <option value="ESSAY">Esai (AI)</option>
                </select>

                <div className="inline-flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    Poin
                  </span>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={question.points}
                    onChange={(event) =>
                      updateQuestion(qIndex, {
                        points: Number.parseFloat(event.target.value) || 1,
                      })
                    }
                    disabled={questionsLocked}
                    className="w-24 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
                  />
                </div>
              </div>

              {isChoiceType(question.questionType) ? (
                <div className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    Pilihan jawaban (klik lingkaran untuk menandai jawaban
                    benar)
                  </span>
                  {question.options.map((option, oIndex) => (
                    <div
                      key={oIndex}
                      className={`flex items-center gap-2 rounded-2xl border px-3 py-2 transition ${
                        option.isCorrect
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setCorrectOption(qIndex, oIndex)}
                        disabled={questionsLocked}
                        className="shrink-0 text-emerald-600 disabled:opacity-60"
                        aria-label="Tandai jawaban benar"
                      >
                        {option.isCorrect ? (
                          <CheckCircle2 size={22} aria-hidden />
                        ) : (
                          <Circle
                            size={22}
                            aria-hidden
                            className="text-slate-400"
                          />
                        )}
                      </button>
                      <input
                        type="text"
                        value={option.optionText}
                        onChange={(event) =>
                          updateOption(qIndex, oIndex, {
                            optionText: event.target.value,
                          })
                        }
                        disabled={
                          questionsLocked ||
                          question.questionType === "TRUE_FALSE"
                        }
                        placeholder={`Pilihan ${oIndex + 1}`}
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50 disabled:opacity-70"
                      />
                      {!questionsLocked &&
                      question.questionType === "MULTIPLE_CHOICE" &&
                      question.options.length > 2 ? (
                        <button
                          type="button"
                          onClick={() => removeOption(qIndex, oIndex)}
                          className="shrink-0 text-slate-400 transition hover:text-rose-600"
                          aria-label="Hapus pilihan"
                        >
                          <Trash2 size={18} aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  ))}

                  {!questionsLocked &&
                  question.questionType === "MULTIPLE_CHOICE" &&
                  question.options.length < 6 ? (
                    <button
                      type="button"
                      onClick={() => addOption(qIndex)}
                      className="inline-flex w-fit items-center gap-1 text-base font-medium text-teal-700 transition hover:text-teal-800"
                    >
                      <Plus size={16} aria-hidden />
                      Tambah Pilihan
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">
                      Kunci / Jawaban Referensi
                    </label>
                    <textarea
                      value={question.referenceAnswer}
                      onChange={(event) =>
                        updateQuestion(qIndex, {
                          referenceAnswer: event.target.value,
                        })
                      }
                      disabled={questionsLocked}
                      rows={3}
                      placeholder="Jawaban ideal sebagai acuan penilaian AI"
                      className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">
                      Kriteria / Rubrik Penilaian
                    </label>
                    <textarea
                      value={question.gradingCriteria}
                      onChange={(event) =>
                        updateQuestion(qIndex, {
                          gradingCriteria: event.target.value,
                        })
                      }
                      disabled={questionsLocked}
                      rows={3}
                      placeholder="Mis. ketepatan konsep, contoh penerapan, kelengkapan argumen"
                      className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    AI menilai jawaban mahasiswa berdasarkan materi sumber,
                    kunci, dan kriteria di atas.
                  </p>
                </div>
              )}

              <input
                type="text"
                value={question.explanation}
                onChange={(event) =>
                  updateQuestion(qIndex, { explanation: event.target.value })
                }
                disabled={questionsLocked}
                placeholder="Penjelasan jawaban (opsional, tampil setelah dikerjakan)"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
              />
            </div>
          </div>
        ))}

        {!questionsLocked ? (
          <button
            type="button"
            onClick={addQuestion}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-4 text-base font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Plus size={18} aria-hidden />
            Tambah Soal
          </button>
        ) : null}

        {questions.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-base text-slate-600">
            Belum ada soal. Tambahkan soal lalu simpan kuis.
          </div>
        ) : null}
      </section>
    </div>
  );
}
