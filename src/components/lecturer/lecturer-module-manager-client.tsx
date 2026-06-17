/** @format */

"use client";

/** @format */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  LibraryBig,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

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

const statusOptions = [
  { value: "DRAFT", label: "Draf (belum tampil)" },
  { value: "PUBLISHED", label: "Terbit (tampil ke mahasiswa)" },
  { value: "ARCHIVED", label: "Arsip" },
] as const;

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
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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
      "Yakin ingin menghapus modul ini? Semua bagian dan bahan belajar di dalamnya juga dapat terhapus.",
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

  const inputClass =
    "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";
  const labelClass = "text-sm font-medium text-slate-700";

  return (
    <div className="space-y-6">
      <Link
        href={`/lecturer/courses/${course.slug}`}
        className="inline-flex items-center gap-2 text-base font-medium text-teal-700 hover:text-teal-800"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Kembali ke Kelas
      </Link>

      {/* Header */}
      <section className="overflow-hidden rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium">
          <LibraryBig size={16} aria-hidden="true" />
          Kelola Modul
        </div>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">{course.title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-teal-50">
          Tambah, ubah, terbitkan, atau hapus modul pembelajaran pada kelas ini.
        </p>
      </section>

      {/* Form */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-900">
          {editingModuleId ? "Ubah Modul" : "Tambah Modul Baru"}
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelClass}>Judul Modul</label>
            <input
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              className={inputClass}
              placeholder="Contoh: Pancasila sebagai Dasar Negara"
            />
          </div>

          <div>
            <label className={labelClass}>Urutan tampil</label>
            <input
              type="number"
              value={form.order}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, order: e.target.value }))
              }
              className={inputClass}
              placeholder="Otomatis jika dikosongkan"
            />
          </div>

          <div>
            <label className={labelClass}>Perkiraan waktu (menit)</label>
            <input
              type="number"
              value={form.estimatedMinutes}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  estimatedMinutes: e.target.value,
                }))
              }
              className={inputClass}
              placeholder="Contoh: 45"
            />
          </div>

          <div>
            <label className={labelClass}>Status tampil</label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, status: e.target.value }))
              }
              className={inputClass}
            >
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Nilai minimal lulus (%)</label>
            <input
              type="number"
              value={form.masteryThreshold}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  masteryThreshold: e.target.value,
                }))
              }
              className={inputClass}
              placeholder="75"
            />
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-700">
              <input
                type="checkbox"
                checked={form.isLocked}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    isLocked: e.target.checked,
                  }))
                }
                className="h-5 w-5 accent-teal-600"
              />
              Kunci modul (mahasiswa belum bisa membuka)
            </label>
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Deskripsi singkat</label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={4}
              className={inputClass}
              placeholder="Tuliskan gambaran singkat isi modul..."
            />
          </div>
        </div>

        {message ? (
          <div className="mt-5 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-base text-teal-800">
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
            <Plus size={18} aria-hidden="true" />
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
              className="rounded-2xl border border-slate-200 px-5 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Batal
            </button>
          ) : null}
        </div>
      </section>

      {/* Daftar modul */}
      <section className="grid gap-4">
        <h2 className="text-xl font-bold text-slate-900">Daftar Modul</h2>
        {modules.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
            Belum ada modul pada kelas ini.
          </div>
        ) : (
          modules.map((courseModule) => (
            <div
              key={courseModule.id}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      Urutan {courseModule.order}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(
                        courseModule.status,
                      )}`}
                    >
                      {statusLabel(courseModule.status)}
                    </span>
                    {courseModule.isLocked ? (
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                        Terkunci
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-3 text-lg font-bold text-slate-900">
                    {courseModule.title}
                  </h3>

                  <p className="mt-1.5 max-w-2xl text-base leading-7 text-slate-600">
                    {courseModule.description ?? "Belum ada deskripsi modul."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-600">
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      {courseModule._count?.units ?? 0} bagian
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      {courseModule._count?.resources ?? 0} bahan
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      {courseModule.estimatedMinutes ?? "-"} menit
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/lecturer/courses/${course.slug}/modules/${courseModule.id}/resources`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-base font-medium text-teal-700 transition hover:bg-teal-50"
                  >
                    <FileText size={16} aria-hidden="true" />
                    Bahan
                  </Link>

                  <button
                    type="button"
                    onClick={() => startEdit(courseModule)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Pencil size={16} aria-hidden="true" />
                    Ubah
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(courseModule.id)}
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
