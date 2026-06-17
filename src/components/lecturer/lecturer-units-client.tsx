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

const unitTypeLabels: Record<UnitType, string> = {
  LESSON: "Materi",
  VIDEO: "Video",
  QUIZ: "Kuis",
  DISCUSSION: "Diskusi",
  REFLECTION: "Refleksi",
  ASSIGNMENT: "Tugas",
  PROJECT_STEP: "Langkah Proyek",
  REMEDIAL: "Perbaikan",
};

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
        throw new Error(json.message || "Gagal mengambil bagian");
      }

      setCourse(json.data.course);
      setModuleMeta(json.data.module);
      setUnits(json.data.units);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
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
        throw new Error(json.message || "Gagal menyimpan bagian");
      }

      setMessage(
        isEditing ? "Bagian berhasil diperbarui." : "Bagian berhasil dibuat.",
      );

      resetForm();
      await fetchUnits();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(unit: UnitItem) {
    const confirmed = window.confirm(
      `Hapus bagian "${unit.title}"? Progres mahasiswa pada bagian ini dapat ikut terhapus.`,
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
        throw new Error(json.message || "Gagal menghapus bagian");
      }

      setMessage("Bagian berhasil dihapus.");
      await fetchUnits();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
          Memuat bagian...
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-base text-rose-700">
          Terjadi kesalahan: {error}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <Link
              href={`/lecturer/courses/${courseSlug}/modules`}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/25"
            >
              <ArrowLeft size={16} aria-hidden />
              Kembali ke Modul
            </Link>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white">
              <Layers3 size={16} aria-hidden />
              Pengelolaan Bagian Modul
            </div>

            <h1 className="mt-5 break-words text-3xl font-bold sm:text-4xl">
              Kelola Bagian
            </h1>

            <p className="mt-3 max-w-3xl text-base leading-7 text-teal-50">
              Susun materi modul menjadi bagian-bagian kecil yang dikerjakan
              mahasiswa secara bertahap. Setiap bagian bisa berupa materi,
              video, kuis, diskusi, refleksi, tugas, langkah proyek, atau
              perbaikan.
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 p-5">
            <div className="text-sm text-teal-50">Mata Kuliah</div>
            <div className="mt-1 font-semibold text-white">
              {course?.title ?? "Mata Kuliah"}
            </div>

            <div className="mt-3 text-sm text-teal-50">Modul</div>
            <div className="mt-1 font-semibold text-white">
              {moduleMeta?.title ?? "Modul"}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-6">
        <SummaryCard
          icon={Layers3}
          label="Total Bagian"
          value={summary.total}
        />
        <SummaryCard icon={BookOpen} label="Materi" value={summary.lesson} />
        <SummaryCard icon={Video} label="Video" value={summary.video} />
        <SummaryCard icon={ClipboardCheck} label="Kuis" value={summary.quiz} />
        <SummaryCard icon={Lock} label="Terkunci" value={summary.locked} />
        <SummaryCard
          icon={CheckCircle2}
          label="Wajib"
          value={summary.required}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.5fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              {editingUnit ? "Ubah Bagian" : "Tambah Bagian Baru"}
            </h2>
            <p className="mt-1 text-base text-slate-600">
              Bagian adalah materi kecil yang diselesaikan mahasiswa secara
              bertahap.
            </p>
          </div>

          {message ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base text-emerald-700">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="grid gap-4">
            <FormField
              label="Judul Bagian"
              value={form.title}
              onChange={updateTitle}
              placeholder="Contoh: Menelaah Paradigma Baru PPKn"
            />

            <FormField
              label="Urutan"
              type="number"
              value={form.order}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, order: value }))
              }
              placeholder="Otomatis jika kosong"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Tipe Bagian
                </label>

                <select
                  value={form.unitType}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      unitType: event.target.value as UnitType,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                >
                  {unitTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {unitTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </div>

              <FormField
                label="Perkiraan Waktu (menit)"
                type="number"
                value={form.estimatedMinutes}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, estimatedMinutes: value }))
                }
                placeholder="Contoh: 15"
              />
            </div>

            <FormField
              label="Nilai minimal lulus (%)"
              type="number"
              value={form.masteryThreshold}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, masteryThreshold: value }))
              }
              placeholder="75"
            />

            <div>
              <label className="text-sm font-medium text-slate-700">
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
                placeholder="Tuliskan deskripsi singkat bagian..."
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Isi Bagian
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
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                checked={form.isRequired}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isRequired: event.target.checked,
                  }))
                }
                className="mt-1 h-5 w-5 accent-teal-600"
              />

              <span>
                <span className="block text-base font-medium text-slate-900">
                  Bagian wajib
                </span>
                <span className="mt-1 block text-base leading-6 text-slate-600">
                  Jika aktif, bagian ini dihitung sebagai bagian wajib dari
                  progres modul.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                checked={form.isLocked}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isLocked: event.target.checked,
                  }))
                }
                className="mt-1 h-5 w-5 accent-teal-600"
              />

              <span>
                <span className="block text-base font-medium text-slate-900">
                  Kunci bagian
                </span>
                <span className="mt-1 block text-base leading-6 text-slate-600">
                  Jika aktif, bagian ditandai terkunci sampai syarat
                  pembelajaran terpenuhi.
                </span>
              </span>
            </label>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 size={18} className="animate-spin" aria-hidden />
                ) : (
                  <Plus size={18} aria-hidden />
                )}
                {editingUnit ? "Simpan Bagian" : "Tambah Bagian"}
              </button>

              {editingUnit ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Batal Ubah
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Daftar Bagian
              </h2>
              <p className="mt-1 text-base text-slate-600">
                Cari, saring, ubah, dan hapus bagian dalam modul.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <Search size={18} className="text-slate-400" aria-hidden />
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Cari bagian..."
                  className="w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as "ALL" | UnitType)
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="ALL">Semua Tipe</option>
                {unitTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {unitTypeLabels[type]}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={fetchUnits}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCcw size={18} aria-hidden />
                Muat ulang
              </button>
            </div>
          </div>

          {filteredUnits.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-base text-slate-600">
              Belum ada bagian sesuai filter.
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
    </div>
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <TypeBadge type={unit.unitType} />
            <LockBadge isLocked={unit.isLocked} />

            {unit.isRequired ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Wajib
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Pilihan
              </span>
            )}

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Urutan {unit.order}
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Nilai minimal lulus {unit.masteryThreshold}%
            </span>
          </div>

          <h3 className="mt-4 break-words text-xl font-bold text-slate-900">
            {unit.title}
          </h3>

          <p className="mt-3 break-words text-base leading-7 text-slate-600">
            {unit.description ?? "Belum ada deskripsi bagian."}
          </p>

          {unit.content ? (
            <div className="mt-4 line-clamp-4 rounded-2xl border border-slate-200 bg-white p-4 text-base leading-7 text-slate-600">
              {unit.content}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MiniInfo
              label="Perkiraan waktu"
              value={
                unit.estimatedMinutes
                  ? `${unit.estimatedMinutes} menit`
                  : "Belum diatur"
              }
            />
            <MiniInfo
              label="Mahasiswa mengerjakan"
              value={`${unit._count.progresses}`}
            />
            <MiniInfo label="Tipe" value={unitTypeLabels[unit.unitType]} />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-base font-medium text-slate-700 transition hover:bg-white"
          >
            <Pencil size={16} aria-hidden />
            Ubah
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-2.5 text-base font-medium text-rose-600 transition hover:bg-rose-50"
          >
            <Trash2 size={16} aria-hidden />
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
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-600">{label}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
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
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
      />
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-base font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function TypeBadge({ type }: { type: UnitType }) {
  const className =
    type === "LESSON"
      ? "bg-teal-100 text-teal-700"
      : type === "VIDEO"
        ? "bg-violet-100 text-violet-700"
        : type === "QUIZ"
          ? "bg-amber-100 text-amber-700"
          : type === "DISCUSSION"
            ? "bg-sky-100 text-sky-700"
            : type === "REFLECTION"
              ? "bg-emerald-100 text-emerald-700"
              : type === "ASSIGNMENT"
                ? "bg-pink-100 text-pink-700"
                : type === "PROJECT_STEP"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-orange-100 text-orange-700";

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
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      <Icon size={13} aria-hidden />
      {unitTypeLabels[type]}
    </span>
  );
}

function LockBadge({ isLocked }: { isLocked: boolean }) {
  return isLocked ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
      <Lock size={13} aria-hidden />
      Terkunci
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
      <Unlock size={13} aria-hidden />
      Terbuka
    </span>
  );
}
