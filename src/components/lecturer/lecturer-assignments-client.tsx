/** @format */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";

type LecturerAssignmentsClientProps = {
  user: { id: string; email: string; role: string };
  courseSlug: string;
  scopedModuleId?: string;
  embedded?: boolean;
  variant?: "task" | "exam";
};

type ModuleOption = { id: string; title: string; slug: string; order: number };

type MaterialOption = {
  id: string;
  title: string;
  moduleId: string | null;
  charCount: number | null;
};

type AssignmentItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  dueAt: string | null;
  maxScore: number;
  status: string;
  generatedByAi: boolean;
  examType?: string;
  createdAt: string;
  module: { id: string; title: string; slug: string } | null;
  sourceMaterial: { id: string; title: string } | null;
  _count: { submissions: number };
};

type ListResponse = {
  success: boolean;
  message: string;
  data: {
    course: { id: string; title: string; slug: string };
    modules: ModuleOption[];
    materials: MaterialOption[];
    assignments: AssignmentItem[];
    statuses: string[];
  };
};

function statusBadge(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700";
    case "CLOSED":
      return "bg-amber-100 text-amber-700";
    case "ARCHIVED":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-sky-100 text-sky-700";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Aktif";
    case "CLOSED":
      return "Ditutup";
    case "ARCHIVED":
      return "Arsip";
    default:
      return "Draf";
  }
}

function formatDate(value: string | null) {
  if (!value) return "Tanpa tenggat";
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function LecturerAssignmentsClient({
  user,
  courseSlug,
  scopedModuleId,
  embedded = false,
  variant = "task",
}: LecturerAssignmentsClientProps) {
  const isExam = variant === "exam";
  const [courseTitle, setCourseTitle] = useState("");
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form manual
  const [title, setTitle] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [examChoice, setExamChoice] = useState<"UTS" | "UAS">("UTS");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [allowText, setAllowText] = useState(true);
  const [allowFile, setAllowFile] = useState(true);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // AI
  const [aiMaterialId, setAiMaterialId] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const basePath = `/api/lecturers/${user.id}/courses/${courseSlug}/assignments`;
  const listQuery = isExam
    ? "?examType=EXAM"
    : `?examType=NONE${scopedModuleId ? `&moduleId=${scopedModuleId}` : ""}`;

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${basePath}${listQuery}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as ListResponse;

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal memuat data tugas");
        }

        setCourseTitle(json.data.course.title);
        setModules(json.data.modules);
        setMaterials(json.data.materials);
        setAssignments(json.data.assignments);
        if (json.data.materials.length > 0) {
          setAiMaterialId(json.data.materials[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [basePath, listQuery]);

  async function handleCreate() {
    if (title.trim().length === 0) {
      setFormError("Judul tugas wajib diisi.");
      return;
    }

    setCreating(true);
    setFormError(null);
    setNotice(null);

    try {
      const res = await fetch(basePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          moduleId: isExam
            ? undefined
            : scopedModuleId || moduleId || undefined,
          examType: isExam ? examChoice : "NONE",
          description: description || undefined,
          instructions: instructions || undefined,
          dueAt: dueAt || undefined,
          allowText,
          allowFile,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal membuat tugas");
      }

      setAssignments((prev) => [json.data as AssignmentItem, ...prev]);
      setTitle("");
      setDescription("");
      setInstructions("");
      setDueAt("");
      setNotice(
        isExam
          ? "Ujian berhasil dibuat sebagai draf."
          : "Tugas berhasil dibuat sebagai draf.",
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  }

  async function handleGenerateWithAi() {
    if (aiMaterialId === "") {
      setAiError("Pilih materi sumber tugas terlebih dahulu.");
      return;
    }

    setAiGenerating(true);
    setAiError(null);
    setNotice(null);

    try {
      const res = await fetch(`${basePath}/ai-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: aiMaterialId,
          examType: isExam ? examChoice : "NONE",
          ...(isExam || !scopedModuleId ? {} : { moduleId: scopedModuleId }),
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal membuat tugas dengan AI");
      }

      setAssignments((prev) => [
        json.data.assignment as AssignmentItem,
        ...prev,
      ]);
      setNotice(
        isExam
          ? "Draf ujian berhasil dibuat AI. Tinjau dan ubah ke Aktif untuk menerbitkan."
          : "Draf tugas berhasil dibuat AI. Tinjau dan ubah ke Aktif untuk menerbitkan.",
      );
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleStatusChange(item: AssignmentItem, status: string) {
    try {
      const res = await fetch(`${basePath}/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengubah status");
      }

      setAssignments((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, status } : a)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleDelete(item: AssignmentItem) {
    const confirmed = window.confirm(
      `Hapus tugas "${item.title}"? Semua pengumpulan mahasiswa akan ikut terhapus.`,
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${basePath}/${item.id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus tugas");
      }

      setAssignments((prev) => prev.filter((a) => a.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 animate-spin" size={20} /> Memuat…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!embedded ? (
        <Link
          href={`/lecturer/courses/${courseSlug}`}
          className="inline-flex items-center gap-2 text-base font-medium text-teal-700 transition hover:text-teal-800"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Kembali ke Mata Kuliah
        </Link>
      ) : null}

      {!embedded ? (
        <section className="rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm">
            <ClipboardList size={16} aria-hidden="true" />
            {isExam ? "Ujian (UTS & UAS)" : "Tugas"}
          </span>
          <p className="mt-4 text-sm text-teal-50">
            {courseTitle || courseSlug}
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            {isExam ? "Ujian (UTS & UAS)" : "Tugas"}
          </h1>
          <p className="mt-3 max-w-3xl text-base text-teal-50">
            {isExam
              ? "Buat soal ujian esai untuk UTS dan UAS. AI dapat menyusun pertanyaan dan rubrik dari PDF, lengkap dengan tenggat. Ujian tampil ke mahasiswa setelah berstatus Aktif."
              : "Buat tugas mendalam dari modul: AI dapat menyusun instruksi dan rubrik dari PDF, atau Anda menyusunnya sendiri lengkap dengan tenggat. Tugas tampil ke mahasiswa setelah berstatus Aktif."}
          </p>
        </section>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      <section className="rounded-3xl border border-violet-200 bg-violet-50 p-6">
        <div className="flex items-center gap-2 text-violet-900">
          <Sparkles size={20} aria-hidden="true" />
          <h2 className="text-lg font-bold">
            {isExam ? "Buat Ujian dengan AI" : "Buat Tugas dengan AI"}
          </h2>
        </div>
        <p className="mt-1 text-base text-violet-800">
          {isExam
            ? "Pilih materi PDF, lalu AI menyusun draf soal esai ujian, rubrik penilaian, dan saran tenggat. Anda tetap meninjau sebelum diterbitkan."
            : "Pilih materi/modul PDF yang sudah diunggah, AI menyusun draf instruksi, rubrik, dan saran tenggat. Anda tetap meninjau sebelum diterbitkan."}
        </p>

        {isExam ? (
          <div className="mt-4 grid gap-2 sm:max-w-xs">
            <label className="text-sm font-medium text-violet-900">
              Jenis ujian
            </label>
            <select
              value={examChoice}
              onChange={(event) =>
                setExamChoice(event.target.value as "UTS" | "UAS")
              }
              className="rounded-2xl border border-violet-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            >
              <option value="UTS">UTS (Ujian Tengah Semester)</option>
              <option value="UAS">UAS (Ujian Akhir Semester)</option>
            </select>
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 sm:grid-cols-[2fr_auto] sm:items-end">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-violet-900">
              Materi sumber
            </label>
            <select
              value={aiMaterialId}
              onChange={(event) => setAiMaterialId(event.target.value)}
              disabled={materials.length === 0}
              className="rounded-2xl border border-violet-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
            >
              {materials.length === 0 ? (
                <option value="">Belum ada materi siap</option>
              ) : (
                materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            type="button"
            disabled={aiGenerating || materials.length === 0}
            onClick={handleGenerateWithAi}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {aiGenerating ? (
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles size={18} aria-hidden="true" />
            )}
            Buat dengan AI
          </button>
        </div>
        {aiError ? (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {aiError}
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">
          {isExam ? "Buat Ujian Manual" : "Buat Tugas Manual"}
        </h2>
        <p className="mt-1 text-base text-slate-600">
          {isExam
            ? "Susun soal ujian sendiri lengkap dengan instruksi dan tenggat."
            : "Susun tugas sendiri lengkap dengan instruksi dan tenggat."}
        </p>

        <div className="mt-5 grid gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                Judul
              </label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="contoh: Rancang RPP PKn Tematik"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>
            {isExam ? (
              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-700">
                  Jenis ujian
                </label>
                <select
                  value={examChoice}
                  onChange={(event) =>
                    setExamChoice(event.target.value as "UTS" | "UAS")
                  }
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="UTS">UTS (Ujian Tengah Semester)</option>
                  <option value="UAS">UAS (Ujian Akhir Semester)</option>
                </select>
              </div>
            ) : scopedModuleId ? null : (
              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-700">
                  Modul (opsional)
                </label>
                <select
                  value={moduleId}
                  onChange={(event) => setModuleId(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="">Tanpa modul</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.order}. {m.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">
              Ringkasan (opsional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ringkasan singkat tujuan tugas"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">
              Instruksi pengerjaan
            </label>
            <textarea
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              rows={4}
              placeholder="Langkah-langkah, ketentuan luaran, dan format pengumpulan."
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                Tenggat (opsional)
              </label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:pt-7">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={allowText}
                  onChange={(event) => setAllowText(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600"
                />
                Jawaban teks/esai
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={allowFile}
                  onChange={(event) => setAllowFile(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600"
                />
                Unggah berkas
              </label>
            </div>
          </div>

          <div>
            <button
              type="button"
              disabled={creating}
              onClick={handleCreate}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Plus size={18} aria-hidden="true" />
              )}
              Buat Tugas
            </button>
          </div>
          {formError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">
          {isExam ? "Daftar Ujian" : "Daftar Tugas"}
        </h2>
        {assignments.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
            {isExam
              ? "Belum ada ujian. Buat dengan AI atau manual di atas."
              : "Belum ada tugas. Buat dengan AI atau manual di atas."}
          </div>
        ) : (
          <div className="grid gap-4">
            {assignments.map((item) => (
              <article
                key={item.id}
                className="rounded-3xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {item.title}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge(
                          item.status,
                        )}`}
                      >
                        {statusLabel(item.status)}
                      </span>
                      {item.generatedByAi ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                          <Sparkles size={12} aria-hidden="true" /> AI
                        </span>
                      ) : null}
                      {item.examType && item.examType !== "NONE" ? (
                        <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                          {item.examType}
                        </span>
                      ) : null}
                    </div>
                    {item.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {item.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock size={14} aria-hidden="true" />
                        {formatDate(item.dueAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users size={14} aria-hidden="true" />
                        {item._count.submissions} pengumpulan
                      </span>
                      {item.module ? (
                        <span>Modul: {item.module.title}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={item.status}
                      onChange={(event) =>
                        handleStatusChange(item, event.target.value)
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500"
                    >
                      <option value="DRAFT">Draf</option>
                      <option value="ACTIVE">Aktif</option>
                      <option value="CLOSED">Ditutup</option>
                      <option value="ARCHIVED">Arsip</option>
                    </select>
                    <Link
                      href={`/lecturer/courses/${courseSlug}/assignments/${item.id}/submissions`}
                      className="inline-flex items-center gap-1 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
                    >
                      <Users size={14} aria-hidden="true" /> Nilai
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"
                      aria-label="Hapus tugas"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
