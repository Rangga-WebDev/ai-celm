"use client";

/** @format */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, FileText, Pencil, Plus, Trash2 } from "lucide-react";

type ModuleItem = {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  description: string | null;
  order: number;
  estimatedMinutes: number | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isLocked: boolean;
  masteryThreshold: number;
  _count?: {
    units: number;
    resources: number;
  };
};

type CourseInfo = {
  id: string;
  title: string;
  slug: string;
  code: string | null;
};

type Props = {
  course: CourseInfo;
  modules: ModuleItem[];
};

const statusOptions = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

const emptyForm = {
  title: "",
  description: "",
  order: "",
  estimatedMinutes: "",
  status: "DRAFT",
  isLocked: false,
  masteryThreshold: "75",
};

export default function LecturerModuleManagerClient({
  course,
  modules,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setForm(emptyForm);
    setEditingModuleId(null);
    setMessage(null);
  }

  function startEdit(courseModule: ModuleItem) {
    setEditingModuleId(courseModule.id);
    setForm({
      title: courseModule.title,
      description: courseModule.description ?? "",
      order: String(courseModule.order),
      estimatedMinutes: courseModule.estimatedMinutes
        ? String(courseModule.estimatedMinutes)
        : "",
      status: courseModule.status,
      isLocked: courseModule.isLocked,
      masteryThreshold: String(courseModule.masteryThreshold),
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
        order: form.order ? Number(form.order) : undefined,
        estimatedMinutes: form.estimatedMinutes
          ? Number(form.estimatedMinutes)
          : null,
        status: form.status,
        isLocked: form.isLocked,
        masteryThreshold: form.masteryThreshold
          ? Number(form.masteryThreshold)
          : 75,
      };

      const url = editingModuleId
        ? `/api/lecturer/modules/${editingModuleId}`
        : `/api/lecturer/courses/${course.slug}/modules`;

      const method = editingModuleId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan modul");
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

  async function handleDelete(moduleId: string) {
    const confirmed = window.confirm(
      "Yakin ingin menghapus modul ini? Semua unit dan resource di dalamnya juga dapat terhapus.",
    );

    if (!confirmed) return;

    try {
      setMessage(null);

      const res = await fetch(`/api/lecturer/modules/${moduleId}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus modul");
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
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-400/10 px-4 py-2 text-sm text-teal-200">
          <BookOpen size={16} />
          Kelola Modul Course
        </div>

        <h1 className="mt-5 text-3xl font-semibold text-white">
          {course.title}
        </h1>

        <p className="mt-3 text-slate-300">
          Tambahkan, edit, publish, arsipkan, atau hapus modul pembelajaran pada
          course ini.
        </p>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold text-white">
          {editingModuleId ? "Edit Modul" : "Tambah Modul Baru"}
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm text-slate-300">Judul Modul</label>
            <input
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none focus:border-teal-300/50"
              placeholder="Contoh: Paradigma Baru PKN"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Urutan</label>
            <input
              type="number"
              value={form.order}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, order: e.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none focus:border-teal-300/50"
              placeholder="Otomatis jika dikosongkan"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Estimasi Menit</label>
            <input
              type="number"
              value={form.estimatedMinutes}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  estimatedMinutes: e.target.value,
                }))
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none focus:border-teal-300/50"
              placeholder="Contoh: 45"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Status</label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, status: e.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none focus:border-teal-300/50"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-300">Mastery Threshold</label>
            <input
              type="number"
              value={form.masteryThreshold}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  masteryThreshold: e.target.value,
                }))
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none focus:border-teal-300/50"
              placeholder="75"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.isLocked}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    isLocked: e.target.checked,
                  }))
                }
              />
              Modul dikunci
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-slate-300">Deskripsi</label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={4}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none focus:border-teal-300/50"
              placeholder="Tuliskan deskripsi singkat modul..."
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
            className="inline-flex items-center gap-2 rounded-2xl bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-300 disabled:opacity-60"
          >
            <Plus size={16} />
            {submitting
              ? "Menyimpan..."
              : editingModuleId
                ? "Simpan Perubahan"
                : "Tambah Modul"}
          </button>

          {editingModuleId ? (
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
        {modules.length === 0 ? (
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 text-slate-400">
            Belum ada modul pada course ini.
          </div>
        ) : (
          modules.map((courseModule) => (
            <div
              key={courseModule.id}
              className="rounded-[24px] border border-white/10 bg-white/5 p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                      Urutan {courseModule.order}
                    </span>
                    <span className="rounded-full bg-teal-400/10 px-3 py-1 text-xs text-teal-300">
                      {courseModule.status}
                    </span>
                    {courseModule.isLocked ? (
                      <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-300">
                        Locked
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-3 text-xl font-semibold text-white">
                    {courseModule.title}
                  </h3>

                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
                    {courseModule.description ?? "Belum ada deskripsi modul."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                    <span className="rounded-full bg-white/5 px-3 py-1">
                      {courseModule._count?.units ?? 0} unit
                    </span>
                    <span className="rounded-full bg-white/5 px-3 py-1">
                      {courseModule._count?.resources ?? 0} resource
                    </span>
                    <span className="rounded-full bg-white/5 px-3 py-1">
                      {courseModule.estimatedMinutes ?? "-"} menit
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/lecturer/courses/${course.slug}/modules/${courseModule.id}/resources`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-2.5 text-sm text-cyan-200 transition hover:bg-cyan-400/20"
                  >
                    <FileText size={15} />
                    Resource
                  </Link>

                  <button
                    type="button"
                    onClick={() => startEdit(courseModule)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white transition hover:bg-white/10"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(courseModule.id)}
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