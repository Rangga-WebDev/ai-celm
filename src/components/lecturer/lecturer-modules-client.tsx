/** @format */
"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  Layers3,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Unlock,
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

const moduleStatusOptions: ModuleStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

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
      archived: modules.filter((module) => module.status === "ARCHIVED").length,
      locked: modules.filter((module) => module.isLocked).length,
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
        throw new Error(json.message || "Gagal mengambil modul course");
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
        slug: form.slug.trim(),
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
      `Hapus modul "${module.title}"? Semua micro-unit dan progress yang terkait dapat ikut terhapus.`,
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
      <main className="space-y-6 p-6">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-slate-300">
          Memuat modul course...
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="space-y-6 p-6">
        <section className="rounded-[28px] border border-red-400/20 bg-red-500/5 p-6 text-red-300">
          Error: {error}
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <section className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <Link
              href={`/lecturer/courses/${courseSlug}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeft size={16} />
              Kembali ke Detail Course
            </Link>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/10 px-4 py-2 text-sm text-teal-200">
              <Layers3 size={16} />
              Lecturer Module Management
            </div>

            <h1 className="mt-5 break-words text-3xl font-semibold text-white sm:text-4xl">
              Kelola Modul
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Dosen mengelola struktur modul pada course ini. Micro-unit,
              resource, CER, forum, dan project akan dikelola pada tahap
              berikutnya.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-4">
            <div className="text-sm text-slate-400">Course</div>
            <div className="mt-1 font-semibold text-white">
              {course?.title ?? "Course"}
            </div>
            <div className="mt-1 text-sm text-slate-400">
              {course?.code ?? "Tanpa kode"} · /{course?.slug}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-6">
        <SummaryCard
          icon={BookOpen}
          label="Total Modul"
          value={summary.total}
        />
        <SummaryCard icon={Eye} label="Published" value={summary.published} />
        <SummaryCard icon={EyeOff} label="Draft" value={summary.draft} />
        <SummaryCard
          icon={CheckCircle2}
          label="Archived"
          value={summary.archived}
        />
        <SummaryCard icon={Lock} label="Locked" value={summary.locked} />
        <SummaryCard icon={Layers3} label="Total Unit" value={summary.units} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.5fr]">
        <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">
              {editingModule ? "Edit Modul" : "Tambah Modul Baru"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Modul adalah tahap besar pembelajaran. Isi unit kecil akan dibuat
              pada Tahap 4C.
            </p>
          </div>

          {message ? (
            <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="grid gap-4">
            <FormField
              label="Judul Modul"
              value={form.title}
              onChange={updateTitle}
              placeholder="Contoh: Paradigma Baru PKn dan Teori Belajar"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Slug"
                value={form.slug}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, slug: slugify(value) }))
                }
                placeholder="paradigma-baru-pkn"
              />

              <FormField
                label="Urutan"
                type="number"
                value={form.order}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, order: value }))
                }
                placeholder="Auto jika kosong"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Estimasi Menit"
                type="number"
                value={form.estimatedMinutes}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, estimatedMinutes: value }))
                }
                placeholder="Contoh: 60"
              />

              <FormField
                label="Mastery Threshold"
                type="number"
                value={form.masteryThreshold}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, masteryThreshold: value }))
                }
                placeholder="75"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Status Modul
              </label>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    status: event.target.value as ModuleStatus,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
              >
                {moduleStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Deskripsi Modul
              </label>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                rows={5}
                placeholder="Tuliskan deskripsi singkat modul..."
                className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
              />
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950 p-4">
              <input
                type="checkbox"
                checked={form.isLocked}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isLocked: event.target.checked,
                  }))
                }
                className="mt-1 h-4 w-4 accent-cyan-400"
              />
              <span>
                <span className="block text-sm font-medium text-white">
                  Kunci modul
                </span>
                <span className="mt-1 block text-sm leading-6 text-slate-400">
                  Jika aktif, modul dapat ditandai terkunci sampai syarat
                  tertentu terpenuhi.
                </span>
              </span>
            </label>

            <FormField
              label="Unlock Rule Opsional"
              value={form.unlockRule}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, unlockRule: value }))
              }
              placeholder="Contoh: Selesaikan modul sebelumnya"
            />

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                {editingModule ? "Simpan Modul" : "Tambah Modul"}
              </button>

              {editingModule ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Batal Edit
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Daftar Modul</h2>
              <p className="mt-1 text-sm text-slate-400">
                Cari, filter, edit, dan hapus modul course.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3">
                <Search size={16} className="text-slate-500" />
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Cari modul..."
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "ALL" | ModuleStatus)
                }
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="ALL">Semua Status</option>
                {moduleStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={fetchModules}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                <RefreshCcw size={16} />
                Refresh
              </button>
            </div>
          </div>

          {filteredModules.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-sm text-slate-300">
              Belum ada modul sesuai filter.
            </div>
          ) : (
            <div className="grid gap-4">
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
    </main>
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
    <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={module.status} />
            <LockBadge isLocked={module.isLocked} />
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
              Urutan {module.order}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
              Mastery {module.masteryThreshold}%
            </span>
          </div>

          <h3 className="mt-4 break-words text-xl font-semibold text-white">
            {module.title}
          </h3>

          <div className="mt-1 text-xs text-slate-500">/{module.slug}</div>

          <p className="mt-3 break-words text-sm leading-7 text-slate-300">
            {module.description ?? "Belum ada deskripsi modul."}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MiniInfo label="Micro-unit" value={`${module._count.units}`} />
            <MiniInfo
              label="Progress rows"
              value={`${module._count.progresses}`}
            />
            <MiniInfo
              label="Estimasi"
              value={
                module.estimatedMinutes
                  ? `${module.estimatedMinutes} menit`
                  : "Belum diatur"
              }
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={`/lecturer/courses/${courseSlug}/modules/${module.id}/units`}
            className="inline-flex items-center gap-2 rounded-2xl border border-teal-400/20 bg-teal-400/10 px-4 py-2 text-sm text-teal-200 transition hover:bg-teal-400/15"
          >
            <Layers3 size={15} />
            Unit
          </Link>

          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
          >
            <Pencil size={15} />
            Edit
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-400/15"
          >
            <Trash2 size={15} />
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
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-400">{label}</div>
          <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-400/10 text-teal-300">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
      />
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: ModuleStatus }) {
  const className =
    status === "PUBLISHED"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : status === "ARCHIVED"
        ? "border-red-400/20 bg-red-400/10 text-red-300"
        : "border-amber-400/20 bg-amber-400/10 text-amber-300";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${className}`}
    >
      {status}
    </span>
  );
}

function LockBadge({ isLocked }: { isLocked: boolean }) {
  return isLocked ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs font-medium text-red-300">
      <Lock size={13} />
      Locked
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
      <Unlock size={13} />
      Open
    </span>
  );
}
