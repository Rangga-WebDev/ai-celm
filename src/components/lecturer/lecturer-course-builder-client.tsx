/** @format */
"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Layers3,
  Loader2,
  RefreshCcw,
  Sparkles,
  Trash2,
  Upload,
  Wrench,
} from "lucide-react";

type User = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: string;
};

type Props = {
  user: User;
  courseSlug: string;
};

type MaterialStatus = "PROCESSING" | "READY" | "FAILED";

type Material = {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  charCount: number | null;
  status: MaterialStatus;
  errorMessage: string | null;
  createdAt: string;
  moduleId: string | null;
  module: { id: string; title: string } | null;
  studyKit: { isPublished: boolean } | null;
};

type ModuleSummary = {
  id: string;
  title: string;
  order: number;
  _count?: { units: number };
  units?: { id: string; title: string }[];
};

type Flashcard = { istilah: string; penjelasan: string };

type QuizQuestion = {
  pertanyaan: string;
  pilihan: string[];
  indeksJawaban: number;
  pembahasan: string;
};

type StudyKit = {
  ringkasan: string;
  poinUtama: string[];
  flashcards: Flashcard[];
  kuis: QuizQuestion[];
};

type CourseSummary = {
  title: string;
  code: string | null;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusBadge(status: MaterialStatus) {
  switch (status) {
    case "READY":
      return {
        label: "Siap dipakai AI",
        className: "bg-emerald-100 text-emerald-700",
      };
    case "PROCESSING":
      return { label: "Diproses", className: "bg-amber-100 text-amber-700" };
    case "FAILED":
    default:
      return { label: "Gagal dibaca", className: "bg-rose-100 text-rose-700" };
  }
}

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.txt,.md";

export default function LecturerCourseBuilderClient({
  user,
  courseSlug,
}: Props) {
  const [course, setCourse] = useState<CourseSummary | null>(null);
  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form unggah
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Preview teks
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Bahan belajar AI
  const [kitByMaterial, setKitByMaterial] = useState<Record<string, StudyKit>>(
    {},
  );
  const [kitTruncated, setKitTruncated] = useState<Record<string, boolean>>({});
  const [generatingKitId, setGeneratingKitId] = useState<string | null>(null);
  const [kitErrorByMaterial, setKitErrorByMaterial] = useState<
    Record<string, string>
  >({});

  // Status terbit per materi (true = terbit ke mahasiswa)
  const [publishedByMaterial, setPublishedByMaterial] = useState<
    Record<string, boolean>
  >({});
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const materialsUrl = useMemo(
    () => `/api/lecturers/${user.id}/courses/${courseSlug}/materials`,
    [user.id, courseSlug],
  );
  const modulesUrl = useMemo(
    () => `/api/lecturers/${user.id}/courses/${courseSlug}/modules`,
    [user.id, courseSlug],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [modRes, matRes] = await Promise.all([
        fetch(modulesUrl, { cache: "no-store" }),
        fetch(materialsUrl, { cache: "no-store" }),
      ]);

      const modJson = await modRes.json();
      const matJson = await matRes.json();

      if (modRes.ok && modJson.success) {
        setCourse({
          title: modJson.data.course.title,
          code: modJson.data.course.code,
        });
        setModules(modJson.data.modules ?? []);
      }

      if (matRes.ok && matJson.success) {
        const list = (matJson.data ?? []) as Material[];
        setMaterials(list);
        const publishMap: Record<string, boolean> = {};
        for (const m of list) {
          if (m.studyKit) publishMap[m.id] = m.studyKit.isPublished;
        }
        setPublishedByMaterial(publishMap);
      } else {
        setLoadError(matJson.message ?? "Gagal memuat materi.");
      }
    } catch {
      setLoadError("Terjadi kesalahan saat memuat data.");
    } finally {
      setLoading(false);
    }
  }, [modulesUrl, materialsUrl]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    if (selected && title.trim().length === 0) {
      setTitle(selected.name.replace(/\.[^.]+$/, ""));
    }
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!file) {
      setFormError("Pilih berkas materi terlebih dahulu.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());
      if (description.trim())
        formData.append("description", description.trim());
      if (moduleId) formData.append("moduleId", moduleId);

      const res = await fetch(materialsUrl, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setMaterials((prev) => [json.data, ...prev]);
        setSuccessMsg(json.message ?? "Materi berhasil diunggah.");
        setFile(null);
        setTitle("");
        setDescription("");
        setModuleId("");
        const input = document.getElementById(
          "material-file",
        ) as HTMLInputElement | null;
        if (input) input.value = "";
      } else {
        setFormError(json.message ?? "Gagal mengunggah materi.");
      }
    } catch {
      setFormError("Terjadi kesalahan saat mengunggah.");
    } finally {
      setUploading(false);
    }
  }

  async function togglePreview(material: Material) {
    if (expandedId === material.id) {
      setExpandedId(null);
      setPreviewText(null);
      return;
    }

    setExpandedId(material.id);
    setPreviewText(null);
    setPreviewLoading(true);
    try {
      const res = await fetch(`${materialsUrl}/${material.id}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setPreviewText(json.data.extractedText ?? "");
      } else {
        setPreviewText("");
      }
    } catch {
      setPreviewText("");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleDelete(material: Material) {
    if (
      !window.confirm(
        `Hapus materi "${material.title}"? Tindakan ini tidak bisa dibatalkan.`,
      )
    ) {
      return;
    }

    setDeletingId(material.id);
    try {
      const res = await fetch(`${materialsUrl}/${material.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMaterials((prev) => prev.filter((m) => m.id !== material.id));
        if (expandedId === material.id) {
          setExpandedId(null);
          setPreviewText(null);
        }
      } else {
        window.alert(json.message ?? "Gagal menghapus materi.");
      }
    } catch {
      window.alert("Terjadi kesalahan saat menghapus.");
    } finally {
      setDeletingId(null);
    }
  }

  async function generateKit(material: Material) {
    setGeneratingKitId(material.id);
    setKitErrorByMaterial((prev) => {
      const next = { ...prev };
      delete next[material.id];
      return next;
    });
    try {
      const res = await fetch(`${materialsUrl}/${material.id}/study-kit`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setKitByMaterial((prev) => ({
          ...prev,
          [material.id]: json.data.kit,
        }));
        setKitTruncated((prev) => ({
          ...prev,
          [material.id]: Boolean(json.data.truncated),
        }));
      } else {
        setKitErrorByMaterial((prev) => ({
          ...prev,
          [material.id]: json.message ?? "Gagal membuat bahan belajar.",
        }));
      }
    } catch {
      setKitErrorByMaterial((prev) => ({
        ...prev,
        [material.id]: "Terjadi kesalahan saat membuat bahan belajar.",
      }));
    } finally {
      setGeneratingKitId(null);
    }
  }

  async function publishKit(material: Material) {
    const kit = kitByMaterial[material.id];
    if (!kit) return;

    setPublishingId(material.id);
    setKitErrorByMaterial((prev) => {
      const next = { ...prev };
      delete next[material.id];
      return next;
    });
    try {
      const res = await fetch(`${materialsUrl}/${material.id}/study-kit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...kit, isPublished: true }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setPublishedByMaterial((prev) => ({ ...prev, [material.id]: true }));
        setMaterials((prev) =>
          prev.map((m) =>
            m.id === material.id
              ? { ...m, studyKit: { isPublished: true } }
              : m,
          ),
        );
      } else {
        setKitErrorByMaterial((prev) => ({
          ...prev,
          [material.id]: json.message ?? "Gagal menerbitkan bahan belajar.",
        }));
      }
    } catch {
      setKitErrorByMaterial((prev) => ({
        ...prev,
        [material.id]: "Terjadi kesalahan saat menerbitkan.",
      }));
    } finally {
      setPublishingId(null);
    }
  }

  async function unpublishKit(material: Material) {
    if (
      !window.confirm(
        "Tarik bahan belajar ini dari mahasiswa? Mahasiswa tidak akan bisa melihatnya lagi.",
      )
    ) {
      return;
    }

    setPublishingId(material.id);
    try {
      const res = await fetch(`${materialsUrl}/${material.id}/study-kit`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setPublishedByMaterial((prev) => {
          const next = { ...prev };
          delete next[material.id];
          return next;
        });
        setMaterials((prev) =>
          prev.map((m) =>
            m.id === material.id ? { ...m, studyKit: null } : m,
          ),
        );
      } else {
        window.alert(json.message ?? "Gagal menarik bahan belajar.");
      }
    } catch {
      window.alert("Terjadi kesalahan saat menarik bahan belajar.");
    } finally {
      setPublishingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={`/lecturer/courses/${courseSlug}`}
          className="inline-flex items-center gap-2 text-base font-medium text-teal-700 hover:text-teal-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke kelas
        </Link>

        {/* Hero */}
        <div className="mt-4 rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm">
            <Wrench className="h-4 w-4" aria-hidden="true" />
            Course Builder
          </span>
          <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
            Susun Materi Kelas
          </h1>
          <p className="mt-2 max-w-2xl text-base text-teal-50">
            {course
              ? `${course.title}${course.code ? ` · ${course.code}` : ""}`
              : "Memuat kelas..."}
          </p>
          <p className="mt-1 max-w-2xl text-base text-teal-50">
            Unggah bahan ajar (PDF, Word, atau teks). Sistem akan membaca isinya
            agar bisa dipakai untuk fitur AI seperti ringkasan, kuis, dan
            flashcard.
          </p>
        </div>

        {/* Catatan AI / human-in-the-loop */}
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-violet-900">
          <Sparkles
            className="mt-0.5 h-5 w-5 shrink-0 text-violet-600"
            aria-hidden="true"
          />
          <p className="text-base text-violet-800">
            Teks dari materi yang Anda unggah menjadi sumber pengetahuan untuk
            fitur AI. Anda tetap memegang kendali penuh — setiap hasil AICELM
            nantinya dapat Anda tinjau dan ubah sebelum digunakan mahasiswa.
          </p>
        </div>

        {/* Struktur Kelas */}
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-teal-600" aria-hidden="true" />
              <h2 className="text-lg font-bold text-slate-900">
                Struktur Kelas
              </h2>
            </div>
            <Link
              href={`/lecturer/courses/${courseSlug}/modules`}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              Kelola Modul
            </Link>
          </div>

          {loading ? (
            <p className="mt-4 text-base text-slate-500">Memuat...</p>
          ) : modules.length === 0 ? (
            <p className="mt-4 text-base text-slate-600">
              Belum ada modul. Buat modul terlebih dahulu untuk menata materi
              per topik.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {modules.map((mod, idx) => (
                <li
                  key={mod.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                      {idx + 1}
                    </span>
                    <span className="text-base font-medium text-slate-800">
                      {mod.title}
                    </span>
                  </div>
                  <span className="text-sm text-slate-500">
                    {mod._count?.units ?? 0} bagian
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Form Unggah Materi */}
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-teal-600" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-900">Unggah Materi</h2>
          </div>

          {successMsg && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0"
                aria-hidden="true"
              />
              <p className="text-base">{successMsg}</p>
            </div>
          )}
          {formError && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-700">
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0"
                aria-hidden="true"
              />
              <p className="text-base">{formError}</p>
            </div>
          )}

          <form onSubmit={handleUpload} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="material-file"
                className="text-sm font-medium text-slate-700"
              >
                Berkas materi (PDF, Word, TXT, atau Markdown · maks 15 MB)
              </label>
              <input
                id="material-file"
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={handleFileChange}
                className="mt-1 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-teal-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
              {file && (
                <p className="mt-1 text-sm text-slate-500">
                  {file.name} · {formatBytes(file.size)}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="material-title"
                className="text-sm font-medium text-slate-700"
              >
                Judul materi
              </label>
              <input
                id="material-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Hak dan Kewajiban Warga Negara"
                className="mt-1 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div>
              <label
                htmlFor="material-module"
                className="text-sm font-medium text-slate-700"
              >
                Kaitkan dengan modul (opsional)
              </label>
              <select
                id="material-module"
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                className="mt-1 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="">Tidak dikaitkan</option>
                {modules.map((mod) => (
                  <option key={mod.id} value={mod.id}>
                    {mod.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="material-desc"
                className="text-sm font-medium text-slate-700"
              >
                Catatan singkat (opsional)
              </label>
              <textarea
                id="material-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Deskripsi singkat isi materi"
                className="mt-1 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2
                    className="h-5 w-5 animate-spin"
                    aria-hidden="true"
                  />
                  Mengunggah & membaca isi...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" aria-hidden="true" />
                  Unggah Materi
                </>
              )}
            </button>
          </form>
        </section>

        {/* Daftar Materi */}
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-600" aria-hidden="true" />
              <h2 className="text-lg font-bold text-slate-900">
                Materi Pelajaran
              </h2>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Muat ulang
            </button>
          </div>

          {loading ? (
            <p className="mt-4 text-base text-slate-500">Memuat...</p>
          ) : loadError ? (
            <p className="mt-4 text-base text-rose-600">{loadError}</p>
          ) : materials.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <FileText
                className="mx-auto h-8 w-8 text-slate-400"
                aria-hidden="true"
              />
              <p className="mt-2 text-base text-slate-600">
                Belum ada materi. Unggah bahan ajar pertama Anda di atas.
              </p>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {materials.map((material) => {
                const badge = statusBadge(material.status);
                const isExpanded = expandedId === material.id;
                const isPublished = Boolean(publishedByMaterial[material.id]);
                return (
                  <li
                    key={material.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900">
                            {material.title}
                          </h3>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                          {isPublished && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                              <CheckCircle2
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              Terbit ke mahasiswa
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {material.fileName} · {formatBytes(material.fileSize)}
                          {material.charCount != null && material.charCount > 0
                            ? ` · ${material.charCount.toLocaleString("id-ID")} karakter terbaca`
                            : ""}
                          {material.module
                            ? ` · Modul: ${material.module.title}`
                            : ""}
                        </p>
                        {material.description && (
                          <p className="mt-1 text-sm text-slate-600">
                            {material.description}
                          </p>
                        )}
                        {material.status === "FAILED" &&
                          material.errorMessage && (
                            <p className="mt-1 text-sm text-rose-600">
                              {material.errorMessage}
                            </p>
                          )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {material.status === "READY" &&
                        (material.charCount ?? 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => generateKit(material)}
                            disabled={generatingKitId === material.id}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {generatingKitId === material.id ? (
                              <Loader2
                                className="h-4 w-4 animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <Sparkles
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            )}
                            {kitByMaterial[material.id]
                              ? "Buat ulang dengan AI"
                              : "Buat Bahan Belajar AI"}
                          </button>
                        )}
                      {material.status === "READY" &&
                        (material.charCount ?? 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => togglePreview(material)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {isExpanded ? (
                              <ChevronUp
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            ) : (
                              <ChevronDown
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            )}
                            {isExpanded
                              ? "Sembunyikan teks"
                              : "Lihat teks terbaca"}
                          </button>
                        )}
                      <a
                        href={`${materialsUrl}/${material.id}/download`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                        Unduh
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(material)}
                        disabled={deletingId === material.id}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                      >
                        {deletingId === material.id ? (
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        )}
                        Hapus
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                        {previewLoading ? (
                          <p className="text-sm text-slate-500">
                            Memuat teks...
                          </p>
                        ) : previewText && previewText.length > 0 ? (
                          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-sm text-slate-700">
                            {previewText}
                          </pre>
                        ) : (
                          <p className="text-sm text-slate-500">
                            Tidak ada teks yang bisa ditampilkan.
                          </p>
                        )}
                      </div>
                    )}

                    {kitErrorByMaterial[material.id] && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700">
                        <AlertCircle
                          className="mt-0.5 h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
                        <p className="text-sm">
                          {kitErrorByMaterial[material.id]}
                        </p>
                      </div>
                    )}

                    {kitByMaterial[material.id] && (
                      <StudyKitPanel
                        kit={kitByMaterial[material.id]}
                        truncated={Boolean(kitTruncated[material.id])}
                        isPublished={isPublished}
                        publishing={publishingId === material.id}
                        onPublish={() => publishKit(material)}
                        onUnpublish={() => unpublishKit(material)}
                      />
                    )}

                    {isPublished && !kitByMaterial[material.id] && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-200 bg-teal-50 p-3">
                        <p className="text-sm text-teal-800">
                          Bahan belajar materi ini sudah terbit ke mahasiswa.
                          Klik &quot;Buat Bahan Belajar AI&quot; untuk meninjau
                          atau memperbaruinya.
                        </p>
                        <button
                          type="button"
                          onClick={() => unpublishKit(material)}
                          disabled={publishingId === material.id}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                        >
                          {publishingId === material.id ? (
                            <Loader2
                              className="h-4 w-4 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          )}
                          Tarik dari mahasiswa
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StudyKitPanel({
  kit,
  truncated,
  isPublished,
  publishing,
  onPublish,
  onUnpublish,
}: {
  kit: StudyKit;
  truncated: boolean;
  isPublished: boolean;
  publishing: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
}) {
  return (
    <div className="mt-3 rounded-2xl border border-violet-200 bg-violet-50 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-violet-600" aria-hidden="true" />
        <h4 className="text-base font-bold text-violet-900">
          Draf Bahan Belajar AI
        </h4>
      </div>
      <p className="mt-1 text-sm text-violet-800">
        Ini draf otomatis. Tinjau, sunting, atau buat ulang sebelum dipakai
        mahasiswa — Anda yang memegang kendali akhir.
      </p>
      {truncated && (
        <p className="mt-1 text-xs text-violet-700">
          Catatan: materi cukup panjang, AI hanya membaca bagian awalnya.
        </p>
      )}

      {/* Ringkasan */}
      <div className="mt-4 rounded-xl border border-violet-200 bg-white p-3">
        <h5 className="text-sm font-bold text-slate-900">Ringkasan</h5>
        <p className="mt-1 text-sm text-slate-700">{kit.ringkasan}</p>
        {kit.poinUtama.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {kit.poinUtama.map((poin, idx) => (
              <li key={idx}>{poin}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Flashcards */}
      {kit.flashcards.length > 0 && (
        <div className="mt-3 rounded-xl border border-violet-200 bg-white p-3">
          <h5 className="text-sm font-bold text-slate-900">
            Flashcard ({kit.flashcards.length})
          </h5>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {kit.flashcards.map((card, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {card.istilah}
                </p>
                <p className="mt-1 text-sm text-slate-600">{card.penjelasan}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kuis */}
      {kit.kuis.length > 0 && (
        <div className="mt-3 rounded-xl border border-violet-200 bg-white p-3">
          <h5 className="text-sm font-bold text-slate-900">
            Kuis Pilihan Ganda ({kit.kuis.length})
          </h5>
          <ol className="mt-2 space-y-3">
            {kit.kuis.map((q, idx) => (
              <li
                key={idx}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {idx + 1}. {q.pertanyaan}
                </p>
                <ul className="mt-2 space-y-1">
                  {q.pilihan.map((opt, optIdx) => {
                    const isAnswer = optIdx === q.indeksJawaban;
                    return (
                      <li
                        key={optIdx}
                        className={`flex items-start gap-2 rounded-md px-2 py-1 text-sm ${
                          isAnswer
                            ? "bg-emerald-50 font-medium text-emerald-800"
                            : "text-slate-700"
                        }`}
                      >
                        <span className="font-semibold">
                          {String.fromCharCode(65 + optIdx)}.
                        </span>
                        <span>{opt}</span>
                        {isAnswer && (
                          <CheckCircle2
                            className="ml-auto h-4 w-4 shrink-0 text-emerald-600"
                            aria-hidden="true"
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
                {q.pembahasan && (
                  <p className="mt-2 text-xs text-slate-500">
                    Pembahasan: {q.pembahasan}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Aksi terbitkan */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-violet-200 pt-4">
        {isPublished ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-teal-100 px-3 py-2 text-sm font-semibold text-teal-700">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Sudah terbit ke mahasiswa
            </span>
            <button
              type="button"
              onClick={onPublish}
              disabled={publishing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {publishing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="h-4 w-4" aria-hidden="true" />
              )}
              Perbarui yang terbit
            </button>
            <button
              type="button"
              onClick={onUnpublish}
              disabled={publishing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Tarik dari mahasiswa
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onPublish}
            disabled={publishing}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="h-4 w-4" aria-hidden="true" />
            )}
            Simpan &amp; Terbitkan ke Mahasiswa
          </button>
        )}
      </div>
    </div>
  );
}
