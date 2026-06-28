/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Link2,
  BookOpen,
} from "lucide-react";
import Markdown from "@/components/ui/markdown";

type ResourceType =
  | "PDF"
  | "DOC"
  | "SLIDE"
  | "VIDEO"
  | "LINK"
  | "IMAGE"
  | "QUIZ"
  | "TEMPLATE"
  | "ARTICLE"
  | "OTHER";

type ResourceItem = {
  id: string;
  title: string;
  description: string | null;
  type: ResourceType;
  url: string | null;
  content: string | null;
  aiGenerated: boolean;
  sourceMaterialId: string | null;
  sortOrder: number | null;
};

type MaterialOption = {
  id: string;
  title: string;
  charCount: number | null;
};

type CourseModuleInfo = {
  id: string;
  title: string;
  courseSlug: string;
};

type Props = {
  userId: string;
  courseModule: CourseModuleInfo;
  resources: ResourceItem[];
  materials: MaterialOption[];
};

type FormMode = "link" | "article";

const linkResourceTypes: ResourceType[] = [
  "PDF",
  "DOC",
  "SLIDE",
  "VIDEO",
  "LINK",
  "IMAGE",
  "QUIZ",
  "TEMPLATE",
  "OTHER",
];

const resourceTypeLabels: Record<ResourceType, string> = {
  PDF: "PDF",
  DOC: "Dokumen",
  SLIDE: "Slide",
  VIDEO: "Video",
  LINK: "Tautan",
  IMAGE: "Gambar",
  QUIZ: "Kuis",
  TEMPLATE: "Templat",
  ARTICLE: "Artikel",
  OTHER: "Lainnya",
};

const emptyLinkForm = {
  title: "",
  description: "",
  type: "PDF" as ResourceType,
  url: "",
  sortOrder: "",
};

const emptyArticleForm = {
  title: "",
  description: "",
  content: "",
  sourceMaterialId: "",
  sortOrder: "",
};

export default function LecturerResourceManagerClient({
  userId,
  courseModule,
  resources,
  materials,
}: Props) {
  const router = useRouter();
  const resourcesBasePath = `/api/lecturers/${userId}/courses/${courseModule.courseSlug}/resources`;

  const [mode, setMode] = useState<FormMode>("link");
  const [linkForm, setLinkForm] = useState(emptyLinkForm);
  const [articleForm, setArticleForm] = useState(emptyArticleForm);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // State khusus pembuatan artikel dengan AI.
  const [aiMaterialId, setAiMaterialId] = useState("");
  const [aiFocus, setAiFocus] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  function resetForm() {
    setLinkForm(emptyLinkForm);
    setArticleForm(emptyArticleForm);
    setEditingResourceId(null);
    setMessage(null);
    setAiMaterialId("");
    setAiFocus("");
    setShowPreview(false);
  }

  function startEdit(resource: ResourceItem) {
    setEditingResourceId(resource.id);
    setMessage(null);

    if (resource.type === "ARTICLE") {
      setMode("article");
      setArticleForm({
        title: resource.title,
        description: resource.description ?? "",
        content: resource.content ?? "",
        sourceMaterialId: resource.sourceMaterialId ?? "",
        sortOrder: resource.sortOrder ? String(resource.sortOrder) : "",
      });
    } else {
      setMode("link");
      setLinkForm({
        title: resource.title,
        description: resource.description ?? "",
        type: resource.type,
        url: resource.url ?? "",
        sortOrder: resource.sortOrder ? String(resource.sortOrder) : "",
      });
    }
  }

  async function handleGenerateArticle() {
    if (!aiMaterialId) {
      setMessage("Pilih materi PDF sumber terlebih dahulu.");
      return;
    }

    try {
      setAiLoading(true);
      setMessage(null);

      const res = await fetch(`${resourcesBasePath}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId: aiMaterialId, focus: aiFocus }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal membuat artikel dengan AI");
      }

      setArticleForm((prev) => ({
        ...prev,
        title: json.data.title ?? prev.title,
        description: json.data.description ?? prev.description,
        content: json.data.content ?? prev.content,
        sourceMaterialId: json.data.sourceMaterialId ?? aiMaterialId,
      }));
      setShowPreview(true);
      setMessage(`${json.message} Silakan tinjau & sunting sebelum menyimpan.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit() {
    try {
      setSubmitting(true);
      setMessage(null);

      const payload =
        mode === "article"
          ? {
              title: articleForm.title,
              description: articleForm.description,
              type: "ARTICLE" as const,
              content: articleForm.content,
              sourceMaterialId: articleForm.sourceMaterialId || null,
              sortOrder: articleForm.sortOrder
                ? Number(articleForm.sortOrder)
                : null,
              targetType: "MODULE" as const,
              moduleId: courseModule.id,
            }
          : {
              title: linkForm.title,
              description: linkForm.description,
              type: linkForm.type,
              url: linkForm.url,
              sortOrder: linkForm.sortOrder ? Number(linkForm.sortOrder) : null,
              targetType: "MODULE" as const,
              moduleId: courseModule.id,
            };

      const url = editingResourceId
        ? `${resourcesBasePath}/${editingResourceId}`
        : resourcesBasePath;

      const method = editingResourceId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan bahan belajar");
      }

      setMessage(json.message);
      resetForm();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(resourceId: string) {
    const confirmed = window.confirm(
      "Yakin ingin menghapus bahan belajar ini?",
    );

    if (!confirmed) return;

    try {
      setMessage(null);

      const res = await fetch(`${resourcesBasePath}/${resourceId}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus bahan belajar");
      }

      setMessage(json.message);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Terjadi kesalahan");
    }
  }

  const inputClass =
    "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white">
          <FileText size={16} aria-hidden />
          Bahan Belajar Modul
        </div>

        <h1 className="mt-5 text-3xl font-bold">{courseModule.title}</h1>

        <p className="mt-3 text-base leading-7 text-teal-50">
          Buat bahan belajar dengan dua cara: tautkan sumber (YouTube, Google
          Drive, PDF, dll.) atau susun artikel bacaan—tulis manual maupun dibuat
          otomatis oleh AI dari materi PDF.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">
            {editingResourceId ? "Ubah Bahan Belajar" : "Tambah Bahan Belajar"}
          </h2>

          {!editingResourceId ? (
            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setMode("link")}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  mode === "link"
                    ? "bg-white text-teal-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Link2 size={16} aria-hidden />
                Tautan / Embed
              </button>
              <button
                type="button"
                onClick={() => setMode("article")}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  mode === "article"
                    ? "bg-white text-teal-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <BookOpen size={16} aria-hidden />
                Artikel
              </button>
            </div>
          ) : null}
        </div>

        {mode === "link" ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Judul Bahan
              </label>
              <input
                value={linkForm.title}
                onChange={(e) =>
                  setLinkForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className={inputClass}
                placeholder="Contoh: Video Pengantar Pancasila"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Tipe Bahan
              </label>
              <select
                value={linkForm.type}
                onChange={(e) =>
                  setLinkForm((prev) => ({
                    ...prev,
                    type: e.target.value as ResourceType,
                  }))
                }
                className={inputClass}
              >
                {linkResourceTypes.map((type) => (
                  <option key={type} value={type}>
                    {resourceTypeLabels[type]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Urutan
              </label>
              <input
                type="number"
                value={linkForm.sortOrder}
                onChange={(e) =>
                  setLinkForm((prev) => ({
                    ...prev,
                    sortOrder: e.target.value,
                  }))
                }
                className={inputClass}
                placeholder="Contoh: 1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Tautan (YouTube / Google Drive / PDF / lainnya)
              </label>
              <input
                value={linkForm.url}
                onChange={(e) =>
                  setLinkForm((prev) => ({ ...prev, url: e.target.value }))
                }
                className={inputClass}
                placeholder="https://youtube.com/... atau https://drive.google.com/..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Deskripsi
              </label>
              <textarea
                value={linkForm.description}
                onChange={(e) =>
                  setLinkForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
                className={inputClass}
                placeholder="Tuliskan deskripsi singkat bahan belajar..."
              />
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {/* Panel pembuatan AI */}
            <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-5">
              <div className="flex items-center gap-2 text-teal-800">
                <Sparkles size={18} aria-hidden />
                <h3 className="text-base font-semibold">
                  Buat Artikel dengan AI
                </h3>
              </div>
              <p className="mt-1 text-sm text-teal-700">
                Pilih materi PDF, dan AI akan menyusun artikel bacaan yang bisa
                Anda sunting sebelum disimpan.
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Materi PDF Sumber
                  </label>
                  <select
                    value={aiMaterialId}
                    onChange={(e) => setAiMaterialId(e.target.value)}
                    className={inputClass}
                    disabled={materials.length === 0}
                  >
                    <option value="">
                      {materials.length === 0
                        ? "Belum ada materi PDF siap"
                        : "Pilih materi..."}
                    </option>
                    {materials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Fokus (opsional)
                  </label>
                  <input
                    value={aiFocus}
                    onChange={(e) => setAiFocus(e.target.value)}
                    className={inputClass}
                    placeholder="Contoh: tekankan contoh untuk siswa SD"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateArticle}
                disabled={aiLoading || materials.length === 0}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
              >
                <Sparkles size={16} aria-hidden />
                {aiLoading ? "Membuat artikel..." : "Generate dengan AI"}
              </button>
            </div>

            {/* Form artikel (manual / hasil AI yang bisa disunting) */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Judul Artikel
                </label>
                <input
                  value={articleForm.title}
                  onChange={(e) =>
                    setArticleForm((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="Contoh: Memahami Nilai-Nilai Pancasila"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Urutan
                </label>
                <input
                  type="number"
                  value={articleForm.sortOrder}
                  onChange={(e) =>
                    setArticleForm((prev) => ({
                      ...prev,
                      sortOrder: e.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="Contoh: 1"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Ringkasan (deskripsi singkat)
                </label>
                <input
                  value={articleForm.description}
                  onChange={(e) =>
                    setArticleForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="Ringkasan 1-2 kalimat tentang artikel"
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">
                    Isi Artikel (mendukung Markdown)
                  </label>
                  {articleForm.content ? (
                    <button
                      type="button"
                      onClick={() => setShowPreview((v) => !v)}
                      className="text-sm font-medium text-teal-700 hover:text-teal-800"
                    >
                      {showPreview
                        ? "Sembunyikan Pratinjau"
                        : "Lihat Pratinjau"}
                    </button>
                  ) : null}
                </div>
                <textarea
                  value={articleForm.content}
                  onChange={(e) =>
                    setArticleForm((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  rows={12}
                  className={`${inputClass} font-mono text-sm`}
                  placeholder="Tulis artikel di sini, atau buat otomatis dengan AI di atas. Gunakan Markdown: ## Judul, **tebal**, - poin, dst."
                />

                {showPreview && articleForm.content ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Pratinjau
                    </p>
                    <Markdown>{articleForm.content}</Markdown>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {message ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base text-slate-700">
            {message}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
          >
            <Plus size={18} aria-hidden />
            {submitting
              ? "Menyimpan..."
              : editingResourceId
                ? "Simpan Perubahan"
                : "Tambah Bahan"}
          </button>

          {editingResourceId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Batal Ubah
            </button>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4">
        {resources.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
            Belum ada bahan belajar pada modul ini.
          </div>
        ) : (
          resources.map((resource) => (
            <div
              key={resource.id}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                      {resourceTypeLabels[resource.type]}
                    </span>
                    {resource.aiGenerated ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                        <Sparkles size={12} aria-hidden />
                        Dibuat AI
                      </span>
                    ) : null}
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      Urutan {resource.sortOrder ?? "-"}
                    </span>
                  </div>

                  <h3 className="mt-3 text-xl font-bold text-slate-900">
                    {resource.title}
                  </h3>

                  <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
                    {resource.description ?? "Belum ada deskripsi bahan."}
                  </p>

                  {resource.type === "ARTICLE" ? (
                    <p className="mt-3 text-sm text-slate-500">
                      Artikel bacaan ({resource.content?.length ?? 0} karakter)
                    </p>
                  ) : resource.url ? (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-base font-medium text-teal-700 hover:text-teal-800 wrap-break-word"
                    >
                      Buka Bahan
                      <ExternalLink size={16} aria-hidden />
                    </a>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(resource)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Pencil size={16} aria-hidden />
                    Ubah
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(resource.id)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-2.5 text-base font-medium text-rose-600 transition hover:bg-rose-50"
                  >
                    <Trash2 size={16} aria-hidden />
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
