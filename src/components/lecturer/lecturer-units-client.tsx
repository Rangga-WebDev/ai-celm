/** @format */
"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Layers3,
  Loader2,
  Lock,
  MessageSquareMore,
  Pencil,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  Trash2,
  Unlock,
  Video,
} from "lucide-react";

type UnitType =
  | "LESSON"
  | "VIDEO"
  | "QUIZ"
  | "DISCUSSION"
  | "REFLECTION"
  | "ASSIGNMENT"
  | "PROJECT_STEP"
  | "REMEDIAL";

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
};

type ModuleMeta = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  order: number;
  status: string;
  isLocked: boolean;
  estimatedMinutes: number | null;
  masteryThreshold: number;
};

type UnitItem = {
  id: string;
  moduleId: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  order: number;
  estimatedMinutes: number | null;
  unitType: UnitType;
  isRequired: boolean;
  isLocked: boolean;
  masteryThreshold: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    progresses: number;
  };
};

type ApiResponse = {
  success: boolean;
  message: string;
  data: {
    course: Course;
    module: ModuleMeta;
    units: UnitItem[];
  };
};

type FormState = {
  title: string;
  slug: string;
  description: string;
  content: string;
  order: string;
  estimatedMinutes: string;
  unitType: UnitType;
  isRequired: boolean;
  isLocked: boolean;
  masteryThreshold: string;
};

const initialForm: FormState = {
  title: "",
  slug: "",
  description: "",
  content: "",
  order: "",
  estimatedMinutes: "",
  unitType: "LESSON",
  isRequired: true,
  isLocked: false,
  masteryThreshold: "75",
};

const unitTypeOptions: UnitType[] = [
  "LESSON",
  "VIDEO",
  "QUIZ",
  "DISCUSSION",
  "REFLECTION",
  "ASSIGNMENT",
  "PROJECT_STEP",
  "REMEDIAL",
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function LecturerUnitsClient({
  user,
  courseSlug,
  moduleId,
}: {
  user: User;
  courseSlug: string;
  moduleId: string;
}) {
  const [course, setCourse] = useState<Course | null>(null);
  const [moduleMeta, setModuleMeta] = useState<ModuleMeta | null>(null);
  const [units, setUnits] = useState<UnitItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | UnitType>("ALL");

  const [form, setForm] = useState<FormState>(initialForm);
  const [editingUnit, setEditingUnit] = useState<UnitItem | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredUnits = useMemo(() => {
    const keyword = q.trim().toLowerCase();

    return units.filter((unit) => {
      const matchesKeyword =
        !keyword ||
        unit.title.toLowerCase().includes(keyword) ||
        unit.slug.toLowerCase().includes(keyword) ||
        (unit.description ?? "").toLowerCase().includes(keyword) ||
        (unit.content ?? "").toLowerCase().includes(keyword);

      const matchesType = typeFilter === "ALL" || unit.unitType === typeFilter;

      return matchesKeyword && matchesType;
    });
  }, [units, q, typeFilter]);

  const summary = useMemo(() => {
    return {
      total: units.length,
      lesson: units.filter((unit) => unit.unitType === "LESSON").length,
      video: units.filter((unit) => unit.unitType === "VIDEO").length,
      quiz: units.filter((unit) => unit.unitType === "QUIZ").length,
      locked: units.filter((unit) => unit.isLocked).length,
      required: units.filter((unit) => unit.isRequired).length,
    };
  }, [units]);

  async function fetchUnits() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/lecturers/${user.id}/courses/${courseSlug}/modules/${moduleId}/units`,
        {
          cache: "no-store",
        },
      );

      const json = (await res.json()) as ApiResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengambil micro-unit");
      }

      setCourse(json.data.course);
      setModuleMeta(json.data.module);
      setUnits(json.data.units);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUnits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, courseSlug, moduleId]);

  function resetForm() {
    setForm(initialForm);
    setEditingUnit(null);
  }

  function updateTitle(value: string) {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: editingUnit ? prev.slug : slugify(value),
    }));
  }

  function startEdit(unit: UnitItem) {
    setEditingUnit(unit);
    setForm({
      title: unit.title,
      slug: unit.slug,
      description: unit.description ?? "",
      content: unit.content ?? "",
      order: String(unit.order),
      estimatedMinutes: unit.estimatedMinutes
        ? String(unit.estimatedMinutes)
        : "",
      unitType: unit.unitType,
      isRequired: unit.isRequired,
      isLocked: unit.isLocked,
      masteryThreshold: String(unit.masteryThreshold),
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
        content: form.content.trim(),
        order: form.order ? Number(form.order) : undefined,
        estimatedMinutes: form.estimatedMinutes
          ? Number(form.estimatedMinutes)
          : null,
        unitType: form.unitType,
        isRequired: form.isRequired,
        isLocked: form.isLocked,
        masteryThreshold: Number(form.masteryThreshold),
      };

      const isEditing = Boolean(editingUnit);

      const url = isEditing
        ? `/api/lecturers/${user.id}/courses/${courseSlug}/modules/${moduleId}/units/${editingUnit?.id}`
        : `/api/lecturers/${user.id}/courses/${courseSlug}/modules/${moduleId}/units`;

      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan micro-unit");
      }

      setMessage(
        isEditing
          ? "Micro-unit berhasil diperbarui."
          : "Micro-unit berhasil dibuat.",
      );

      resetForm();
      await fetchUnits();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(unit: UnitItem) {
    const confirmed = window.confirm(
      `Hapus micro-unit "${unit.title}"? Progress mahasiswa pada unit ini dapat ikut terhapus.`,
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);
      setMessage(null);
      setError(null);

      const res = await fetch(
        `/api/lecturers/${user.id}/courses/${courseSlug}/modules/${moduleId}/units/${unit.id}`,
        {
          method: "DELETE",
        },
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus micro-unit");
      }

      setMessage("Micro-unit berhasil dihapus.");
      await fetchUnits();
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
          Memuat micro-unit...
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
              href={`/lecturer/courses/${courseSlug}/modules`}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeft size={16} />
              Kembali ke Modul
            </Link>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
              <Layers3 size={16} />
              Lecturer MicroUnit Management
            </div>

            <h1 className="mt-5 break-words text-3xl font-semibold text-white sm:text-4xl">
              Kelola Micro-Unit
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Dosen mengelola unit kecil di dalam modul. Unit dapat berupa
              lesson, video, quiz, discussion, reflection, assignment, project
              step, atau remedial.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-4">
            <div className="text-sm text-slate-400">Course</div>
            <div className="mt-1 font-semibold text-white">
              {course?.title ?? "Course"}
            </div>

            <div className="mt-3 text-sm text-slate-400">Module</div>
            <div className="mt-1 font-semibold text-white">
              {moduleMeta?.title ?? "Module"}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-6">
        <SummaryCard icon={Layers3} label="Total Unit" value={summary.total} />
        <SummaryCard icon={BookOpen} label="Lesson" value={summary.lesson} />
        <SummaryCard icon={Video} label="Video" value={summary.video} />
        <SummaryCard icon={ClipboardCheck} label="Quiz" value={summary.quiz} />
        <SummaryCard icon={Lock} label="Locked" value={summary.locked} />
        <SummaryCard
          icon={CheckCircle2}
          label="Required"
          value={summary.required}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.5fr]">
        <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">
              {editingUnit ? "Edit Micro-Unit" : "Tambah Micro-Unit Baru"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Micro-unit adalah materi kecil yang diselesaikan mahasiswa secara
              bertahap.
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
              label="Judul Micro-Unit"
              value={form.title}
              onChange={updateTitle}
              placeholder="Contoh: Menelaah Paradigma Baru PPKn"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Slug"
                value={form.slug}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, slug: slugify(value) }))
                }
                placeholder="menelaah-paradigma-baru-ppkn"
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
              <div>
                <label className="text-sm font-medium text-slate-300">
                  Tipe Unit
                </label>

                <select
                  value={form.unitType}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      unitType: event.target.value as UnitType,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                >
                  {unitTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <FormField
                label="Estimasi Menit"
                type="number"
                value={form.estimatedMinutes}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, estimatedMinutes: value }))
                }
                placeholder="Contoh: 15"
              />
            </div>

            <FormField
              label="Mastery Threshold"
              type="number"
              value={form.masteryThreshold}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, masteryThreshold: value }))
              }
              placeholder="75"
            />

            <div>
              <label className="text-sm font-medium text-slate-300">
                Deskripsi Singkat
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
                placeholder="Tuliskan deskripsi singkat unit..."
                className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Konten Unit
              </label>

              <textarea
                value={form.content}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    content: event.target.value,
                  }))
                }
                rows={8}
                placeholder="Isi materi, instruksi, pertanyaan refleksi, atau arahan aktivitas..."
                className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
              />
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950 p-4">
              <input
                type="checkbox"
                checked={form.isRequired}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isRequired: event.target.checked,
                  }))
                }
                className="mt-1 h-4 w-4 accent-cyan-400"
              />

              <span>
                <span className="block text-sm font-medium text-white">
                  Unit wajib
                </span>
                <span className="mt-1 block text-sm leading-6 text-slate-400">
                  Jika aktif, unit ini dihitung sebagai bagian wajib dari
                  progress modul.
                </span>
              </span>
            </label>

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
                  Kunci unit
                </span>
                <span className="mt-1 block text-sm leading-6 text-slate-400">
                  Jika aktif, unit ditandai terkunci sampai syarat pembelajaran
                  terpenuhi.
                </span>
              </span>
            </label>

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
                {editingUnit ? "Simpan Unit" : "Tambah Unit"}
              </button>

              {editingUnit ? (
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
              <h2 className="text-lg font-semibold text-white">
                Daftar Micro-Unit
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Cari, filter, edit, dan hapus unit dalam modul.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3">
                <Search size={16} className="text-slate-500" />
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Cari unit..."
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as "ALL" | UnitType)
                }
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="ALL">Semua Tipe</option>
                {unitTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={fetchUnits}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                <RefreshCcw size={16} />
                Refresh
              </button>
            </div>
          </div>

          {filteredUnits.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-sm text-slate-300">
              Belum ada micro-unit sesuai filter.
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredUnits.map((unit) => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  onEdit={() => startEdit(unit)}
                  onDelete={() => handleDelete(unit)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function UnitCard({
  unit,
  onEdit,
  onDelete,
}: {
  unit: UnitItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <TypeBadge type={unit.unitType} />
            <LockBadge isLocked={unit.isLocked} />

            {unit.isRequired ? (
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                Required
              </span>
            ) : (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                Optional
              </span>
            )}

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
              Urutan {unit.order}
            </span>

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
              Mastery {unit.masteryThreshold}%
            </span>
          </div>

          <h3 className="mt-4 break-words text-xl font-semibold text-white">
            {unit.title}
          </h3>

          <div className="mt-1 text-xs text-slate-500">/{unit.slug}</div>

          <p className="mt-3 break-words text-sm leading-7 text-slate-300">
            {unit.description ?? "Belum ada deskripsi unit."}
          </p>

          {unit.content ? (
            <div className="mt-4 line-clamp-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm leading-7 text-slate-400">
              {unit.content}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MiniInfo
              label="Estimasi"
              value={
                unit.estimatedMinutes
                  ? `${unit.estimatedMinutes} menit`
                  : "Belum diatur"
              }
            />
            <MiniInfo
              label="Progress rows"
              value={`${unit._count.progresses}`}
            />
            <MiniInfo label="Tipe" value={unit.unitType} />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
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

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
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

function TypeBadge({ type }: { type: UnitType }) {
  const className =
    type === "LESSON"
      ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
      : type === "VIDEO"
        ? "border-violet-400/20 bg-violet-400/10 text-violet-300"
        : type === "QUIZ"
          ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
          : type === "DISCUSSION"
            ? "border-sky-400/20 bg-sky-400/10 text-sky-300"
            : type === "REFLECTION"
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
              : type === "ASSIGNMENT"
                ? "border-pink-400/20 bg-pink-400/10 text-pink-300"
                : type === "PROJECT_STEP"
                  ? "border-indigo-400/20 bg-indigo-400/10 text-indigo-300"
                  : "border-red-400/20 bg-red-400/10 text-red-300";

  const Icon =
    type === "LESSON"
      ? BookOpen
      : type === "VIDEO"
        ? Video
        : type === "QUIZ"
          ? ClipboardCheck
          : type === "DISCUSSION"
            ? MessageSquareMore
            : type === "REFLECTION"
              ? FileText
              : type === "ASSIGNMENT"
                ? ClipboardCheck
                : type === "PROJECT_STEP"
                  ? Layers3
                  : RotateCcw;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${className}`}
    >
      <Icon size={13} />
      {type}
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
