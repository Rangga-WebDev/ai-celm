/** @format */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";

type LecturerQuizzesClientProps = {
  user: {
    id: string;
    email: string;
    role: string;
  };
  courseSlug: string;
  scopedModuleId?: string;
  embedded?: boolean;
};

type ModuleOption = {
  id: string;
  title: string;
  slug: string;
  order: number;
};

type QuizItem = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  timeLimitMinutes: number | null;
  passingScore: number;
  showScoreToStudent: boolean;
  createdAt: string;
  updatedAt: string;
  module: { id: string; title: string; slug: string; order: number };
  _count: { questions: number; attempts: number };
};

type QuizzesResponse = {
  success: boolean;
  message: string;
  data: {
    course: { id: string; title: string; slug: string };
    modules: ModuleOption[];
    quizzes: QuizItem[];
  };
};

type MaterialOption = {
  id: string;
  title: string;
  status: string;
  charCount: number | null;
  module: { id: string; title: string } | null;
};

function statusBadge(status: string) {
  switch (status) {
    case "PUBLISHED":
      return "bg-emerald-100 text-emerald-700";
    case "ARCHIVED":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "PUBLISHED":
      return "Terbit";
    case "ARCHIVED":
      return "Arsip";
    default:
      return "Draf";
  }
}

export default function LecturerQuizzesClient({
  user,
  courseSlug,
  scopedModuleId,
  embedded = false,
}: LecturerQuizzesClientProps) {
  const [courseTitle, setCourseTitle] = useState("");
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [moduleId, setModuleId] = useState("");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [aiMaterialId, setAiMaterialId] = useState("");
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const basePath = `/api/lecturers/${user.id}/courses/${courseSlug}/quizzes`;

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(basePath, { cache: "no-store" });
        const json = (await res.json()) as QuizzesResponse;

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal memuat kuis");
        }

        setCourseTitle(json.data.course.title);
        setModules(json.data.modules);
        setQuizzes(json.data.quizzes);
        if (scopedModuleId) {
          setModuleId(scopedModuleId);
        } else if (json.data.modules.length > 0 && moduleId === "") {
          setModuleId(json.data.modules[0].id);
        }

        // Ambil daftar materi untuk sumber soal AI (opsional, tidak menggagalkan halaman).
        try {
          const matRes = await fetch(
            `/api/lecturers/${user.id}/courses/${courseSlug}/materials`,
            { cache: "no-store" },
          );
          const matJson = await matRes.json();
          if (matRes.ok && matJson.success) {
            const list = (matJson.data ?? []) as MaterialOption[];
            setMaterials(list);
            const firstReady = list.find((m) => m.status === "READY");
            if (firstReady) {
              setAiMaterialId(firstReady.id);
            }
          }
        } catch {
          // abaikan; panel AI hanya tidak punya pilihan materi
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePath]);

  async function handleCreate() {
    if (title.trim().length === 0) {
      setFormError("Judul kuis wajib diisi");
      return;
    }
    if (moduleId === "") {
      setFormError("Pilih modul terlebih dahulu");
      return;
    }

    setCreating(true);
    setFormError(null);

    try {
      const res = await fetch(basePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, title }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal membuat kuis");
      }

      const created = json.data.quiz as { id: string };
      window.location.href = `/lecturer/courses/${courseSlug}/quizzes/${created.id}`;
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unknown error");
      setCreating(false);
    }
  }

  async function handleGenerateWithAi() {
    if (aiMaterialId === "") {
      setAiError("Pilih materi sumber soal terlebih dahulu.");
      return;
    }

    setAiGenerating(true);
    setAiError(null);

    try {
      const res = await fetch(`${basePath}/ai-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: aiMaterialId,
          questionCount: aiQuestionCount,
          ...(scopedModuleId ? { moduleId: scopedModuleId } : {}),
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal membuat kuis dengan AI");
      }

      const quizId = json.data.quizId as string;
      window.location.href = `/lecturer/courses/${courseSlug}/quizzes/${quizId}`;
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Unknown error");
      setAiGenerating(false);
    }
  }

  async function handleDelete(quiz: QuizItem) {
    const confirmed = window.confirm(
      `Hapus kuis "${quiz.title}"? Semua soal dan percobaan mahasiswa akan ikut terhapus.`,
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${basePath}/${quiz.id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus kuis");
      }

      setQuizzes((prev) => prev.filter((q) => q.id !== quiz.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  const visibleQuizzes = scopedModuleId
    ? quizzes.filter((q) => q.module.id === scopedModuleId)
    : quizzes;

  return (
    <div className="space-y-6">
      {!embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/lecturer/courses/${courseSlug}`}
            className="inline-flex items-center gap-2 text-base font-medium text-teal-700 transition hover:text-teal-800"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Kembali ke Mata Kuliah
          </Link>
        </div>
      ) : null}

      {!embedded ? (
        <section className="rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm">
            <HelpCircle size={16} aria-hidden="true" />
            Pengelolaan Kuis
          </span>
          <p className="mt-4 text-sm text-teal-50">
            {courseTitle || courseSlug}
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Kuis</h1>
          <p className="mt-3 max-w-3xl text-base text-teal-50">
            Buat kuis pilihan ganda atau benar/salah yang dinilai otomatis. Kuis
            melekat pada sebuah modul dan hanya tampil ke mahasiswa setelah
            berstatus Terbit.
          </p>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">Buat Kuis Baru</h2>
        <p className="mt-1 text-base text-slate-600">
          Pilih modul, beri judul, lalu lanjutkan menyusun soal.
        </p>

        <div className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
          {scopedModuleId ? null : (
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                Modul
              </label>
              <select
                value={moduleId}
                onChange={(event) => setModuleId(event.target.value)}
                disabled={modules.length === 0}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
              >
                {modules.length === 0 ? (
                  <option value="">Belum ada modul</option>
                ) : (
                  modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.order}. {m.title}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">
              Judul Kuis Baru
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="contoh: Kuis Hak & Kewajiban Warga"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <button
            type="button"
            disabled={creating || modules.length === 0}
            onClick={handleCreate}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? (
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            ) : (
              <Plus size={18} aria-hidden="true" />
            )}
            Buat
          </button>
        </div>
        {formError ? (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {formError}
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-violet-200 bg-violet-50 p-6">
        <div className="flex items-center gap-2 text-violet-900">
          <Sparkles size={20} aria-hidden="true" />
          <h2 className="text-lg font-bold">Buat Kuis dengan AI</h2>
        </div>
        <p className="mt-1 text-base text-violet-800">
          Pilih materi yang sudah diunggah, AI akan menyusun draf soal pilihan
          ganda lengkap dengan kunci jawaban dan pembahasan. Anda tetap meninjau
          dan menyuntingnya sebelum diterbitkan.
        </p>

        {materials.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-violet-200 bg-white px-4 py-3 text-base text-slate-600">
            Belum ada materi yang siap. Unggah materi lewat menu Course Builder
            terlebih dahulu.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 rounded-2xl border border-violet-200 bg-white p-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                Materi Sumber
              </label>
              <select
                value={aiMaterialId}
                onChange={(event) => setAiMaterialId(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              >
                {materials.map((material) => (
                  <option
                    key={material.id}
                    value={material.id}
                    disabled={material.status !== "READY"}
                  >
                    {material.title}
                    {material.status !== "READY" ? " (belum siap)" : ""}
                    {material.module ? ` — ${material.module.title}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                Jumlah Soal
              </label>
              <select
                value={aiQuestionCount}
                onChange={(event) =>
                  setAiQuestionCount(Number(event.target.value))
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              >
                {[3, 5, 7, 10].map((count) => (
                  <option key={count} value={count}>
                    {count} soal
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={aiGenerating || aiMaterialId === ""}
              onClick={handleGenerateWithAi}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {aiGenerating ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Sparkles size={18} aria-hidden="true" />
              )}
              {aiGenerating ? "Menyusun soal..." : "Buat Draf Kuis"}
            </button>
          </div>
        )}

        {aiError ? (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {aiError}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4">
        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
            Memuat...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-base text-rose-700">
            {error}
          </div>
        ) : visibleQuizzes.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
            Belum ada kuis. Buat kuis pertama menggunakan formulir di atas.
          </div>
        ) : (
          visibleQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(
                        quiz.status,
                      )}`}
                    >
                      {statusLabel(quiz.status)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      Modul {quiz.module.order}: {quiz.module.title}
                    </span>
                  </div>

                  <h3 className="mt-4 break-words text-xl font-bold text-slate-900">
                    {quiz.title}
                  </h3>

                  {quiz.description ? (
                    <p className="mt-2 break-words text-base leading-7 text-slate-600">
                      {quiz.description}
                    </p>
                  ) : null}

                  {quiz.status === "DRAFT" ? (
                    <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                      Kuis ini masih draf dan belum tampil ke mahasiswa. Buka
                      &ldquo;Kelola Soal&rdquo;, tinjau, lalu ubah status
                      menjadi Terbit agar mahasiswa dapat mengerjakannya.
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5">
                      <HelpCircle size={16} aria-hidden="true" />
                      {quiz._count.questions} soal
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5">
                      <Users size={16} aria-hidden="true" />
                      {quiz._count.attempts} percobaan
                    </span>
                    <span className="rounded-full bg-slate-50 px-3 py-1.5">
                      Nilai lulus: {quiz.passingScore}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={`/lecturer/courses/${courseSlug}/quizzes/${quiz.id}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700"
                  >
                    Kelola Soal
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(quiz)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-2.5 text-base font-medium text-rose-600 transition hover:bg-rose-50"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
