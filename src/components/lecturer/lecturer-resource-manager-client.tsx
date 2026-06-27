/** @format */

"use client";

/** @format */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Pencil, Plus, Trash2 } from "lucide-react";

type ResourceType =
  | "PDF"
  | "DOC"
  | "SLIDE"
  | "VIDEO"
  | "LINK"
  | "IMAGE"
  | "QUIZ"
  | "TEMPLATE"
  | "OTHER";

type ResourceItem = {
  id: string;
  title: string;
  description: string | null;
  type: ResourceType;
  url: string;
  sortOrder: number | null;
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
};

const resourceTypes: ResourceType[] = [
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
  OTHER: "Lainnya",
};

const emptyForm = {
  title: "",
  description: "",
  type: "PDF" as ResourceType,
  url: "",
  sortOrder: "",
};

export default function LecturerResourceManagerClient({
  userId,
  courseModule,
  resources,
}: Props) {
  const router = useRouter();
  const resourcesBasePath = `/api/lecturers/${userId}/courses/${courseModule.courseSlug}/resources`;
  const [form, setForm] = useState(emptyForm);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setForm(emptyForm);
    setEditingResourceId(null);
    setMessage(null);
  }

  function startEdit(resource: ResourceItem) {
    setEditingResourceId(resource.id);
    setForm({
      title: resource.title,
      description: resource.description ?? "",
      type: resource.type,
      url: resource.url,
      sortOrder: resource.sortOrder ? String(resource.sortOrder) : "",
    });
    setMessage(null);
  }

  async function handleSubmit() {
    try {
      setSubmitting(true);
      setMessage(null);

      const payload = {
        title: form.title,
        description: form.description,
        type: form.type,
        url: form.url,
        sortOrder: form.sortOrder ? Number(form.sortOrder) : null,
        targetType: "MODULE" as const,
        moduleId: courseModule.id,
      };

      const url = editingResourceId
        ? `${resourcesBasePath}/${editingResourceId}`
        : resourcesBasePath;

      const method = editingResourceId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
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

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white">
          <FileText size={16} aria-hidden />
          Bahan Belajar Modul
        </div>

        <h1 className="mt-5 text-3xl font-bold">{courseModule.title}</h1>

        <p className="mt-3 text-base leading-7 text-teal-50">
          Tambahkan bahan pendukung berupa tautan PDF, dokumen Word, slide,
          video, atau bahan lain yang akan dilihat mahasiswa.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-900">
          {editingResourceId ? "Ubah Bahan Belajar" : "Tambah Bahan Belajar"}
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Judul Bahan
            </label>
            <input
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              placeholder="Contoh: Materi Pertemuan 1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Tipe Bahan
            </label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  type: e.target.value as ResourceType,
                }))
              }
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              {resourceTypes.map((type) => (
                <option key={type} value={type}>
                  {resourceTypeLabels[type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Urutan</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sortOrder: e.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              placeholder="Contoh: 1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Tautan File/Bahan
            </label>
            <input
              value={form.url}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, url: e.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              placeholder="https://drive.google.com/..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">
              Deskripsi
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={4}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              placeholder="Tuliskan deskripsi singkat bahan belajar..."
            />
          </div>
        </div>

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
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                      {resourceTypeLabels[resource.type]}
                    </span>
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

                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-base font-medium text-teal-700 hover:text-teal-800"
                  >
                    Buka Bahan
                    <ExternalLink size={16} aria-hidden />
                  </a>
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
