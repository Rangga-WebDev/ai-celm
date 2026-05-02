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

const emptyForm = {
  title: "",
  description: "",
  type: "PDF" as ResourceType,
  url: "",
  sortOrder: "",
};

export default function LecturerResourceManagerClient({
  courseModule,
  resources,
}: Props) {
  const router = useRouter();
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
      };

      const url = editingResourceId
        ? `/api/lecturer/resources/${editingResourceId}`
        : `/api/lecturer/modules/${courseModule.id}/resources`;

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
        throw new Error(json.message || "Gagal menyimpan resource");
      }

      setMessage(json.message);
      resetForm();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(resourceId: string) {
    const confirmed = window.confirm("Yakin ingin menghapus resource ini?");

    if (!confirmed) return;

    try {
      setMessage(null);

      const res = await fetch(`/api/lecturer/resources/${resourceId}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus resource");
      }

      setMessage(json.message);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-white/10 bg-white/5 p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
          <FileText size={16} />
          Resource Modul
        </div>

        <h1 className="mt-5 text-3xl font-semibold text-white">
          {courseModule.title}
        </h1>

        <p className="mt-3 text-slate-300">
          Tambahkan materi pendukung berupa link PDF, Word, slide, video, atau
          resource lain yang akan dilihat mahasiswa.
        </p>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold text-white">
          {editingResourceId ? "Edit Resource" : "Tambah Resource"}
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm text-slate-300">Judul Resource</label>
            <input
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
              placeholder="Contoh: Materi Pertemuan 1"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Tipe Resource</label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  type: e.target.value as ResourceType,
                }))
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
            >
              {resourceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-300">Urutan</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sortOrder: e.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
              placeholder="Contoh: 1"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">URL File/Resource</label>
            <input
              value={form.url}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, url: e.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
              placeholder="https://drive.google.com/..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-slate-300">Deskripsi</label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={4}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
              placeholder="Tuliskan deskripsi singkat resource..."
            />
          </div>
        </div>

        {message ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            {message}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
          >
            <Plus size={16} />
            {submitting
              ? "Menyimpan..."
              : editingResourceId
                ? "Simpan Perubahan"
                : "Tambah Resource"}
          </button>

          {editingResourceId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white transition hover:bg-white/10"
            >
              Batal Edit
            </button>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4">
        {resources.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-400">
            Belum ada resource pada modul ini.
          </div>
        ) : (
          resources.map((resource) => (
            <div
              key={resource.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                      {resource.type}
                    </span>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400">
                      Urutan {resource.sortOrder ?? "-"}
                    </span>
                  </div>

                  <h3 className="mt-3 text-xl font-semibold text-white">
                    {resource.title}
                  </h3>

                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
                    {resource.description ?? "Belum ada deskripsi resource."}
                  </p>

                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200"
                  >
                    Buka Resource
                    <ExternalLink size={14} />
                  </a>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(resource)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white transition hover:bg-white/10"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(resource.id)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300 transition hover:bg-red-500/20"
                  >
                    <Trash2 size={15} />
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