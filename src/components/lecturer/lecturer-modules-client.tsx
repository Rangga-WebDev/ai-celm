/** @format */
"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Layers3,
  LibraryBig,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
} from "lucide-react";

type ModuleStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

type User = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: string;
};

type Course = {
  id: string;
  title: string;
  slug: string;
  code: string | null;
  description: string | null;
  isPublished: boolean;
  lecturer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  counts: {
    enrollments: number;
    modules: number;
    resources: number;
    threads: number;
    projects: number;
  };
};

type ModuleItem = {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  description: string | null;
  order: number;
  estimatedMinutes: number | null;
  status: ModuleStatus;
  isLocked: boolean;
  unlockRule: string | null;
  masteryThreshold: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    units: number;
    progresses: number;
  };
  units: Array<{
    id: string;
    title: string;
    slug: string;
    unitType: string;
    order: number;
    isLocked: boolean;
    estimatedMinutes: number | null;
  }>;
};

type ApiResponse = {
  success: boolean;
  message: string;
  data: {
    course: Course;
    modules: ModuleItem[];
  };
};

type FormState = {
  title: string;
  slug: string;
  description: string;
  order: string;
  estimatedMinutes: string;
  status: ModuleStatus;
  isLocked: boolean;
  unlockRule: string;
  masteryThreshold: string;
};

const initialForm: FormState = {
  title: "",
  slug: "",
  description: "",
  order: "",
  estimatedMinutes: "",
  status: "DRAFT",
  isLocked: false,
  unlockRule: "",
  masteryThreshold: "75",
};

const moduleStatusOptions: { value: ModuleStatus; label: string }[] = [
  { value: "DRAFT", label: "Draf (belum tampil)" },
  { value: "PUBLISHED", label: "Terbit (tampil ke mahasiswa)" },
  { value: "ARCHIVED", label: "Arsip" },
];

function statusLabel(status: ModuleStatus) {
  switch (status) {
    case "PUBLISHED":
      return "Terbit";
    case "ARCHIVED":
      return "Arsip";
    default:
      return "Draf";
  }
}

function statusBadgeClass(status: ModuleStatus) {
  switch (status) {
    case "PUBLISHED":
      return "bg-emerald-100 text-emerald-700";
    case "ARCHIVED":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function LecturerModulesClient({
  user,
  courseSlug,
}: {
  user: User;
  courseSlug: string;
}) {
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<ModuleItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ModuleStatus>("ALL");

  const [form, setForm] = useState<FormState>(initialForm);
  const [editingModule, setEditingModule] = useState<ModuleItem | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredModules = useMemo(() => {
    const keyword = q.trim().toLowerCase();

    return modules.filter((module) => {
      const matchesKeyword =
        !keyword ||
        module.title.toLowerCase().includes(keyword) ||
        module.slug.toLowerCase().includes(keyword) ||
        (module.description ?? "").toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" || module.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [modules, q, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: modules.length,
      published: modules.filter((module) => module.status === "PUBLISHED")
        .length,
      draft: modules.filter((module) => module.status === "DRAFT").length,
      units: modules.reduce((sum, module) => sum + module._count.units, 0),
    };
  }, [modules]);

  async function fetchModules() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/lecturers/${user.id}/courses/${courseSlug}/modules`,
        {
          cache: "no-store",
        },
      );

      const json = (await res.json()) as ApiResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengambil modul");
      }

      setCourse(json.data.course);
      setModules(json.data.modules);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, courseSlug]);

  function resetForm() {
    setForm(initialForm);
    setEditingModule(null);
  }

  function updateTitle(value: string) {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: editingModule ? prev.slug : slugify(value),
    }));
  }

  function startEdit(module: ModuleItem) {
    setEditingModule(module);
    setForm({
      title: module.title,
      slug: module.slug,
      description: module.description ?? "",
      order: String(module.order),
      estimatedMinutes: module.estimatedMinutes
        ? String(module.estimatedMinutes)
        : "",
      status: module.status,
      isLocked: module.isLocked,
      unlockRule: module.unlockRule ?? "",
      masteryThreshold: String(module.masteryThreshold),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setMessage(null);
      setError(null);

      const payload = {
        title: form.title.trim(),
        slug: (form.slug || slugify(form.title)).trim(),
        description: form.description.trim(),
        order: form.order ? Number(form.order) : undefined,
        estimatedMinutes: form.estimatedMinutes
          ? Number(form.estimatedMinutes)
          : null,
        status: form.status,
        isLocked: form.isLocked,
        unlockRule: form.unlockRule.trim(),
        masteryThreshold: Number(form.masteryThreshold),
      };

      const isEditing = Boolean(editingModule);

      const url = isEditing
        ? `/api/lecturers/${user.id}/courses/${courseSlug}/modules/${editingModule?.id}`
        : `/api/lecturers/${user.id}/courses/${courseSlug}/modules`;

      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan modul");
      }

      setMessage(
        isEditing ? "Modul berhasil diperbarui." : "Modul berhasil dibuat.",
      );
      resetForm();
      await fetchModules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(module: ModuleItem) {
    const confirmed = window.confirm(
      `Hapus modul "${module.title}"? Semua bagian dan progres terkait dapat ikut terhapus.`,
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);
      setMessage(null);
      setError(null);

      const res = await fetch(
        `/api/lecturers/${user.id}/courses/${courseSlug}/modules/${module.id}`,
        {
          method: "DELETE",
        },
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus modul");
      }

      setMessage("Modul berhasil dihapus.");
      await fetchModules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
        Memuat modul...
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-base text-rose-700">
        Terjadi kesalahan: {error}
      </div>
    );
  }

  const inputClass =
    "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

  return (
    <div className="space-y-6">
      <Link
        href={`/lecturer/courses/${courseSlug}`}
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
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          {course?.title ?? "Modul Kelas"}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-teal-50">
          Susun modul pembelajaran, lalu buka tiap modul untuk menambahkan
          bagian materinya.
        </p>
      </section>

      {/* Ringkasan */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard
          icon={LibraryBig}
          label="Total Modul"
          value={summary.total}
        />
        <SummaryCard label="Terbit" value={summary.published} />
        <SummaryCard label="Draf" value={summary.draft} />
        <SummaryCard
          icon={Layers3}
          label="Total Bagian"
          value={summary.units}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        {/* Form */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900">
            {editingModule ? "Ubah Modul" : "Tambah Modul Baru"}
          </h2>
          <p className="mt-1 text-base text-slate-600">
            Modul adalah tahap besar pembelajaran. Isi bagian kecil dilakukan di
            tiap modul.
          </p>

          {message ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base text-emerald-700">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Judul Modul
              </label>
              <input
                value={form.title}
                onChange={(event) => updateTitle(event.target.value)}
                placeholder="Contoh: Pancasila sebagai Dasar Negara"
                className={inputClass}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Urutan tampil
                </label>
                <input
                  type="number"
                  value={form.order}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, order: event.target.value }))
                  }
                  placeholder="Otomatis jika kosong"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Perkiraan waktu (menit)
                </label>
                <input
                  type="number"
                  value={form.estimatedMinutes}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      estimatedMinutes: event.target.value,
                    }))
                  }
                  placeholder="Contoh: 60"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Nilai minimal lulus (%)
                </label>
                <input
                  type="number"
                  value={form.masteryThreshold}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      masteryThreshold: event.target.value,
                    }))
                  }
                  placeholder="75"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Status tampil
                </label>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      status: event.target.value as ModuleStatus,
                    }))
                  }
                  className={inputClass}
                >
                  {moduleStatusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Deskripsi singkat
              </label>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                rows={4}
                placeholder="Tuliskan gambaran singkat modul..."
                className={`${inputClass} resize-none leading-6`}
              />
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-700">
              <input
                type="checkbox"
                checked={form.isLocked}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isLocked: event.target.checked,
                  }))
                }
                className="h-5 w-5 accent-teal-600"
              />
              Kunci modul (mahasiswa belum bisa membuka)
            </label>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Plus size={18} aria-hidden="true" />
                )}
                {editingModule ? "Simpan Perubahan" : "Tambah Modul"}
              </button>

              {editingModule ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Batal
                </button>
              ) : null}
            </div>
          </form>
        </div>

        {/* Daftar */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-slate-900">Daftar Modul</h2>
            <button
              type="button"
              onClick={fetchModules}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCcw size={16} aria-hidden="true" />
              Muat ulang
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Search size={18} className="text-slate-400" aria-hidden="true" />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Cari modul..."
                aria-label="Cari modul"
                className="w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "ALL" | ModuleStatus)
              }
              aria-label="Saring status"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700 outline-none"
            >
              <option value="ALL">Semua Status</option>
              {moduleStatusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {statusLabel(status.value)}
                </option>
              ))}
            </select>
          </div>

          {filteredModules.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-base text-slate-600">
              Belum ada modul yang sesuai.
            </div>
          ) : (
            <div className="mt-4 grid gap-4">
              {filteredModules.map((module) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  courseSlug={courseSlug}
                  onEdit={() => startEdit(module)}
                  onDelete={() => handleDelete(module)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ModuleCard({
  module,
  courseSlug,
  onEdit,
  onDelete,
}: {
  module: ModuleItem;
  courseSlug: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                module.status,
              )}`}
            >
              {statusLabel(module.status)}
            </span>
            {module.isLocked ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                <Lock size={12} aria-hidden="true" />
                Terkunci
              </span>
            ) : null}
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              Urutan {module.order}
            </span>
          </div>

          <h3 className="mt-3 text-lg font-bold text-slate-900">
            {module.title}
          </h3>

          <p className="mt-1.5 text-base leading-7 text-slate-600">
            {module.description ?? "Belum ada deskripsi modul."}
          </p>

          <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {module._count.units} bagian
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {module.estimatedMinutes
                ? `${module.estimatedMinutes} menit`
                : "Waktu belum diatur"}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={`/lecturer/courses/${courseSlug}/modules/${module.id}/units`}
            className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-2.5 text-base font-semibold text-white transition hover:bg-teal-700"
          >
            <Layers3 size={16} aria-hidden="true" />
            Bagian
          </Link>

          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <Pencil size={16} aria-hidden="true" />
            Ubah
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-base font-medium text-rose-600 transition hover:bg-rose-50"
          >
            <Trash2 size={16} aria-hidden="true" />
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        {Icon ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
            <Icon size={22} aria-hidden={true} />
          </div>
        ) : null}
        <div>
          <div className="text-2xl font-bold text-slate-900">{value}</div>
          <div className="text-sm text-slate-500">{label}</div>
        </div>
      </div>
    </div>
  );
}
